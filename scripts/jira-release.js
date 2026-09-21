#!/usr/bin/env node

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

  // Some endpoints (e.g. 204 No Content for transitions/updates) don't return JSON
  if (response.status === 204) {
    return null;
  }

  return response.json();
}
function getPreviousTag() {
  // publishCmd runs after semantic-release creates the new tag, so
  // index [0] is the just-created release tag and [1] is the prior tag.
  // Using [1] keeps the commit range as previousTag..HEAD for this release.
  const gitlog = execSync("git tag --sort=-version:refname", {
    encoding: "utf-8",
  });

  const topTag = gitlog.trim().split("\n")[1];
  return topTag;
}
function getTicketsFromGit() {
  try {
    const previousTag = getPreviousTag();
    console.log(`previousTag: ${previousTag}`);
    const range = previousTag ? `${previousTag}..HEAD` : "HEAD~50..HEAD";
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

async function run() {
  const rawVersion = process.argv[2];
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
    // 1. Fetch Project Details
    console.log(
      `🔍 [Jira Release] Fetching project details for ${PROJECT_KEY}...`,
    );
    const project = await jiraRequest(`/rest/api/3/project/${PROJECT_KEY}`);
    console.log(
      `✅ [Jira Release] Connected to project: ${project.name} (ID: ${project.id})`,
    );

    // 2. Check or Create Version
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
    } else {
      console.log(`✨ [Jira Release] Creating new version "${versionName}"...`);
      const today = new Date().toISOString().split("T")[0];
      targetVersion = await jiraRequest("/rest/api/3/version", {
        method: "POST",
        body: JSON.stringify({
          name: versionName,
          projectId: Number(project.id),
          released: true,
          releaseDate: today,
          description: `Automated release ${versionName}`,
        }),
      });
      console.log(
        `🎉 [Jira Release] Created Jira Version "${versionName}" (ID: ${targetVersion.id})`,
      );
    }

    // 3. Extract Tickets and Associate with Version
    const tickets = getTicketsFromGit();
    console.log(
      `📋 [Jira Release] Found ${tickets.length} ticket(s) in release commits: ${tickets.join(", ") || "(none)"}`,
    );

    for (const ticketKey of tickets) {
      try {
        console.log(`\n🔄 [Jira Release] Processing ticket ${ticketKey}...`);

        // Get issue details to read existing fixVersions
        const issue = await jiraRequest(
          `/rest/api/3/issue/${ticketKey}?fields=fixVersions,status`,
        );
        const existingFixVersions = issue.fields?.fixVersions || [];

        // Check if version is already attached
        const hasVersion = existingFixVersions.some(
          (v) => v.id === targetVersion.id || v.name === versionName,
        );
        if (!hasVersion) {
          console.log(
            `  ➕ Adding fixVersion "${versionName}" to ${ticketKey}...`,
          );
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
          console.log(
            `  ℹ️  ${ticketKey} already has fixVersion "${versionName}"`,
          );
        }

        // Check and transition status to "Released" (or "Done")
        const currentStatus = issue.fields?.status?.name;
        if (currentStatus !== "Released" && currentStatus !== "Done") {
          const { transitions } = await jiraRequest(
            `/rest/api/3/issue/${ticketKey}/transitions`,
          );
          const targetTransition =
            transitions.find((t) => t.to?.name?.toLowerCase() === "released") ||
            transitions.find((t) => t.to?.name?.toLowerCase() === "done");

          if (targetTransition) {
            console.log(
              `  🚀 Transitioning ${ticketKey} from "${currentStatus}" to "${targetTransition.to.name}"...`,
            );
            await jiraRequest(`/rest/api/3/issue/${ticketKey}/transitions`, {
              method: "POST",
              body: JSON.stringify({
                transition: { id: targetTransition.id },
              }),
            });
            console.log(
              `  ✅ ${ticketKey} transitioned to "${targetTransition.to.name}"`,
            );
          } else {
            console.log(
              `  ⚠️  No valid transition to "Released" or "Done" found for ${ticketKey}. Current status: "${currentStatus}"`,
            );
          }
        } else {
          console.log(
            `  ℹ️  ${ticketKey} is already in "${currentStatus}" status.`,
          );
        }
      } catch (err) {
        console.error(
          `  ❌ Failed processing ticket ${ticketKey}:`,
          err.message,
        );
      }
    }

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
