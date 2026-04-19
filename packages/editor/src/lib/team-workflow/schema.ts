import { z } from 'zod'

export const ToolRefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  iconKey: z.string().optional(),
})

export const EmployeeCardSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  title: z.string().default(''),
  toolIds: z.array(z.string()).default([]),
})

export const TeamDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  employees: z.array(EmployeeCardSchema).default([]),
})

/** 与 3D 时间轴对齐的粗粒度阶段（便于后续接引擎） */
export const RuntimePhaseSchema = z.enum([
  'meeting',
  'walkToDesk',
  'work',
  'gogoPatrol',
  'resultScreen',
  'beltSummary',
])

export const OrderedEmployeeSchema = z.object({
  employeeId: z.string(),
  /** 节点上覆盖的工具；空则用工位卡片默认 */
  toolIds: z.array(z.string()).default([]),
  deskIndex: z.number().int().min(0).max(7),
})

export const TeamRuntimeScriptSchema = z.object({
  version: z.literal(1).default(1),
  team: TeamDefinitionSchema,
  tools: z.array(ToolRefSchema).default([]),
  orderedEmployees: z.array(OrderedEmployeeSchema).min(1).max(8),
  /** 内置叙事场景，缺省为软件开发演示 */
  scenarioId: z.string().optional(),
  /** 预留：同一场景下对白变体 */
  dialogueVariant: z.string().optional(),
  /** 各阶段建议时长（秒），3D 侧可微调；缺省由运行时补全 */
  phaseDurationsSec: z
    .object({
      meeting: z.number().positive(),
      walkToDesk: z.number().positive(),
      work: z.number().positive(),
      gogoPatrol: z.number().positive(),
      resultHold: z.number().positive(),
    })
    .optional(),
})

export type ToolRef = z.infer<typeof ToolRefSchema>
export type EmployeeCard = z.infer<typeof EmployeeCardSchema>
export type TeamDefinition = z.infer<typeof TeamDefinitionSchema>
export type RuntimePhase = z.infer<typeof RuntimePhaseSchema>
export type OrderedEmployee = z.infer<typeof OrderedEmployeeSchema>
export type TeamRuntimeScript = z.infer<typeof TeamRuntimeScriptSchema>

export const TEAM_WORKFLOW_LS_PREFIX = 'pascal:team-workflow:v1:'
export const TEAM_RUNTIME_SCRIPT_SESSION_KEY = 'pascal:team-runtime-script:v1'
/**
 * `sessionStorage` 不跨「新标签页」共享；从工作流页 `window.open` 打开编辑器时，
 * 脚本写入此 `localStorage` 键，首页读取后复制到当前标签的 `sessionStorage` 并删除本键。
 */
export const TEAM_RUNTIME_SCRIPT_HANDOFF_KEY = 'pascal:team-runtime-handoff:v1'

export function parseTeamRuntimeScript(raw: unknown): TeamRuntimeScript | null {
  const r = TeamRuntimeScriptSchema.safeParse(raw)
  return r.success ? r.data : null
}
