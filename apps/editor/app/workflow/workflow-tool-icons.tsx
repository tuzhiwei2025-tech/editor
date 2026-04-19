import type { LucideIcon } from 'lucide-react'
import { Boxes, Code2, Database, FileText, Palette, Share2 } from 'lucide-react'

const WORKFLOW_TOOL_ICONS: Record<string, LucideIcon> = {
  code: Code2,
  doc: FileText,
  data: Database,
  crm: Share2,
  design: Palette,
}

/** 与 `resolveToolVisual` 的 id / iconKey 对齐 */
export function workflowToolIconFor(toolId: string, iconKey?: string): LucideIcon {
  return WORKFLOW_TOOL_ICONS[toolId] ?? WORKFLOW_TOOL_ICONS[iconKey ?? ''] ?? Boxes
}
