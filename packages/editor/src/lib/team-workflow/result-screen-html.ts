import type { TeamRuntimeScript } from './schema'
import { resolveToolVisual } from './tool-visuals'

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** HUD 动画 + 漂浮光晕层（仅内联 CSS，无外链） */
const FUTURE_HUD =
  '@keyframes hud-drift{0%{background-position:0% 40%,100% 60%,50% 50%}50%{background-position:100% 55%,0% 45%,50% 50%}100%{background-position:0% 40%,100% 60%,50% 50%}}' +
  '@keyframes panel-glow{0%,100%{box-shadow:0 0 0 1px rgba(100,190,255,0.14) inset,0 8px 32px rgba(0,90,200,0.06),0 22px 56px rgba(15,23,42,0.08),inset 0 1px 0 rgba(255,255,255,0.96),inset 0 -1px 0 rgba(200,220,255,0.38)}50%{box-shadow:0 0 0 1px rgba(120,210,255,0.22) inset,0 8px 40px rgba(40,140,255,0.14),0 26px 64px rgba(15,23,42,0.1),inset 0 1px 0 rgba(255,255,255,1),inset 0 -1px 0 rgba(180,210,255,0.5)}}' +
  '@keyframes tag-pulse{0%,100%{filter:brightness(1);text-shadow:0 0 16px rgba(0,149,255,0.35)}50%{filter:brightness(1.06);text-shadow:0 0 24px rgba(0,180,255,0.55)}}' +
  'body::before{content:"";position:fixed;inset:-5%;z-index:0;pointer-events:none;opacity:.95;background:radial-gradient(circle at 22% 28%,rgba(80,170,255,0.32) 0%,transparent 52%),radial-gradient(circle at 80% 70%,rgba(170,120,255,0.26) 0%,transparent 55%),linear-gradient(168deg,rgba(250,252,255,0.92) 0%,rgba(230,242,255,0.82) 100%);background-size:140% 140%,140% 140%,100% 100%;animation:hud-drift 24s ease-in-out infinite}' +
  'body{isolation:isolate}'

/** 亮色底 + 强磨砂（与未来 HUD 叠加） */
const BODY_LIQUID =
  'position:relative;' +
  'background:linear-gradient(168deg,rgba(255,255,255,0.78) 0%,rgba(232,242,255,0.85) 45%,rgba(240,248,255,0.88) 100%);' +
  'backdrop-filter:blur(52px) saturate(230%);-webkit-backdrop-filter:blur(52px) saturate(230%);'

/** 悬浮玻璃卡片：渐变填充 + 霓虹柔边 + 呼吸光 */
const SCREEN_GLASS =
  'position:relative;z-index:1;' +
  'backdrop-filter:blur(42px) saturate(225%);-webkit-backdrop-filter:blur(42px) saturate(225%);' +
  'background:linear-gradient(155deg,rgba(255,255,255,0.58) 0%,rgba(255,255,255,0.32) 50%,rgba(248,252,255,0.42) 100%);' +
  'border:1px solid rgba(255,255,255,0.72);border-radius:20px;' +
  'box-shadow:0 0 0 1px rgba(120,190,255,0.14) inset,0 10px 36px rgba(0,100,200,0.08),0 24px 56px rgba(15,23,42,0.09),inset 0 1px 0 rgba(255,255,255,0.96),inset 0 -1px 0 rgba(200,220,255,0.38);' +
  'animation:panel-glow 7s ease-in-out infinite alternate'

