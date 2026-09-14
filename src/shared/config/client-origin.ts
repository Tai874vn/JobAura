export function resolveClientOrigin(
  configuredOrigin: string,
  useSameOriginProxy: boolean,
  runtimeOrigin?: string
) {
  if (!useSameOriginProxy || !runtimeOrigin) return configuredOrigin
  return new URL(runtimeOrigin).origin
}
