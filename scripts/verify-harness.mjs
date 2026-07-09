import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const requiredFiles = [
  "AGENTS.md",
  "README.md",
  "docs/INDEX.md",
  "docs/governance/root-entry-responsibility-matrix.md",
  "docs/governance/documentation-governance-standard.md",
  "docs/governance/engineering-guardrails.md",
  "docs/governance/worktree-and-branch-policy.md",
  "docs/governance/secrets-and-access-policy.md",
  "docs/systems/README.md",
  "docs/systems/harness/README.md",
  "docs/systems/app/README.md",
  "docs/systems/frontend/README.md",
  "docs/systems/admin/README.md",
  "docs/logbooks/daily/2026-07-09.md",
  ".gitmodules",
  ".env.example",
];

function fail(message) {
  console.error(`[harness] ${message}`);
  process.exitCode = 1;
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    fail(`missing required file: ${file}`);
  }
}

const agents = read("AGENTS.md");
for (const text of ["docs/INDEX.md", "main", "dev", "harness:verify:project"]) {
  if (!agents.includes(text)) fail(`AGENTS.md missing anchor: ${text}`);
}

const readme = read("README.md");
for (const text of ["Hhh2178/Starflow", "main", "dev", "harness:verify:project"]) {
  if (!readme.includes(text)) fail(`README.md missing anchor: ${text}`);
}

const gitmodules = read(".gitmodules");
if (!gitmodules.includes("https://github.com/Hhh2178/Starflow.git")) {
  fail(".gitmodules must point app submodule to Hhh2178/Starflow");
}
if (!gitmodules.includes("branch = main")) {
  fail(".gitmodules must track app branch main");
}

let outerBranch = "";
try {
  outerBranch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
} catch (error) {
  fail(`failed to read outer branch: ${error.message}`);
}
if (!["main", "dev"].includes(outerBranch)) {
  fail(`outer repository should be on main or dev, got: ${outerBranch}`);
}

const appPath = path.join(root, "app");
if (!fs.existsSync(appPath)) {
  fail("app submodule path is missing");
} else {
  const appOrigin = execFileSync("git", ["remote", "get-url", "origin"], { cwd: appPath, encoding: "utf8" }).trim();
  const appUpstream = execFileSync("git", ["remote", "get-url", "upstream"], { cwd: appPath, encoding: "utf8" }).trim();
  if (appOrigin !== "https://github.com/Hhh2178/Starflow.git") {
    fail(`app origin mismatch: ${appOrigin}`);
  }
  if (appUpstream !== "https://github.com/HBAI-Ltd/Toonflow-app.git") {
    fail(`app upstream mismatch: ${appUpstream}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("[harness] project verification passed");
