import { execSync } from "node:child_process";

const gitlog = execSync("git tag --sort=-version:refname", {
  encoding: "utf-8",
});

const topTag = gitlog.trim().split("\n")[1];

console.log(topTag);