/** 工位显示器（`screenRole: desk-employee`）：与运行脚本同步成员名与工具色 */
export function buildDeskEmployeeSrcDoc(script: TeamRuntimeScript, deskSlotIndex: number): string {
  const toolName = (id: string) => script.tools.find((t) => t.id === id)?.name ?? id
  const oe = script.orderedEmployees.find((x) => x.deskIndex === deskSlotIndex)
  const slotLabel = `工位 ${deskSlotIndex + 1}`

  if (!oe) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${FUTURE_HUD}
  *{box-sizing:border-box}body{margin:0;font:11px -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;
  color:#1d1d1f;min-height:100vh;padding:10px;display:flex;flex-direction:column;gap:8px;align-items:stretch;
  ${BODY_LIQUID}}
  .panel{padding:12px 14px;${SCREEN_GLASS}}
  .tag{font-size:9px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#007aff;animation:tag-pulse 5s ease-in-out infinite}
  h1{margin:6px 0 0;font-size:13px;font-weight:600;letter-spacing:-0.02em;color:#1d1d1f}
  .hint{margin-top:8px;font-size:10px;line-height:1.45;color:#636366}
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

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${FUTURE_HUD}
  *{box-sizing:border-box}body{margin:0;font:11px -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;
  color:#1d1d1f;min-height:100vh;padding:10px;display:flex;flex-direction:column;gap:8px;align-items:stretch;
  ${BODY_LIQUID}}
  .panel{padding:12px 14px;${SCREEN_GLASS}}
  .tag{font-size:9px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#007aff;animation:tag-pulse 5s ease-in-out infinite}
  h1{margin:6px 0 2px;font-size:14px;font-weight:600;letter-spacing:-0.02em;color:#1d1d1f;text-shadow:0 0 40px rgba(255,255,255,0.35)}
  .role{font-size:11px;color:#636366;line-height:1.35}
  .chips{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px}
  .chip{font-size:9px;font-weight:600;padding:5px 10px;border-radius:999px;color:#fff;
  background:linear-gradient(145deg,color-mix(in srgb,var(--chip,#007aff) 65%,#fff),color-mix(in srgb,var(--chip,#007aff) 88%,#001830));
  border:1px solid color-mix(in srgb,var(--chip,#007aff) 55%,rgba(255,255,255,0.85));
  box-shadow:0 0 18px color-mix(in srgb,var(--chip,#007aff) 38%,transparent),0 4px 14px color-mix(in srgb,var(--chip,#007aff) 28%,transparent)}
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

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${FUTURE_HUD}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:14px;
  ${BODY_LIQUID}
  color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif}
  .box{max-width:96%;width:min(720px,96%);padding:20px 22px;${SCREEN_GLASS}}
  h1{margin:0 0 6px;font-size:clamp(15px,2.2vw,20px);letter-spacing:-0.02em;color:#1d1d1f;font-weight:600}
  .sub{margin:0 0 14px;font-size:11px;color:#636366;line-height:1.45}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{text-align:left;padding:8px 6px;border-bottom:1px solid rgba(0,0,0,0.08);color:#636366;font-weight:600}
  td{padding:8px 6px;border-bottom:1px solid rgba(0,0,0,0.06);vertical-align:top;color:#1d1d1f}
  </style></head><body><div class="box"><h1>团队交付 · ${esc(script.team.name)}</h1>
  <p class="sub">数字员工工作流已完成 · 产线状态已同步</p>
  <table><thead><tr><th>成员</th><th>Title</th><th>工具</th></tr></thead><tbody>${rows}</tbody></table>
  </div></body></html>`
}

export function buildFactoryBoardSrcDoc(script: TeamRuntimeScript, line: string): string {
  const tools = script.tools.map((t) => `${esc(t.name)}`).join(' · ') || '—'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${FUTURE_HUD}
  body{margin:0;min-height:100vh;${BODY_LIQUID}
  color:#1d1d1f;font:11px -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;
  display:flex;align-items:center;justify-content:center;padding:14px}
  .c{padding:14px 16px;max-width:92%;${SCREEN_GLASS}}
  h1{margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;color:#007aff;animation:tag-pulse 6s ease-in-out infinite}
  .line{margin:4px 0;color:#636366;line-height:1.45;font-variant-numeric:tabular-nums}
  .tools{margin-top:8px;font-size:10px;color:#636366;line-height:1.45}
  </style></head><body><div class="c"><h1>产线电子看板</h1>
  <div class="line">${esc(line)}</div>
  <div class="tools">工具带：${tools}</div></div></body></html>`
}
