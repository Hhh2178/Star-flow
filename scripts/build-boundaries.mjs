function normalizeModuleId(moduleId) {
  return moduleId.replaceAll("\\", "/");
}

export function assertCreatorModuleBoundary(moduleIds) {
  for (const moduleId of moduleIds) {
    const normalizedModuleId = normalizeModuleId(moduleId);
    if (normalizedModuleId.includes("/src/admin/")) {
      throw new Error(`Creator 构建禁止包含 Admin 模块：${normalizedModuleId}`);
    }
  }
}

export function creatorModuleBoundaryPlugin() {
  return {
    name: "stars-flow-creator-module-boundary",
    generateBundle(_options, bundle) {
      const moduleIds = [];
      for (const output of Object.values(bundle)) {
        if (output.type === "chunk") moduleIds.push(...Object.keys(output.modules));
      }
      assertCreatorModuleBoundary(moduleIds);
    },
  };
}
