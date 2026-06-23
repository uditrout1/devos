export interface FigmaRef {
  fileId: string
  nodeId?: string
  url: string
}

export function parseFigmaUrl(url: string): FigmaRef | null {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes("figma.com")) return null

    // Matches /file/{fileId}/... and /design/{fileId}/...
    const match = parsed.pathname.match(/^\/(file|design)\/([^/]+)/)
    if (!match) return null

    const fileId = match[2]
    if (!fileId) return null

    const nodeId = parsed.searchParams.get("node-id") ?? undefined

    return { fileId, ...(nodeId !== undefined ? { nodeId } : {}), url }
  } catch {
    return null
  }
}

export function buildFigmaEmbedUrl(ref: FigmaRef): string {
  return `https://www.figma.com/embed?embed_host=loopforge&url=${encodeURIComponent(ref.url)}`
}
