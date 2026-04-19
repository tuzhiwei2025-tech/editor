/** 与工具 id 绑定的展示用色与符号（工作流 chip / 3D 气泡副文案可共用） */
export type ToolVisualSpec = {
  /** 短标签，例如用于节点 chip */
  symbol: string
  /** 十六进制强调色 */
  color: string
}

const FALLBACK: ToolVisualSpec = { symbol: '·', color: '#86868b' }

const DEFAULT_BY_ID: Record<string, ToolVisualSpec> = {
  code: { symbol: 'Dev', color: '#0a84ff' },
  doc: { symbol: 'Doc', color: '#30d158' },
  data: { symbol: 'Data', color: '#ff9f0a' },
  crm: { symbol: 'CRM', color: '#bf5af2' },
  design: { symbol: 'UX', color: '#ff375f' },
}

/** iconKey 与 id 二选一；优先 id 映射 */
export function resolveToolVisual(toolId: string, iconKey?: string): ToolVisualSpec {
  const fromId = DEFAULT_BY_ID[toolId]
  if (fromId) return fromId
  if (iconKey && DEFAULT_BY_ID[iconKey]) return DEFAULT_BY_ID[iconKey]!
  return { symbol: toolId.slice(0, 3).toUpperCase(), color: '#5ac8fa' }
}
