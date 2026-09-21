#!/usr/bin/env node

/**
 * Release Notes Preview
 *
 * Informational only — does NOT create tags, GitHub releases, or touch Jira.
 * Calculates expected version and consolidated notes from:
 *   latest official tag → HEAD (full release-branch history)
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_KEY = process.env.JIRA_PROJECT_KEY || "DRNT2";
const TICKET_REGEX = new RegExp(`${PROJECT_KEY}-\\d+`, "g");
const OUTPUT_FILE = resolve(process.cwd(), "RELEASE_NOTES_PREVIEW.md");
const STATUS = process.env.RELEASE_PREVIEW_STATUS || "QA";

/** Matches .releaserc.json @semantic-release/commit-analyzer releaseRules */
const RELEASE_RULES = {
  feat: "minor",
  fix: "patch",
  perf: "patch",
};

const CONVENTIONAL_HEADER =
  /^(?<type>feat|fix|perf|docs|style|refactor|test|chore|build|ci|revert)(?:\((?<scope>[^)]*)\))?(?<breaking>!)?:\s*(?<subject>.+)$/i;

function run(command) {
  return execSync(command, { encoding: "utf-8" }).trim();
}

function getLatestOfficialTag() {
  try {
    const tags = run("git tag --sort=-version:refname")
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => /^v?\d+\.\d+\.\d+/.test(t));

    return tags[0] || null;
  } catch {
    return null;
  }
}

function normalizeVersion(tag) {
  if (!tag) return "0.0.0";
  return tag.replace(/^v/, "");
}

function formatVersion(version) {
  return `v${normalizeVersion(version)}`;
}

function bumpVersion(current, releaseType) {
  const [major, minor, patch] = normalizeVersion(current)
    .split(".")
    .map((n) => Number.parseInt(n, 10) || 0);

  if (releaseType === "major") {
    return `${major + 1}.0.0`;
  }
  if (releaseType === "minor") {
    return `${major}.${minor + 1}.0`;
  }
  if (releaseType === "patch") {
    return `${major}.${minor}.${patch + 1}`;
  }
  return `${major}.${minor}.${patch}`;
}

function getCommitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  try {
    const raw = run(`git log ${range} --pretty=format:%H%x00%s%x00%b%x01`);
    if (!raw) return [];

    return raw
      .split("\x01")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [hash, subject, body = ""] = entry.split("\x00");
        return { hash, subject: (subject || "").trim(), body: (body || "").trim() };
      })
      .filter((c) => c.subject);
  } catch (err) {
    console.warn("⚠️  Could not read git log:", err.message);
    return [];
  }
}

function hasBreakingChange(subject, body) {
  if (/^[^:!]+(?:\([^)]*\))?!:/.test(subject)) {
    return true;
  }
  return /BREAKING[ -]CHANGE:\s*\S+/i.test(body);
}

function classifyCommit(commit) {
  const match = commit.subject.match(CONVENTIONAL_HEADER);
  if (!match?.groups) {
    return null;
  }

  const type = match.groups.type.toLowerCase();
  const subject = match.groups.subject.trim();
  const breaking = Boolean(match.groups.breaking) || hasBreakingChange(commit.subject, commit.body);

  let releaseType = RELEASE_RULES[type] || null;
  if (breaking) {
    releaseType = "major";
  }

  if (!releaseType && !breaking) {
    return null;
  }

  const tickets = [
    ...new Set(
      `${commit.subject}\n${commit.body}`.match(TICKET_REGEX) || [],
    ),
  ];

  let category = "other";
  if (breaking || type === "feat") category = "features";
  else if (type === "fix") category = "bugFixes";
  else if (type === "perf") category = "performance";

  return {
    type,
    subject,
    tickets,
    releaseType,
    category,
    breaking,
    hash: commit.hash,
  };
}

function pickHighestReleaseType(types) {
  const rank = { major: 3, minor: 2, patch: 1 };
  let best = null;
  for (const t of types) {
    if (!t) continue;
    if (!best || rank[t] > rank[best]) best = t;
  }
  return best;
}

