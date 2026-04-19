import type { TeamRuntimeScript } from './schema'
import { resolveToolVisual } from './tool-visuals'

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Apple 系大屏共用：中性底 + 玻璃面板 + 系统蓝强调 */
const SCREEN_GLASS =
  'backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);' +
  'background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.14);border-radius:16px;' +
  'box-shadow:0 8px 32px rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.12)'

/** 工位显示器（`screenRole: desk-employee`）：与运行脚本同步成员名与工具色 */
export function buildDeskEmployeeSrcDoc(script: TeamRuntimeScript, deskSlotIndex: number): string {
  const toolName = (id: string) => script.tools.find((t) => t.id === id)?.name ?? id
  const oe = script.orderedEmployees.find((x) => x.deskIndex === deskSlotIndex)
  const slotLabel = `工位 ${deskSlotIndex + 1}`

  if (!oe) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
  *{box-sizing:border-box}body{margin:0;font:11px -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;
  color:#f5f5f7;min-height:100vh;padding:10px;display:flex;flex-direction:column;gap:8px;align-items:stretch;
  background:linear-gradient(165deg,rgba(29,29,31,0.92),rgba(10,10,12,0.96) 55%,rgba(22,22,24,0.94));
  backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%)}
  .panel{padding:12px 14px;${SCREEN_GLASS}}
  .tag{font-size:9px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#a1a1a6}
  h1{margin:6px 0 0;font-size:13px;font-weight:600;letter-spacing:-0.02em;color:#f5f5f7}
  .hint{margin-top:8px;font-size:10px;line-height:1.45;color:#a1a1a6}
  </style></head><body><div class="panel"><span class="tag">${esc(slotLabel)}</span>
  <h1>空闲</h1><p class="hint">在工作流画布中为该工位添加员工节点并预览后，将显示成员与工具。</p></div></body></html>`
  }

  const emp = script.team.employees.find((e) => e.id === oe.employeeId)
  const name = emp?.displayName ?? oe.employeeId
  const title = emp?.title ?? ''
  const ids = oe.toolIds.length ? oe.toolIds : (emp?.toolIds ?? [])
  const toolChips = ids
    .map((id) => {
      const ref = script.tools.find((t) => t.id === id)
      const vis = resolveToolVisual(id, ref?.iconKey)
      const label = esc(toolName(id))
      return `<span class="chip" style="--chip:${vis.color}">${label}</span>`
    })
    .join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
  *{box-sizing:border-box}body{margin:0;font:11px -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;
  color:#f5f5f7;min-height:100vh;padding:10px;display:flex;flex-direction:column;gap:8px;align-items:stretch;
  background:linear-gradient(165deg,rgba(29,29,31,0.92),rgba(10,10,12,0.96) 55%,rgba(22,22,24,0.94));
  backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%)}
  .panel{padding:12px 14px;${SCREEN_GLASS}}
  .tag{font-size:9px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#0a84ff}
  h1{margin:6px 0 2px;font-size:14px;font-weight:600;letter-spacing:-0.02em;color:#f5f5f7}
  .role{font-size:11px;color:#a1a1a6;line-height:1.35}
  .chips{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px}
  .chip{font-size:9px;font-weight:600;padding:4px 8px;border-radius:8px;color:#fff;
  background:color-mix(in srgb,var(--chip,#0a84ff) 78%,#000 22%);
  border:1px solid color-mix(in srgb,var(--chip,#0a84ff) 50%,transparent)}
  </style></head><body><div class="panel"><span class="tag">${esc(slotLabel)}</span>
  <h1>${esc(name)}</h1>${title ? `<div class="role">${esc(title)}</div>` : ''}
  <div class="chips">${toolChips || '<span class="role">工具未配置</span>'}</div></div></body></html>`
}

/** 写入信息发布大屏 `metadata.htmlPreview.srcDoc` */
export function buildTeamResultSrcDoc(script: TeamRuntimeScript): string {
  const toolName = (id: string) => script.tools.find((t) => t.id === id)?.name ?? id
  const rows = script.orderedEmployees
    .map((oe) => {
      const emp = script.team.employees.find((e) => e.id === oe.employeeId)
      const name = emp?.displayName ?? oe.employeeId
      const title = emp?.title ?? ''
      const ids = oe.toolIds.length ? oe.toolIds : (emp?.toolIds ?? [])
      const tools = ids.map(toolName).join(' · ')
      return `<tr><td>${esc(name)}</td><td>${esc(title)}</td><td>${esc(tools || '—')}</td></tr>`
    })
    .join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:14px;
  background:linear-gradient(155deg,rgba(29,29,31,0.88),rgba(10,10,12,0.95) 52%,rgba(22,22,24,0.92));
  backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%);
  color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif}
  .box{max-width:96%;width:min(720px,96%);padding:20px 22px;${SCREEN_GLASS}}
  h1{margin:0 0 6px;font-size:clamp(15px,2.2vw,20px);letter-spacing:-0.02em;color:#f5f5f7;font-weight:600}
  .sub{margin:0 0 14px;font-size:11px;color:#a1a1a6;line-height:1.45}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{text-align:left;padding:8px 6px;border-bottom:1px solid rgba(255,255,255,0.12);color:#a1a1a6;font-weight:600}
  td{padding:8px 6px;border-bottom:1px solid rgba(255,255,255,0.08);vertical-align:top;color:#f5f5f7}
  </style></head><body><div class="box"><h1>团队交付 · ${esc(script.team.name)}</h1>
  <p class="sub">数字员工工作流已完成 · 产线状态已同步</p>
  <table><thead><tr><th>成员</th><th>Title</th><th>工具</th></tr></thead><tbody>${rows}</tbody></table>
  </div></body></html>`
}

export function buildFactoryBoardSrcDoc(script: TeamRuntimeScript, line: string): string {
  const tools = script.tools.map((t) => `${esc(t.name)}`).join(' · ') || '—'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
  body{margin:0;min-height:100vh;background:linear-gradient(165deg,rgba(29,29,31,0.9),rgba(10,10,12,0.96));
  backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);
  color:#f5f5f7;font:11px -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;
  display:flex;align-items:center;justify-content:center;padding:14px}
  .c{padding:14px 16px;max-width:92%;${SCREEN_GLASS}}
  h1{margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.02em;color:#0a84ff}
  .line{margin:4px 0;color:#f5f5f7;opacity:0.95;line-height:1.45}
  .tools{margin-top:8px;font-size:10px;color:#a1a1a6;line-height:1.45}
  </style></head><body><div class="c"><h1>产线电子看板</h1>
  <div class="line">${esc(line)}</div>
  <div class="tools">工具带：${tools}</div></div></body></html>`
}
