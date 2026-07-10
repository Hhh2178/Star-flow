import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const creatorDirectory = join(process.cwd(), "dist", "creator");
const adminDirectory = join(process.cwd(), "dist", "admin");
const creatorIndexPath = join(creatorDirectory, "index.html");
const adminIndexPath = join(adminDirectory, "index.html");

const adminConsoleMarker = "StarsFlowAdminConsole";
const creatorForbiddenMarkers = [
  [adminConsoleMarker, "Admin Console 唯一标记"],
  ["/api/admin/auth/session", "Admin 会话接口"],
  ["StarsFlowAdminPageModule", "Admin 页面模块标记"],
];

async function readRequiredFile(filePath, label, errors) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      errors.push(`${label}不存在：${filePath}`);
      return null;
    }
    throw error;
  }
}

async function readBuildFiles(directory) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile());

  return Promise.all(
    files.map(async (entry) => {
      const filePath = join(entry.parentPath, entry.name);
      return [filePath, await readFile(filePath, "utf8")];
    }),
  );
}

const errors = [];
const [creatorIndex, adminIndex] = await Promise.all([
  readRequiredFile(creatorIndexPath, "Creator 构建入口", errors),
  readRequiredFile(adminIndexPath, "Admin 构建入口", errors),
]);

if (adminIndex !== null && !adminIndex.includes(adminConsoleMarker)) {
  errors.push(`Admin 构建入口缺少唯一标记：${adminConsoleMarker}`);
}

if (creatorIndex !== null) {
  const creatorFiles = await readBuildFiles(creatorDirectory);
  for (const [marker, label] of creatorForbiddenMarkers) {
    const match = creatorFiles.find(([, contents]) => contents.includes(marker));
    if (match) {
      errors.push(`Creator 构建包含${label} ${marker}：${match[0]}`);
    }
  }
}

if (errors.length > 0) {
  console.error("构建边界检查失败：");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("构建边界检查通过：Creator 与 Admin 产物已独立生成。");
}