function dedupeEntries(entries) {
  const seenTickets = new Set();
  const seenSubjects = new Set();
  const result = [];

  for (const entry of entries) {
    const ticketKey = entry.tickets[0] || null;
    if (ticketKey) {
      if (seenTickets.has(ticketKey)) continue;
      seenTickets.add(ticketKey);
    } else {
      const subjectKey = entry.subject.toLowerCase();
      if (seenSubjects.has(subjectKey)) continue;
      seenSubjects.add(subjectKey);
    }
    result.push(entry);
  }

  return result;
}

function formatEntry(entry) {
  const ticket = entry.tickets[0];
  const description = entry.subject
    .replace(new RegExp(`^${PROJECT_KEY}-\\d+\\s*[:\\-–]?\\s*`, "i"), "")
    .replace(/^\([^)]+\)\s*/, "")
    .trim();

  const title =
    description.charAt(0).toUpperCase() + description.slice(1) || entry.subject;

  if (ticket) {
    return `- ${ticket} - ${title}`;
  }
  return `- ${title}`;
}

function renderSection(title, entries) {
  if (!entries.length) return "";
  return `## ${title}\n\n${entries.map(formatEntry).join("\n")}\n`;
}

function buildMarkdown({ currentVersion, expectedVersion, status, features, bugFixes, performance, breaking }) {
  const sections = [
    renderSection("Breaking Changes", breaking),
    renderSection("Features", features),
    renderSection("Bug Fixes", bugFixes),
    renderSection("Performance", performance),
  ].filter(Boolean);

  return `# Release Notes

Current Version: ${formatVersion(currentVersion)}
Expected Release Version: ${expectedVersion ? formatVersion(expectedVersion) : "(no releasable changes)"}
Status: ${status}

${sections.length ? sections.join("\n") : "_No releasable conventional commits found since the current version._\n"}`;
}

function main() {
  console.log("\n📝 [Release Notes Preview] Generating preview (informational only)...\n");

  const latestTag = getLatestOfficialTag();
  const currentVersion = latestTag || "v0.0.0";
  console.log(`Current Version (latest tag): ${formatVersion(currentVersion)}`);
  console.log(`Git range: ${latestTag ? `${latestTag}..HEAD` : "HEAD (no tags yet)"}`);

  const commits = getCommitsSince(latestTag).reverse();
  console.log(`Commits in range: ${commits.length}`);

  const classified = commits
    .map(classifyCommit)
    .filter(Boolean)
    // Skip chore(release) noise from prior releases that may appear on branch history
    .filter((c) => !(c.type === "chore" && /^release\b/i.test(c.subject)));

  const releaseType = pickHighestReleaseType(classified.map((c) => c.releaseType));
  const expectedVersion = releaseType
    ? bumpVersion(currentVersion, releaseType)
    : null;

  const features = dedupeEntries(classified.filter((c) => c.category === "features" && !c.breaking));
  const bugFixes = dedupeEntries(classified.filter((c) => c.category === "bugFixes"));
  const performance = dedupeEntries(classified.filter((c) => c.category === "performance"));
  const breaking = dedupeEntries(classified.filter((c) => c.breaking));

  const markdown = buildMarkdown({
    currentVersion,
    expectedVersion,
    status: STATUS,
    features,
    bugFixes,
    performance,
    breaking,
  });

  writeFileSync(OUTPUT_FILE, markdown, "utf-8");

  console.log(`Expected Release Version: ${expectedVersion ? formatVersion(expectedVersion) : "(none)"}`);
  console.log(`Release type: ${releaseType || "none"}`);
  console.log(`Features: ${features.length}, Bug Fixes: ${bugFixes.length}, Performance: ${performance.length}, Breaking: ${breaking.length}`);
  console.log(`\n✅ Wrote ${OUTPUT_FILE}\n`);
  console.log(markdown);
}

main();
