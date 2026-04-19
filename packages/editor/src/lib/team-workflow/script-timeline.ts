import type { TeamRuntimeScript } from './schema'

/** 与 3D 动画 `ScriptedDeskRobot` / 皮带节奏对齐的时间轴参数 */
export function getScriptTimelineParams(script: TeamRuntimeScript) {
  const dur = script.phaseDurationsSec
  const Tmeet = dur?.meeting ?? 2.5
  const Twalk = dur?.walkToDesk ?? 4.2
  const Twork = dur?.work ?? 14
  const stagger = 0.38
  const n = script.orderedEmployees.length
  const lastWalkEnd = Tmeet + (n - 1) * stagger + Twalk
  const patrolStart = lastWalkEnd + Twork
  const workStart = Tmeet + (n - 1) * stagger + Twalk
  return { Tmeet, Twalk, Twork, stagger, patrolStart, workStart, n }
}

export type ScriptTimelineParams = ReturnType<typeof getScriptTimelineParams>
