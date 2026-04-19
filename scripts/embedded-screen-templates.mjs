/**
 * 3D 屏幕内嵌 HTML（与 packages/editor/src/lib/team-workflow/result-screen-html.ts 保持同步）。
 * 由 generate-digital-office-demo.mjs 与 patch-demo-office-html.mjs 共用。
 */

export const FUTURE_HUD =
  '@keyframes hud-drift{0%{background-position:0% 40%,100% 60%,50% 50%}50%{background-position:100% 55%,0% 45%,50% 50%}100%{background-position:0% 40%,100% 60%,50% 50%}}' +
  '@keyframes panel-glow{0%,100%{box-shadow:0 0 0 1px rgba(100,190,255,0.14) inset,0 8px 32px rgba(0,90,200,0.06),0 22px 56px rgba(15,23,42,0.08),inset 0 1px 0 rgba(255,255,255,0.96),inset 0 -1px 0 rgba(200,220,255,0.38)}50%{box-shadow:0 0 0 1px rgba(120,210,255,0.22) inset,0 8px 40px rgba(40,140,255,0.14),0 26px 64px rgba(15,23,42,0.1),inset 0 1px 0 rgba(255,255,255,1),inset 0 -1px 0 rgba(180,210,255,0.5)}}' +
  '@keyframes tag-pulse{0%,100%{filter:brightness(1);text-shadow:0 0 16px rgba(0,149,255,0.35)}50%{filter:brightness(1.06);text-shadow:0 0 24px rgba(0,180,255,0.55)}}' +
  'body::before{content:"";position:fixed;inset:-5%;z-index:0;pointer-events:none;opacity:.95;background:radial-gradient(circle at 22% 28%,rgba(80,170,255,0.32) 0%,transparent 52%),radial-gradient(circle at 80% 70%,rgba(170,120,255,0.26) 0%,transparent 55%),linear-gradient(168deg,rgba(250,252,255,0.92) 0%,rgba(230,242,255,0.82) 100%);background-size:140% 140%,140% 140%,100% 100%;animation:hud-drift 24s ease-in-out infinite}' +
  'body{isolation:isolate}'

export const BODY_LIQUID =
  'position:relative;' +
  'background:linear-gradient(168deg,rgba(255,255,255,0.78) 0%,rgba(232,242,255,0.85) 45%,rgba(240,248,255,0.88) 100%);' +
  'backdrop-filter:blur(52px) saturate(230%);-webkit-backdrop-filter:blur(52px) saturate(230%);'

export const GLASS_PANEL =
  'position:relative;z-index:1;' +
  'backdrop-filter:blur(42px) saturate(225%);-webkit-backdrop-filter:blur(42px) saturate(225%);' +
  'background:linear-gradient(155deg,rgba(255,255,255,0.58) 0%,rgba(255,255,255,0.32) 50%,rgba(248,252,255,0.42) 100%);' +
  'border:1px solid rgba(255,255,255,0.72);border-radius:20px;' +
  'box-shadow:0 0 0 1px rgba(120,190,255,0.14) inset,0 10px 36px rgba(0,100,200,0.08),0 24px 56px rgba(15,23,42,0.09),inset 0 1px 0 rgba(255,255,255,0.96),inset 0 -1px 0 rgba(200,220,255,0.38);' +
  'animation:panel-glow 7s ease-in-out infinite alternate'

export function deskEmployeePlaceholderSrcDoc(slotIndex) {
  const n = slotIndex + 1
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${FUTURE_HUD}
  *{box-sizing:border-box}body{margin:0;font:11px -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;color:#1d1d1f;
  min-height:100vh;padding:10px;display:flex;flex-direction:column;gap:8px;align-items:stretch;
  ${BODY_LIQUID}}
  .panel{padding:12px 14px;${GLASS_PANEL}}
  .tag{font-size:9px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#007aff;animation:tag-pulse 5s ease-in-out infinite}
  h1{margin:6px 0 0;font-size:13px;font-weight:600;letter-spacing:-0.02em;color:#1d1d1f}
  .hint{margin-top:8px;font-size:10px;line-height:1.45;color:#636366}
  </style></head><body><div class="panel"><span class="tag">工位 ${n}</span>
  <h1>待命</h1><p class="hint">从工作流页「在 3D 场景预览」运行后，将同步显示该工位绑定成员与工具。</p></div></body></html>`
}

export function wallScreenSrcDoc() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${FUTURE_HUD}
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;
  ${BODY_LIQUID}
  color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif}
  .box{max-width:92%;text-align:center;padding:22px 30px;border-radius:20px;${GLASS_PANEL}}
  h1{margin:0 0 10px;font-size:clamp(16px,2.5vw,22px);letter-spacing:-0.02em;font-weight:600;color:#1d1d1f}
  p{margin:0;font-size:12px;line-height:1.55;color:#636366}
  code{font-size:10px;background:rgba(0,122,255,0.12);color:#0055d4;padding:2px 8px;border-radius:6px;border:1px solid rgba(0,122,255,0.25);box-shadow:0 0 14px rgba(0,149,255,0.15)}
  </style></head><body><div class="box"><h1>信息发布大屏 · HTML</h1><p><code>metadata.htmlPreview</code></p></div></body></html>`
}

export function factoryBoardSrcDoc() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${FUTURE_HUD}
  body{margin:0;min-height:100vh;${BODY_LIQUID}
  color:#1d1d1f;font:11px -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:14px}
  .c{padding:14px 16px;border-radius:20px;max-width:90%;${GLASS_PANEL}}
  h1{margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.08em;color:#007aff;animation:tag-pulse 6s ease-in-out infinite}
  .line{margin-top:4px;color:#636366;line-height:1.45;font-variant-numeric:tabular-nums}
  </style></head><body><div class="c"><h1>产线电子看板</h1><div class="line">OEE · 节拍 · 异常</div></div></body></html>`
}

export function meetingAgendaSrcDoc() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${FUTURE_HUD}
  body{margin:0;min-height:100vh;${BODY_LIQUID}
  color:#1d1d1f;font:12px -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;padding:12px;display:flex;align-items:stretch}
  .panel{flex:1;padding:14px 16px;${GLASS_PANEL}}
  .tag{font-size:9px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#af52de}
  h1{margin:6px 0 8px;font-size:13px;font-weight:600;letter-spacing:-0.02em;color:#1d1d1f}
  li{margin:4px 0;color:#636366;line-height:1.4}
  </style></head><body><div class="panel"><span class="tag">会议</span><h1>议程</h1><ul><li>季度 OKR</li><li>产线节拍复盘</li></ul></div></body></html>`
}

export function teaStationSrcDoc() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${FUTURE_HUD}
  *{box-sizing:border-box}body{margin:0;font:11px -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;color:#1d1d1f;
  min-height:100vh;padding:10px;display:flex;flex-direction:column;gap:8px;align-items:stretch;
  ${BODY_LIQUID}}
  .panel{padding:12px 14px;${GLASS_PANEL}}
  .tag{font-size:9px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#34c759}
  h1{margin:6px 0 0;font-size:13px;font-weight:600;letter-spacing:-0.02em;color:#1d1d1f}
  .hint{margin-top:8px;font-size:10px;line-height:1.45;color:#636366}
  </style></head><body><div class="panel"><span class="tag">茶水区</span>
  <h1>自助</h1><p class="hint">饮品、微波炉与杯具取用后请归位。</p></div></body></html>`
}
