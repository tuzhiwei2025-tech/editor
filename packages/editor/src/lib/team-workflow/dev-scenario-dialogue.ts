import type { TeamRuntimeScript } from './schema'
import type { ScriptTimelineParams } from './script-timeline'

export type ScenarioPhaseTag = 'meeting' | 'walk' | 'work' | 'patrol' | 'delivery' | 'idle'

const PATROL_CAPTION_WINDOW_SEC = 22

function scenarioIdOf(script: TeamRuntimeScript): string {
  return script.scenarioId ?? 'software-dev'
}

function meetingSlices(Tmeet: number): { until: number; text: string }[] {
  return [
    { until: 0.32 * Tmeet, text: '各位同事，本周目标是交付「星云」管理端 Beta，按排期推进。' },
    { until: 0.52 * Tmeet, text: '产品先把需求边界钉死；研发拆任务，下午前留出联调窗口。' },
    { until: 0.72 * Tmeet, text: '风险点：支付回调与权限审计，禁止绕过 Code Review。' },
    { until: Tmeet, text: '好，各就各位，开工。' },
  ]
}

function pickMeetingEmployeeLine(
  script: TeamRuntimeScript,
  t: number,
  Tmeet: number,
  scriptIndex: number,
): string | null {
  const n = script.orderedEmployees.length
  if (n < 1 || t >= Tmeet * 0.58) return null
  const slot = Math.floor((t / (Tmeet * 0.58)) * n)
  if (slot !== scriptIndex) return null
  const emp = script.team.employees.find(
    (e) => e.id === script.orderedEmployees[scriptIndex]!.employeeId,
  )
  const name = emp?.displayName ?? '成员'
  const lines = [
    '收到，需求清单我这边再对齐一版。',
    '接口契约我先起草，联调表稍后发群。',
    '埋点与看板我同步补全，保证可观测。',
  ]
  return `${name}：${lines[scriptIndex % lines.length]}`
}

function walkLine(script: TeamRuntimeScript, scriptIndex: number): string {
  const emp = script.team.employees.find(
    (e) => e.id === script.orderedEmployees[scriptIndex]!.employeeId,
  )
  const name = emp?.displayName ?? '成员'
  return `${name}：收到，我现在回工位拉分支、准备环境。`
}

function workLinesForIndex(scriptIndex: number): string[] {
  const bases = [
    '正在实现核心接口，单元测试一并补上。',
    '联调环境已起，我在跟对接字段与错误码。',
    '文档与发布说明同步更新，避免交付缺口。',
    '我在看性能采样，准备提交一版优化。',
    '评审意见已处理，准备发起合并请求。',
  ]
  const out: string[] = []
  for (let k = 0; k < 5; k++) out.push(bases[(scriptIndex + k) % bases.length]!)
  return out
}

function patrolLines(): string[] {
  return [
    '产线节拍正常，我看到各工位交付物都在轨道上。',
    '保持沟通粒度：阻塞超过 15 分钟要升级到我这里。',
    '收尾阶段请再自检一遍回归用例，然后我们看大屏汇总。',
    '干得漂亮，本轮迭代可以封板了——请看中央大屏与皮带看板。',
  ]
}

/** 会议桌 GoGo：仅在会议阶段展示主控台词 */
export function getGogoMeetingCaption(
  script: TeamRuntimeScript,
  t: number,
  tl: ScriptTimelineParams,
): string | null {
  if (scenarioIdOf(script) !== 'software-dev') return null
  if (t >= tl.Tmeet) return null
  for (const s of meetingSlices(tl.Tmeet)) {
    if (t < s.until) return s.text
  }
  return null
}

/** 巡逻 GoGo：巡查阶段台词 */
export function getGogoPatrolCaption(
  script: TeamRuntimeScript,
  t: number,
  tl: ScriptTimelineParams,
): string | null {
  if (scenarioIdOf(script) !== 'software-dev') return null
  if (t < tl.patrolStart) return null
  const dt = t - tl.patrolStart
  if (dt >= PATROL_CAPTION_WINDOW_SEC) return null
  const lines = patrolLines()
  const seg = PATROL_CAPTION_WINDOW_SEC / lines.length
  const i = Math.min(lines.length - 1, Math.floor(dt / seg))
  return lines[i]!
}

/** 员工头顶：主标题 + 对白/状态 */
export function getEmployeeBubbleContent(
  script: TeamRuntimeScript,
  t: number,
  tl: ScriptTimelineParams,
  scriptIndex: number,
): { headline: string; body: string; phase: ScenarioPhaseTag } {
  const oe = script.orderedEmployees[scriptIndex]
  const emp = oe ? script.team.employees.find((e) => e.id === oe.employeeId) : undefined
  const headline =
    emp != null ? `${emp.displayName} · ${emp.title || '成员'}` : (oe?.employeeId ?? '未绑定')

  if (scenarioIdOf(script) !== 'software-dev') {
    return { headline, body: '协作演示运行中…', phase: 'idle' }
  }

  const t0 = tl.Tmeet + scriptIndex * tl.stagger
  const tWalkEnd = t0 + tl.Twalk
  const workEnd = tWalkEnd + tl.Twork

  if (t < tl.Tmeet) {
    const empLine = pickMeetingEmployeeLine(script, t, tl.Tmeet, scriptIndex)
    return {
      headline,
      body: empLine ?? '（站会中）',
      phase: 'meeting',
    }
  }

  if (t < tWalkEnd) {
    if (t < t0) {
      return { headline, body: '等待出发…', phase: 'walk' }
    }
    return { headline, body: walkLine(script, scriptIndex), phase: 'walk' }
  }

  if (t < workEnd) {
    const workDur = workEnd - tWalkEnd
    const u = workDur > 1e-6 ? (t - tWalkEnd) / workDur : 0
    const lines = workLinesForIndex(scriptIndex)
    const idx = Math.min(lines.length - 1, Math.floor(u * lines.length))
    return { headline, body: lines[idx]!, phase: 'work' }
  }

  if (t < tl.patrolStart) {
    return { headline, body: '本段开发已提交，等待巡查确认。', phase: 'delivery' }
  }

  if (t < tl.patrolStart + PATROL_CAPTION_WINDOW_SEC) {
    return { headline, body: '跟随产线节奏，准备大屏复盘。', phase: 'patrol' }
  }

  return { headline, body: '迭代已封板，可查看交付看板。', phase: 'delivery' }
}
