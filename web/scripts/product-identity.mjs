import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourcePatterns = [
  { label: "upstream product name", pattern: /ToonFlow|Toonflow|ToolFlow|Toolflow|トゥーンフロー/g },
  { label: "upstream GitHub URL", pattern: /https?:\/\/github\.com\/HBAI-Ltd\/Toonflow-(?:app|web)/gi },
  { label: "upstream Gitee URL", pattern: /https?:\/\/gitee\.com\/HBAI-Ltd\/Toonflow-(?:app|web)/gi },
  { label: "repository promotion", pattern: /GitHub|Gitee|AtomGit|Star on GitHub|⭐\s*Star/g },
  { label: "open-source promotion", pattern: /open[ -]?source|开源/gi },
];

const distPatterns = [
  ...sourcePatterns.slice(0, 3),
  { label: "repository call to action", pattern: /Star on GitHub|给我们一个\s*⭐|GitHub\s*(?:仓库|Repository)/gi },
  { label: "open-source product copy", pattern: /open[ -]?source AI-driven|开源的AI/gi },
];

async function walk(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

function scanText(file, content, patterns) {
  const findings = [];
  for (const { label, pattern } of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) findings.push(`${file}: ${label}`);
  }
  return findings;
}

function jsonValues(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(jsonValues);
  if (value && typeof value === "object") return Object.values(value).flatMap(jsonValues);
  return [];
}

export async function scanProductIdentity({ root, mode }) {
  if (mode === "source") {
    const sourceRoot = path.join(root, "src");
    const files = (await walk(sourceRoot)).filter((file) => {
      if (/\.(?:test|spec)\.[^.]+$/i.test(file)) return false;
      return /\.(?:vue|json)$/i.test(file);
    });
    files.push(path.join(root, "index.html"));
    const findings = [];
    for (const file of files) {
      const raw = await fs.readFile(file, "utf8");
      const content = file.endsWith(".json") ? jsonValues(JSON.parse(raw)).join("\n") : raw;
      findings.push(...scanText(path.relative(root, file), content, sourcePatterns));
    }
    return findings.sort();
  }

  if (mode === "dist") {
    const findings = [];
    for (const appName of ["creator", "admin"]) {
      const file = path.join(root, "dist", appName, "index.html");
      const content = await fs.readFile(file, "utf8");
      if (!content.includes("Stars Flow")) findings.push(`dist/${appName}/index.html: missing Stars Flow identity`);
      findings.push(...scanText(`dist/${appName}/index.html`, content, distPatterns));
    }
    return findings.sort();
  }

  throw new Error(`Unsupported product identity scan mode: ${mode}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const root = process.cwd();
  const findings = [
    ...await scanProductIdentity({ root, mode: "source" }),
    ...await scanProductIdentity({ root, mode: "dist" }),
  ];
  if (findings.length) {
    console.error(findings.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("产品身份检查通过：Creator 与 Admin 仅展示 Stars Flow 品牌。");
  }
}
