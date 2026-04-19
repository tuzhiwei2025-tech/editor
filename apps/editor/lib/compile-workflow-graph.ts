import type { TeamDefinition, TeamRuntimeScript, ToolRef } from '@pascal-app/editor'
import { TeamRuntimeScriptSchema } from '@pascal-app/editor'
import type { Edge, Node } from '@xyflow/react'

export const NODE_GOGO_START = 'gogoStart'
export const NODE_GOGO_END = 'gogoEnd'
export const NODE_EMPLOYEE = 'employee'

export type EmployeeNodeData = {
  employeeId: string
  toolIds: string[]
}

export type CompileFlowOptions = {
  scenarioId?: string
  phaseDurationsSec?: TeamRuntimeScript['phaseDurationsSec']
}

export function compileFlowToScript(
  team: TeamDefinition,
  tools: ToolRef[],
  nodes: Node[],
  edges: Edge[],
  options?: CompileFlowOptions,
): { ok: true; script: TeamRuntimeScript } | { ok: false; error: string } {
  const start = nodes.find((n) => n.type === NODE_GOGO_START)
  const end = nodes.find((n) => n.type === NODE_GOGO_END)
  if (!start || !end) return { ok: false, error: '缺少 GoGo 开始或结束节点' }

  const byId = new Map(nodes.map((n) => [n.id, n]))
  const out = new Map<string, string[]>()
  for (const e of edges) {
    const arr = out.get(e.source) ?? []
    arr.push(e.target)
    out.set(e.source, arr)
  }

  const chain: Node[] = []
  let cur = start.id
  const seen = new Set<string>()
  while (cur && !seen.has(cur)) {
    seen.add(cur)
    const n = byId.get(cur)
    if (!n) return { ok: false, error: '节点引用断裂' }
    if (n.id === end.id) break
    const nexts = out.get(cur) ?? []
    if (nexts.length === 0) return { ok: false, error: '流程未连接到结束节点' }
    if (nexts.length > 1) return { ok: false, error: 'MVP 仅支持单链：请保证每个节点只连出一条边' }
    const nx = nexts[0]!
    const nextNode = byId.get(nx)
    if (!nextNode) return { ok: false, error: '边指向未知节点' }
    if (nextNode.type === NODE_EMPLOYEE) chain.push(nextNode)
    cur = nx
  }

  if (cur !== end.id) return { ok: false, error: '未能从起点沿边到达结束节点' }

  const employees = team.employees
  const orderedEmployees = chain.map((node, deskIndex) => {
    const d = node.data as EmployeeNodeData
    if (!d?.employeeId) return null
    const card = employees.find((e) => e.id === d.employeeId)
    if (!card) return null
    const toolIds = (d.toolIds?.length ? d.toolIds : card.toolIds) ?? []
    return { employeeId: d.employeeId, toolIds, deskIndex }
  })

  if (orderedEmployees.some((x) => x === null)) {
    return { ok: false, error: '存在未绑定团队成员的员工节点' }
  }
  if (orderedEmployees.length < 1) return { ok: false, error: '请至少添加一名员工节点并连线' }
  if (orderedEmployees.length > 8) return { ok: false, error: '最多 8 个工位' }

  const raw: TeamRuntimeScript = {
    version: 1,
    team,
    tools,
    orderedEmployees: orderedEmployees as NonNullable<(typeof orderedEmployees)[number]>[],
    scenarioId: options?.scenarioId ?? 'software-dev',
    ...(options?.phaseDurationsSec ? { phaseDurationsSec: options.phaseDurationsSec } : {}),
  }

  const parsed = TeamRuntimeScriptSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.message }
  return { ok: true, script: parsed.data }
}

export function defaultToolPalette(): ToolRef[] {
  return [
    { id: 'code', name: '代码助手', iconKey: 'code' },
    { id: 'doc', name: '文档生成', iconKey: 'doc' },
    { id: 'data', name: '数据分析', iconKey: 'data' },
    { id: 'crm', name: 'CRM 同步', iconKey: 'crm' },
    { id: 'design', name: '设计协作', iconKey: 'design' },
  ]
}

export function defaultTeam(): TeamDefinition {
  return {
    id: 'team_default',
    name: '默认数字团队',
    employees: [
      { id: 'emp_a', displayName: '阿品', title: '产品经理', toolIds: ['design', 'doc'] },
      { id: 'emp_b', displayName: '小凯', title: '全栈开发', toolIds: ['code', 'doc'] },
      { id: 'emp_c', displayName: '林数', title: '数据工程', toolIds: ['data', 'crm'] },
    ],
  }
}
