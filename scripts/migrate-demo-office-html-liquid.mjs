/**
 * 将 demo_office.json 中内嵌 srcDoc 从深色底迁移为亮色液态玻璃（与 generate 脚本 / result-screen-html 一致）。
 * Run: node scripts/migrate-demo-office-html-liquid.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const path = join(__dirname, '../apps/editor/public/demos/demo_office.json')

const NEW_BODY_BLOCK =
  'background:linear-gradient(165deg,rgba(255,255,255,0.88) 0%,rgba(242,242,247,0.78) 45%,rgba(232,237,252,0.82) 100%);backdrop-filter:blur(44px) saturate(200%);-webkit-backdrop-filter:blur(44px) saturate(200%);'

const OLD_BODY_DARK =
  /background:linear-gradient\(165deg,rgba\(29,29,31,0\.92\),rgba\(10,10,12,0\.96\) 55%,rgba\(22,22,24,0\.94\)\);\s*backdrop-filter:blur\(20px\) saturate\(160%\);-webkit-backdrop-filter:blur\(20px\) saturate\(160%\)/g

const OLD_PANEL_DESK =
  /\.panel\{padding:12px 14px;backdrop-filter:blur\(28px\) saturate\(200%\);-webkit-backdrop-filter:blur\(28px\) saturate\(200%\);background:rgba\(255,255,255,0\.06\);border:1px solid rgba\(255,255,255,0\.28\);border-radius:12px;box-shadow:0 8px 28px rgba\(0,0,0,0\.14\),inset 0 1px 0 rgba\(255,255,255,0\.35\)\}/g

const NEW_PANEL =
  '.panel{padding:12px 14px;backdrop-filter:blur(36px) saturate(210%);-webkit-backdrop-filter:blur(36px) saturate(210%);background:rgba(255,255,255,0.42);border:1px solid rgba(255,255,255,0.78);border-radius:18px;box-shadow:0 14px 44px rgba(15,23,42,0.07),inset 0 1px 0 rgba(255,255,255,0.95),inset 0 -1px 0 rgba(255,255,255,0.42)}'

const OLD_PANEL_MEET =
  /\.panel\{flex:1;padding:14px 16px;backdrop-filter:blur\(28px\) saturate\(200%\);-webkit-backdrop-filter:blur\(28px\) saturate\(200%\);background:rgba\(255,255,255,0\.06\);border:1px solid rgba\(255,255,255,0\.28\);border-radius:12px;box-shadow:0 8px 28px rgba\(0,0,0,0\.14\),inset 0 1px 0 rgba\(255,255,255,0\.35\)\}/g

const NEW_PANEL_MEET =
  '.panel{flex:1;padding:14px 16px;backdrop-filter:blur(36px) saturate(210%);-webkit-backdrop-filter:blur(36px) saturate(210%);background:rgba(255,255,255,0.42);border:1px solid rgba(255,255,255,0.78);border-radius:18px;box-shadow:0 14px 44px rgba(15,23,42,0.07),inset 0 1px 0 rgba(255,255,255,0.95),inset 0 -1px 0 rgba(255,255,255,0.42)}'

const OLD_WALL_BLOCK =
  /background:linear-gradient\(155deg,rgba\(8,47,73,0\.22\),rgba\(15,23,42,0\.28\) 50%,rgba\(30,41,59,0\.2\)\);\s*backdrop-filter:blur\(24px\) saturate\(180%\);-webkit-backdrop-filter:blur\(24px\) saturate\(180%\);\s*color:#f0f9ff;font-family:system-ui,sans-serif\}\s*\.box\{max-width:92%;text-align:center;padding:22px 30px;border-radius:16px;backdrop-filter:blur\(28px\) saturate\(200%\);-webkit-backdrop-filter:blur\(28px\) saturate\(200%\);background:rgba\(255,255,255,0\.06\);border:1px solid rgba\(255,255,255,0\.28\);border-radius:12px;box-shadow:0 8px 28px rgba\(0,0,0,0\.14\),inset 0 1px 0 rgba\(255,255,255,0\.35\)\}/g

const NEW_WALL_BLOCK =
  `${NEW_BODY_BLOCK}color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif}.box{max-width:92%;text-align:center;padding:22px 30px;border-radius:18px;backdrop-filter:blur(36px) saturate(210%);-webkit-backdrop-filter:blur(36px) saturate(210%);background:rgba(255,255,255,0.42);border:1px solid rgba(255,255,255,0.78);border-radius:18px;box-shadow:0 14px 44px rgba(15,23,42,0.07),inset 0 1px 0 rgba(255,255,255,0.95),inset 0 -1px 0 rgba(255,255,255,0.42)}`

const OLD_FACTORY_BLOCK =
  /body\{margin:0;min-height:100vh;background:linear-gradient\(170deg,rgba\(41,37,36,0\.7\),rgba\(28,25,23,0\.85\)\);\s*backdrop-filter:blur\(16px\);-webkit-backdrop-filter:blur\(16px\);\s*color:#fed7aa;font:11px system-ui;display:flex;align-items:center;justify-content:center;padding:14px\}\s*\.c\{padding:14px 16px;border-radius:12px;max-width:90%;backdrop-filter:blur\(28px\) saturate\(200%\);-webkit-backdrop-filter:blur\(28px\) saturate\(200%\);background:rgba\(255,255,255,0\.06\);border:1px solid rgba\(255,255,255,0\.28\);border-radius:12px;box-shadow:0 8px 28px rgba\(0,0,0,0\.14\),inset 0 1px 0 rgba\(255,255,255,0\.35\);border-color:rgba\(251,146,60,0\.4\)\}\s*h1\{margin:0 0 6px;font-size:12px;color:#fdba74\}/g

const NEW_FACTORY_BLOCK =
  `body{margin:0;min-height:100vh;${NEW_BODY_BLOCK}color:#1d1d1f;font:11px -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:14px}.c{padding:14px 16px;border-radius:18px;max-width:90%;backdrop-filter:blur(36px) saturate(210%);-webkit-backdrop-filter:blur(36px) saturate(210%);background:rgba(255,255,255,0.42);border:1px solid rgba(255,255,255,0.78);border-radius:18px;box-shadow:0 14px 44px rgba(15,23,42,0.07),inset 0 1px 0 rgba(255,255,255,0.95),inset 0 -1px 0 rgba(255,255,255,0.42)}h1{margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.02em;color:#007aff}`

function migrate(s) {
  if (typeof s !== 'string') return s
  let o = s
  o = o.replace(OLD_BODY_DARK, NEW_BODY_BLOCK)
  o = o.replace(OLD_WALL_BLOCK, NEW_WALL_BLOCK)
  o = o.replace(OLD_FACTORY_BLOCK, NEW_FACTORY_BLOCK)
  o = o.replace(OLD_PANEL_MEET, NEW_PANEL_MEET)
  o = o.replace(OLD_PANEL_DESK, NEW_PANEL)
  o = o.replace(/system-ui,sans-serif;color:#f5f5f7;/g, 'system-ui,sans-serif;color:#1d1d1f;')
  o = o.replace(/  color:#f5f5f7;font:12px/g, '  color:#1d1d1f;font:12px')
  o = o.replace(/color:#0a84ff}/g, 'color:#007aff}')
  o = o.replace(/letter-spacing:-0\.02em;color:#f5f5f7}/g, 'letter-spacing:-0.02em;color:#1d1d1f}')
  o = o.replace(/\.hint\{margin-top:8px;font-size:10px;line-height:1\.45;color:#a1a1a6}/g, '.hint{margin-top:8px;font-size:10px;line-height:1.45;color:#636366}')
  o = o.replace(/h1\{margin:0 0 10px;font-size:clamp\(16px,2\.5vw,22px\);letter-spacing:0\.02em\}/g, 'h1{margin:0 0 10px;font-size:clamp(16px,2.5vw,22px);letter-spacing:-0.02em;font-weight:600;color:#1d1d1f}')
  o = o.replace(/p\{margin:0;font-size:12px;opacity:0\.9;line-height:1\.55\}/g, 'p{margin:0;font-size:12px;line-height:1.55;color:#636366}')
  o = o.replace(
    /code\{font-size:10px;background:rgba\(15,23,42,0\.35\);padding:2px 6px;border-radius:4px;border:1px solid rgba\(148,163,184,0\.22\)\}/g,
    'code{font-size:10px;background:rgba(0,122,255,0.1);color:#0055d4;padding:2px 8px;border-radius:6px;border:1px solid rgba(0,122,255,0.2)}',
  )
  o = o.replace(/\.tag\{font-size:9px;font-weight:600;letter-spacing:0\.04em;text-transform:uppercase;color:#bf5af2\}/g, '.tag{font-size:9px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#af52de}')
  o = o.replace(/li\{margin:4px 0;color:#a1a1a6/g, 'li{margin:4px 0;color:#636366')
  return o
}

function walk(v) {
  if (typeof v === 'string') return migrate(v)
  if (Array.isArray(v)) return v.map(walk)
  if (v && typeof v === 'object') {
    const o = {}
    for (const k of Object.keys(v)) {
      o[k] = walk(v[k])
    }
    return o
  }
  return v
}

const raw = readFileSync(path, 'utf8')
const json = JSON.parse(raw)
writeFileSync(path, `${JSON.stringify(walk(json), null, 2)}\n`, 'utf8')
console.log('Updated', path)
