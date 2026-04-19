/**
 * 与 `scripts/generate-digital-office-demo.mjs` 中 OFFICE_DESKS / 会议室几何保持一致，
 * 供 `demo-pack-ambient` 与生成脚本人工对齐时对照。
 */
export const OFFICE_DESKS_LAYOUT = [
  { tx: 1, tz: 1.4, toward: 'south' as const },
  { tx: 4.5, tz: 1.4, toward: 'south' as const },
  { tx: 8, tz: 1.4, toward: 'south' as const },
  { tx: 11.5, tz: 1.4, toward: 'south' as const },
  { tx: 1, tz: 5.2, toward: 'south' as const },
  { tx: 4.5, tz: 5.2, toward: 'south' as const },
  { tx: 8, tz: 5.2, toward: 'south' as const },
  { tx: 11.5, tz: 5.2, toward: 'south' as const },
]

/** 与 demo-pack-ambient GogoMeetingHost 一致 */
export const GOGO_MEETING_HOST = { x: 10.65, z: 13.18 }

/** 会议桌中心（与生成脚本 MEET_TABLE_* 一致） */
export const MEET_TABLE_CENTER = { x: 9.1, z: 13.22 }

/** 数字员工机器人出生在会议桌附近（略高于地面，由调用方设 Y） */
export function meetingSpawnForIndex(index: number, total: number): { x: number; z: number } {
  if (total <= 0) return { x: MEET_TABLE_CENTER.x, z: MEET_TABLE_CENTER.z }
  const spread = Math.min(2.6, 0.45 + total * 0.38)
  const t = (index + 1) / (total + 1) - 0.5
  return {
    x: MEET_TABLE_CENTER.x + t * spread,
    z: MEET_TABLE_CENTER.z - 0.85,
  }
}
