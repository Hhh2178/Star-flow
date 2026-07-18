export function shouldProbeElectronRuntime(protocol: string, userAgent: string): boolean {
  return protocol === "file:" || /\bElectron\//i.test(userAgent);
}
