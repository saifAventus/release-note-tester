#!/usr/bin/env node

/**
 * Official Jira release integration (runs only from Semantic Release publishCmd).
 *
 * Flow:
 * 1. Create Jira version as UNRELEASED
 * 2. Find tickets from git commits since previous tag
 * 3. Attach fixVersion to each ticket
 * 4. Transition tickets to Released/Done when possible
 * 5. Mark Jira version as released
 *
 * Creating the version as already-released often blocks adding issues in Jira,
 * which is why tickets were missing the new release.
 */

import { execSync } from "node:child_process";

const JIRA_URL = (
  process.env.JIRA_SERVER_URL ||
  process.env.SEMANTIC_RELEASE_JIRA_SERVER_URL ||
  "https://aventusinformatics-team-xa3a5udd.atlassian.net"
).replace(/\/+$/, "");

const JIRA_EMAIL =
  process.env.JIRA_USER_EMAIL ||
  process.env.SEMANTIC_RELEASE_JIRA_USERNAME ||
  process.env.JIRA_EMAIL;

const JIRA_TOKEN =
  process.env.JIRA_API_TOKEN || process.env.SEMANTIC_RELEASE_JIRA_API_TOKEN;

const PROJECT_KEY = process.env.JIRA_PROJECT_KEY || "DRNT2";
const VERSION_PREFIX =
  process.env.JIRA_VERSION_PREFIX || "release-note-tester-v";
const TICKET_REGEX = new RegExp(`${PROJECT_KEY}-\\d+`, "g");

