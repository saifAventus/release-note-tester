#!/usr/bin/env node

/**
 * Jira release integration
 *
 * Modes:
 *   --production  Final release (Semantic Release publishCmd). Creates/updates
 *                 {prefix}{version}, attaches fixVersions, transitions issues,
 *                 marks released=true.
 *   --preview     QA release candidate. Creates {prefix}{version}-rc.N as
 *                 unreleased, with RELEASE_NOTES_PREVIEW.md in the description.
 *                 Does NOT create Git tags or transition tickets to Done.
 *
 * Usage:
 *   node ./scripts/jira-release.js "1.22.1" --production
 *   node ./scripts/jira-release.js "1.22.1" --preview
 *   node ./scripts/jira-release.js "1.22.1"   # defaults to --production
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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
const PREVIEW_NOTES_FILE = resolve(process.cwd(), "RELEASE_NOTES_PREVIEW.md");

function parseArgs(argv) {
  const args = argv.slice(2);
  let version = null;
  let mode = null;

  for (const arg of args) {
    if (arg === "--preview" || arg === "--production") {
      if (mode) {
        throw new Error(`Multiple modes specified. Use only one of --preview or --production.`);
      }
      mode = arg.slice(2);
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(
        `Unknown release mode/flag: ${arg}\n\nSupported modes:\n--preview\n--production`,
      );
    }
    if (!version) {
      version = arg;
      continue;
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  // Backward compatible: no mode → production (Semantic Release publishCmd)
  if (!mode) mode = "production";

  return { version, mode };
}

function requireCredentials() {
  if (!JIRA_EMAIL || !JIRA_TOKEN) {
    throw new Error(
      "Jira credentials are not configured.\nSet JIRA_USER_EMAIL / JIRA_API_TOKEN (or SEMANTIC_RELEASE_JIRA_*).",
    );
  }
}

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

function getPreviousTag(currentVersion) {
  const tags = execSync("git tag --sort=-version:refname", {
    encoding: "utf-8",
  })
    .trim()
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  if (!tags.length) return null;

  const currentTag = currentVersion
    ? currentVersion.startsWith("v")
      ? currentVersion
      : `v${currentVersion}`
    : null;

  if (currentTag && tags[0] === currentTag) {
    return tags[1] || null;
  }

  return tags[0];
}

function getTicketsFromGit(currentVersion) {
  try {
    const previousTag = getPreviousTag(currentVersion);
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

function versionBrowseUrl(versionId) {
  return `${JIRA_URL}/projects/${PROJECT_KEY}/versions/${versionId}/tab/release-report-all-issues`;
}

function readPreviewNotes() {
  if (!existsSync(PREVIEW_NOTES_FILE)) {
    throw new Error(
      "RELEASE_NOTES_PREVIEW.md was not found.\nCannot create Jira preview release.",
    );
  }

  const notes = readFileSync(PREVIEW_NOTES_FILE, "utf-8").trim();
  if (!notes) {
    throw new Error(
      "RELEASE_NOTES_PREVIEW.md is empty.\nCannot create Jira preview release.",
    );
  }

  if (/no releasable conventional commits/i.test(notes)) {
    throw new Error(
      "RELEASE_NOTES_PREVIEW.md has no releasable changes.\nCannot create Jira preview release.",
    );
  }

  return notes;
}

/**
 * Parse "Expected Release Version: v1.22.2" from RELEASE_NOTES_PREVIEW.md.
 * Handles CRLF and optional "v" prefix.
 */
function parseExpectedVersionFromNotes(notes) {
  const match = notes.match(
    /Expected\s+Release\s+Version:\s*v?(\d+\.\d+\.\d+)/i,
  );
  if (!match) {
    throw new Error(
      "Could not parse Expected Release Version from RELEASE_NOTES_PREVIEW.md.\n" +
        "Expected a line like: Expected Release Version: v1.22.2\n\n" +
        `File contents:\n${notes}`,
    );
  }
  return match[1];
}

function buildPreviewDescription(baseVersion, rcName, notes) {
  return [
    "Release Candidate",
    "",
    `Version: ${rcName}`,
    "Status: QA",
    `Base Version: ${VERSION_PREFIX}${baseVersion}`,
    "",
    "Release Notes",
    "",
    notes,
    "",
    "QA Checklist",
    "",
    "- [ ] Functional testing",
    "- [ ] Regression testing",
    "- [ ] Sign-off",
  ].join("\n");
}

/**
 * Find next RC number from existing Jira versions.
 * Matches: {prefix}{base}-rc.N  and also bare {base}-rc.N / v{base}-rc.N
 *
 * Idempotency: each successful preview run creates the NEXT rc.N.
 * If create hits a duplicate-name race, we update that version's description.
 */
function getNextRcNumber(versions, baseVersion) {
  const escapedPrefix = VERSION_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedBase = baseVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`^${escapedPrefix}${escapedBase}-rc\\.(\\d+)$`, "i"),
    new RegExp(`^v?${escapedBase}-rc\\.(\\d+)$`, "i"),
  ];

  let max = 0;
  for (const v of versions) {
    for (const re of patterns) {
      const m = v.name?.match(re);
      if (m) {
        max = Math.max(max, Number.parseInt(m[1], 10) || 0);
      }
    }
  }

  return max + 1;
}

