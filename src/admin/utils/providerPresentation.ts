import type { RuntimeProvider } from "../api/adminApi";

const BUILT_IN_LEGACY_PROVIDER_ID = "toonflow";
const UPSTREAM_BRAND_PATTERN = /(?:toon|tool)\s*flow/gi;
const UPSTREAM_BRAND_MATCHER = /(?:toon|tool)\s*flow/i;

export function isBuiltInLegacyProvider(providerId: string): boolean {
  return providerId.trim().toLowerCase() === BUILT_IN_LEGACY_PROVIDER_ID;
}

export function visibleProviderName(provider: Pick<RuntimeProvider, "providerId" | "displayName">): string {
  if (isBuiltInLegacyProvider(provider.providerId)) return "Stars Flow 内置服务";
  return provider.displayName.replace(UPSTREAM_BRAND_PATTERN, "Stars Flow");
}

export function visibleProviderId(providerId: string): string {
  if (isBuiltInLegacyProvider(providerId)) return "built-in";
  return providerId.replace(UPSTREAM_BRAND_PATTERN, "stars-flow");
}

export function visibleAdapterId(adapterId: string): string {
  if (UPSTREAM_BRAND_MATCHER.test(adapterId)) return "built-in-legacy";
  return adapterId;
}