async function jiraRequest(endpoint, options = {}) {
  const url = `${JIRA_URL}${endpoint}`;
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString("base64");

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Jira API error [${response.status} ${response.statusText}] at ${endpoint}: ${errorText}`,
    );
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}

function listVersionTags() {
  try {
    return execSync("git tag --sort=-version:refname", { encoding: "utf-8" })
      .trim()
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => /^v?\d+\.\d+\.\d+/.test(t));
  } catch {
    return [];
  }
}

/**
 * Resolve the previous official tag to build the commit range.
 * Prefer the value passed by Semantic Release (${lastRelease.gitTag}).
 */
function getPreviousTag(currentVersion, lastReleaseTagArg) {
  if (lastReleaseTagArg && lastReleaseTagArg !== "undefined" && lastReleaseTagArg !== "null") {
    const normalized = lastReleaseTagArg.startsWith("v")
      ? lastReleaseTagArg
      : `v${lastReleaseTagArg}`;
    console.log(`Using lastRelease tag from Semantic Release: ${normalized}`);
    return normalized;
  }

  const tags = listVersionTags();
  if (!tags.length) return null;

  const currentTag = currentVersion
    ? currentVersion.startsWith("v")
      ? currentVersion
      : `v${currentVersion}`
    : null;

  // If the newly created release tag is already present, previous is index 1
  if (currentTag && tags[0] === currentTag) {
    console.log(
      `Latest tag is current release ${currentTag}; using previous tag ${tags[1] || "(none)"}`,
    );
    return tags[1] || null;
  }

  // New tag not visible yet — latest tag is the previous release
  console.log(
    `Current release tag not listed yet; using latest tag as previous: ${tags[0]}`,
  );
  return tags[0];
}

function getTicketsFromGit(currentVersion, lastReleaseTagArg) {
  try {
    const previousTag = getPreviousTag(currentVersion, lastReleaseTagArg);
    console.log(`previousTag: ${previousTag || "(none)"}`);
    const range = previousTag ? `${previousTag}..HEAD` : "HEAD~50..HEAD";
    console.log(`git range: ${range}`);

    const gitLog = execSync(`git log ${range} --pretty=format:%B`, {
      encoding: "utf-8",
    });
    const matches = gitLog.match(TICKET_REGEX) || [];
    return [...new Set(matches)];
  } catch (err) {
    console.warn("⚠️  Could not extract tickets from git log:", err.message);
    return [];
  }
}

async function ensureVersionUnreleased(targetVersion, versionName) {
  if (targetVersion.released) {
    console.log(
      `🔓 Re-opening version "${versionName}" so issues can be attached...`,
    );
    await jiraRequest(`/rest/api/3/version/${targetVersion.id}`, {
      method: "PUT",
      body: JSON.stringify({
        released: false,
        releaseDate: null,
      }),
    });
    targetVersion.released = false;
  }
  return targetVersion;
}

async function markVersionReleased(targetVersion, versionName) {
  const today = new Date().toISOString().split("T")[0];
  console.log(`🏷️  Marking version "${versionName}" as released...`);
  const updated = await jiraRequest(`/rest/api/3/version/${targetVersion.id}`, {
    method: "PUT",
    body: JSON.stringify({
      released: true,
      releaseDate: today,
    }),
  });
  console.log(`✅ Version "${versionName}" marked released (${today})`);
  return updated || targetVersion;
}

async function attachFixVersion(ticketKey, targetVersion, versionName) {
  const issue = await jiraRequest(
    `/rest/api/3/issue/${ticketKey}?fields=fixVersions,status`,
  );
  const existingFixVersions = issue.fields?.fixVersions || [];
  const hasVersion = existingFixVersions.some(
    (v) => v.id === targetVersion.id || v.name === versionName,
  );

  if (!hasVersion) {
    console.log(`  ➕ Adding fixVersion "${versionName}" to ${ticketKey}...`);
    await jiraRequest(`/rest/api/3/issue/${ticketKey}`, {
      method: "PUT",
      body: JSON.stringify({
        update: {
          fixVersions: [{ add: { id: targetVersion.id } }],
        },
      }),
    });
    console.log(`  ✅ fixVersion attached to ${ticketKey}`);
  } else {
    console.log(`  ℹ️  ${ticketKey} already has fixVersion "${versionName}"`);
  }

  return issue;
}

async function transitionIssue(ticketKey, issue) {
  const currentStatus = issue.fields?.status?.name;
  if (currentStatus === "Released" || currentStatus === "Done") {
    console.log(`  ℹ️  ${ticketKey} is already in "${currentStatus}" status.`);
    return;
  }

  const { transitions } = await jiraRequest(
    `/rest/api/3/issue/${ticketKey}/transitions`,
  );
  const targetTransition =
    transitions.find((t) => t.to?.name?.toLowerCase() === "released") ||
    transitions.find((t) => t.to?.name?.toLowerCase() === "done");

  if (!targetTransition) {
    console.log(
      `  ⚠️  No transition to "Released" or "Done" for ${ticketKey}. Current: "${currentStatus}"`,
    );
    return;
  }

  console.log(
    `  🚀 Transitioning ${ticketKey} from "${currentStatus}" to "${targetTransition.to.name}"...`,
  );
  await jiraRequest(`/rest/api/3/issue/${ticketKey}/transitions`, {
    method: "POST",
    body: JSON.stringify({
      transition: { id: targetTransition.id },
    }),
  });
  console.log(`  ✅ ${ticketKey} transitioned to "${targetTransition.to.name}"`);
}

async function run() {
  const rawVersion = process.argv[2];
  const lastReleaseTagArg = process.argv[3];

  if (!rawVersion) {
    console.error(
      "❌ Error: Release version argument is required (e.g. node jira-release.js 1.7.0)",
    );
    process.exit(1);
  }

  const cleanVersion = rawVersion.replace(/^v/, "");
  const versionName = `${VERSION_PREFIX}${cleanVersion}`;

  console.log(
    `\n🚀 [Jira Release] Starting automated Jira release for version: ${versionName}`,
  );

  if (!JIRA_EMAIL || !JIRA_TOKEN) {
    console.warn(
      "⚠️  Jira credentials not provided (JIRA_USER_EMAIL / JIRA_API_TOKEN). Skipping Jira release creation.",
    );
    return;
  }

  try {
    console.log(
      `🔍 [Jira Release] Fetching project details for ${PROJECT_KEY}...`,
    );
    const project = await jiraRequest(`/rest/api/3/project/${PROJECT_KEY}`);
    console.log(
      `✅ [Jira Release] Connected to project: ${project.name} (ID: ${project.id})`,
    );

    console.log(
      `🔍 [Jira Release] Checking if version "${versionName}" exists...`,
    );
    const versions = await jiraRequest(
      `/rest/api/3/project/${PROJECT_KEY}/versions`,
    );
    let targetVersion = versions.find((v) => v.name === versionName);

    if (targetVersion) {
      console.log(
        `ℹ️  [Jira Release] Version "${versionName}" already exists (ID: ${targetVersion.id}).`,
      );
      // Ensure it is open before attaching issues
      targetVersion = await ensureVersionUnreleased(targetVersion, versionName);
    } else {
      // IMPORTANT: create UNRELEASED first so issues can be added
      console.log(
        `✨ [Jira Release] Creating new version "${versionName}" (unreleased)...`,
      );
      targetVersion = await jiraRequest("/rest/api/3/version", {
        method: "POST",
        body: JSON.stringify({
          name: versionName,
          projectId: Number(project.id),
          released: false,
          description: `Automated release ${versionName}`,
        }),
      });
      console.log(
        `🎉 [Jira Release] Created Jira Version "${versionName}" (ID: ${targetVersion.id})`,
      );
    }

    const tickets = getTicketsFromGit(cleanVersion, lastReleaseTagArg);
    console.log(
      `📋 [Jira Release] Found ${tickets.length} ticket(s) in release commits: ${tickets.join(", ") || "(none)"}`,
    );

    for (const ticketKey of tickets) {
      try {
        console.log(`\n🔄 [Jira Release] Processing ticket ${ticketKey}...`);
        const issue = await attachFixVersion(
          ticketKey,
          targetVersion,
          versionName,
        );
        await transitionIssue(ticketKey, issue);
      } catch (err) {
        console.error(
          `  ❌ Failed processing ticket ${ticketKey}:`,
          err.message,
        );
      }
    }

    // Mark released AFTER tickets are attached
    await markVersionReleased(targetVersion, versionName);

    console.log(
      `\n🏁 [Jira Release] Release ${versionName} completed successfully!\n`,
    );
  } catch (err) {
    console.error(
      `\n❌ [Jira Release] Error processing Jira release:`,
      err.message,
    );
    // Don't fail the entire CI pipeline if Jira is unreachable, but log clearly
  }
}

run();
