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

export const creatorForbiddenMarkers = [
  ["StarsFlowAdminConsole", "Admin Console 唯一标记"],
  ["/api/admin/auth/session", "Admin 会话接口"],
  ["StarsFlowAdminPageModule", "Admin 页面模块标记"],
  ["/setting/vendorConfig/", "Provider 配置接口"],
  ["/api/admin/providers/updateProvider", "Provider 变更接口"],
  ["ProviderProtocolPanel", "Provider 协议编辑模块"],
];

export function assertCreatorArtifactBoundary(files) {
  for (const [marker, label] of creatorForbiddenMarkers) {
    const match = files.find(([, contents]) => contents.includes(marker));
    if (match) throw new Error(`Creator 构建禁止包含 Provider 配置标记：${label} ${marker} (${match[0]})`);
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
