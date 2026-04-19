/**
 * 按 metadata.screenRole 重写 demo_office.json 中的 htmlPreview.srcDoc（与 embedded-screen-templates 一致）。
 * Run: node scripts/patch-demo-office-html.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  deskEmployeePlaceholderSrcDoc,
  factoryBoardSrcDoc,
  wallScreenSrcDoc,
} from './embedded-screen-templates.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const path = join(__dirname, '../apps/editor/public/demos/demo_office.json')

const data = JSON.parse(readFileSync(path, 'utf8'))
const nodes = data.nodes

for (const id of Object.keys(nodes)) {
  const n = nodes[id]
  const m = n.metadata
  if (!m?.htmlPreview?.srcDoc) continue

  const role = m.screenRole
  if (role === 'desk-employee') {
    const idx = typeof m.deskSlotIndex === 'number' ? m.deskSlotIndex : 0
    m.htmlPreview.srcDoc = deskEmployeePlaceholderSrcDoc(idx)
  } else if (role === 'team-result') {
    m.htmlPreview.srcDoc = wallScreenSrcDoc()
  } else if (role === 'belt-status') {
    m.htmlPreview.srcDoc = factoryBoardSrcDoc()
  }
}

writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
console.log('Patched htmlPreview.srcDoc in', path)