async function runPreview(versionArg) {
  requireCredentials();
  const notes = readPreviewNotes();
  const cleanVersion = (versionArg || parseExpectedVersionFromNotes(notes)).replace(
    /^v/,
    "",
  );

  console.log(`
========================================
JIRA RELEASE
========================================

Mode: preview
Base version: ${cleanVersion}
`);

  console.log(`Reading:\n${PREVIEW_NOTES_FILE}\n`);

  const project = await jiraRequest(`/rest/api/3/project/${PROJECT_KEY}`);
  console.log(`Jira project:\n${PROJECT_KEY} (${project.name})\n`);

  const versions = await jiraRequest(
    `/rest/api/3/project/${PROJECT_KEY}/versions`,
  );
  const rcNumber = getNextRcNumber(versions, cleanVersion);
  const rcName = `${VERSION_PREFIX}${cleanVersion}-rc.${rcNumber}`;

  console.log(`RC version: ${rcName}`);
  console.log(`\nCreating Jira version:\n${rcName}\n`);
  console.log(`Released:\nfalse\n`);

  const description = buildPreviewDescription(cleanVersion, rcName, notes);

  let targetVersion = versions.find((v) => v.name === rcName);

  if (targetVersion) {
    // Idempotent retry: update description on existing RC instead of creating a duplicate
    console.log(
      `ℹ️  Version "${rcName}" already exists (ID: ${targetVersion.id}). Updating description.`,
    );
    targetVersion = await jiraRequest(`/rest/api/3/version/${targetVersion.id}`, {
      method: "PUT",
      body: JSON.stringify({
        description,
        released: false,
        releaseDate: null,
      }),
    });
  } else {
    try {
      targetVersion = await jiraRequest("/rest/api/3/version", {
        method: "POST",
        body: JSON.stringify({
          name: rcName,
          projectId: Number(project.id),
          released: false,
          description,
        }),
      });
    } catch (err) {
      // Race / retry: version created by a concurrent run
      if (/already exists|duplicate|400/i.test(err.message)) {
        const refreshed = await jiraRequest(
          `/rest/api/3/project/${PROJECT_KEY}/versions`,
        );
        targetVersion = refreshed.find((v) => v.name === rcName);
        if (!targetVersion) throw err;
        console.log(
          `ℹ️  Version "${rcName}" appeared during create. Updating description.`,
        );
        targetVersion = await jiraRequest(
          `/rest/api/3/version/${targetVersion.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              description,
              released: false,
              releaseDate: null,
            }),
          },
        );
      } else {
        throw new Error(
          `Failed to create Jira preview version.\n${err.message}\nThe Jira API user may not have permission to create project versions.`,
        );
      }
    }
  }

  const url = versionBrowseUrl(targetVersion.id);

  console.log(`Preview release created successfully.

Jira project: ${PROJECT_KEY}
Version: ${rcName}
Status: Unreleased
URL: ${url}
========================================
`);

  return targetVersion;
}

async function runProduction(cleanVersion) {
  const versionName = `${VERSION_PREFIX}${cleanVersion}`;

  console.log(`
========================================
JIRA RELEASE
========================================

Mode: production
Version: ${versionName}

Creating production Jira release.
`);

  if (!JIRA_EMAIL || !JIRA_TOKEN) {
    console.warn(
      "⚠️  Jira credentials not provided (JIRA_USER_EMAIL / JIRA_API_TOKEN). Skipping Jira release creation.",
    );
    return;
  }

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
    targetVersion = await ensureVersionUnreleased(targetVersion, versionName);
  } else {
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

  const tickets = getTicketsFromGit(cleanVersion);
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
      console.error(`  ❌ Failed processing ticket ${ticketKey}:`, err.message);
    }
  }

  await markVersionReleased(targetVersion, versionName);

  console.log(`
Released:
true

Production release created successfully.
========================================
`);
}

async function run() {
  let version;
  let mode;

  try {
    ({ version, mode } = parseArgs(process.argv));
  } catch (err) {
    console.error(`\n❌ ${err.message}\n`);
    process.exit(1);
  }

  try {
    if (mode === "preview") {
      // Version arg optional for preview — falls back to RELEASE_NOTES_PREVIEW.md
      await runPreview(version);
      return;
    }

    if (!version) {
      console.error(
        "❌ Error: Release version argument is required (e.g. node jira-release.js 1.22.1 --production)",
      );
      process.exit(1);
    }

    const cleanVersion = version.replace(/^v/, "");

    if (mode === "production") {
      await runProduction(cleanVersion);
      return;
    }

    console.error(
      `Unknown release mode: ${mode}\n\nSupported modes:\n--preview\n--production`,
    );
    process.exit(1);
  } catch (err) {
    console.error(`\n❌ [Jira Release] ${err.message}\n`);
    // Preview must fail the CI job so missing notes / API errors are visible.
    // Production keeps soft-fail behaviour so Semantic Release is not blocked by Jira outages.
    if (mode === "preview") {
      process.exit(1);
    }
  }
}

run();
