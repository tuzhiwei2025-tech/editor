import type { Edge, Node } from '@xyflow/react'

export type TidyLayoutMode = 'horizontal' | 'vertical'

export type TidyChainOptions = {
  startId: string
  endId: string
  /** 横向：链起点 x；纵向：链中心线 x */
  startX: number
  /** 横向：统一 y；纵向：链起点 y */
  baseY: number
  gapX: number
  mode?: TidyLayoutMode
  /** 纵向排列时间距 */
  gapY?: number
}

function computeChainOrder(edges: Edge[], startId: string, endId: string): string[] {
  const nextBySource = new Map<string, string>()
  for (const e of edges) {
    nextBySource.set(e.source, e.target)
  }
  const chainIds: string[] = []
  let cur = startId
  const seen = new Set<string>()
  while (cur && !seen.has(cur)) {
    seen.add(cur)
    chainIds.push(cur)
    if (cur === endId) break
    cur = nextBySource.get(cur) ?? ''
  }
  return chainIds
}

/** 按边从起点到终点的单链重排坐标（支持横向 / 纵向） */
export function tidyWorkflowChain(nodes: Node[], edges: Edge[], opts: TidyChainOptions): Node[] {
  const chainIds = computeChainOrder(edges, opts.startId, opts.endId)
  const mode = opts.mode ?? 'horizontal'
  const gapY = opts.gapY ?? 128

  return nodes.map((n) => {
    const idx = chainIds.indexOf(n.id)
    if (idx < 0) return n
    if (mode === 'vertical') {
      return {
        ...n,
        position: { x: opts.startX, y: opts.baseY + idx * gapY },
      }
    }
    return {
      ...n,
      position: { x: opts.startX + idx * opts.gapX, y: opts.baseY },
    }
  })
}
