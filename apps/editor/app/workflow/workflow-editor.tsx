'use client'

import './workflow-editor.css'

import {
  addEdge,
  Background,
  Controls,
  type Edge,
  Handle,
  type Node,
  type NodeProps,
  type OnSelectionChangeParams,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  createLocalTeamRepository,
  resolveToolVisual,
  TEAM_RUNTIME_SCRIPT_HANDOFF_KEY,
  TEAM_RUNTIME_SCRIPT_SESSION_KEY,
  type TeamDefinition,
  type ToolRef,
} from '@pascal-app/editor'
import clsx from 'clsx'
import { Flag, LayoutGrid, Rows3, Sparkles } from 'lucide-react'
import Link from 'next/link'
import {
  type CSSProperties,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  compileFlowToScript,
  defaultTeam,
  defaultToolPalette,
  type EmployeeNodeData,
  NODE_EMPLOYEE,
  NODE_GOGO_END,
  NODE_GOGO_START,
} from '../../lib/compile-workflow-graph'
import { type TidyLayoutMode, tidyWorkflowChain } from '../../lib/tidy-workflow-nodes'
import { loadWorkflowUiDefaults } from '../../lib/workflow-ui-defaults'
import { workflowToolIconFor } from './workflow-tool-icons'

const WorkflowDiagramCtx = createContext<{ team: TeamDefinition; tools: ToolRef[] } | null>(null)

function GogoStartNode({ selected }: NodeProps) {
  return (
    <div className={clsx('wf-node wf-node--start wf-node--gogo', selected && 'wf-node--selected')}>
      <div className="wf-node__inner">
        <div className="wf-node-gogo-row">
          <div className="wf-node-gogo-ico wf-node-gogo-ico--start" aria-hidden>
            <Sparkles className="size-[1.05rem]" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="wf-node-title wf-node-accent-start">GoGo · 开始</div>
            <div className="wf-node-sub">可拖拽 · 流程起点</div>
          </div>
        </div>
      </div>
      <Handle
        className="wf-handle wf-handle--src !border-sky-300/50 !bg-sky-300/90"
        position={Position.Right}
        type="source"
      />
    </div>
  )
}

function GogoEndNode({ selected }: NodeProps) {
  return (
    <div className={clsx('wf-node wf-node--end wf-node--gogo', selected && 'wf-node--selected')}>
      <Handle
        className="wf-handle wf-handle--tgt !border-violet-300/50 !bg-violet-300/90"
        position={Position.Left}
        type="target"
      />
      <div className="wf-node__inner">
        <div className="wf-node-gogo-row">
          <div className="wf-node-gogo-ico wf-node-gogo-ico--end" aria-hidden>
            <Flag className="size-[1.05rem]" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="wf-node-title wf-node-accent-end">GoGo · 结束</div>
            <div className="wf-node-sub">可拖拽 · 交付收尾</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmployeeFlowNode(props: NodeProps) {
  const ctx = useContext(WorkflowDiagramCtx)
  const { data, selected } = props
  const d = data as EmployeeNodeData
  const emp = ctx?.team.employees.find((e) => e.id === d.employeeId)
  const display = emp?.displayName ?? (d.employeeId || '未绑定')
  const title = emp?.title ?? ''
  const toolIds = d.toolIds?.length ? d.toolIds : (emp?.toolIds ?? [])
  return (
    <div className={clsx('wf-node wf-node--employee', selected && 'wf-node--selected')}>
      <Handle className="wf-handle wf-handle--tgt" position={Position.Left} type="target" />
      <div className="wf-node__inner">
        <div className="wf-node-label">员工节点</div>
        <div className="wf-node-value wf-node-value--emp-title" title={`${display} ${title}`}>
          {display}
          {title ? <span className="wf-node-role"> · {title}</span> : null}
        </div>
        <div className="wf-tool-chip-row">
          {toolIds.length ? (
            toolIds.map((id) => {
              const ref = ctx?.tools.find((x) => x.id === id)
              const vis = resolveToolVisual(id, ref?.iconKey)
              const Icon = workflowToolIconFor(id, ref?.iconKey)
              return (
                <span
                  className="wf-tool-chip wf-tool-chip--with-icon"
                  key={id}
                  style={
                    {
                      '--wf-chip': vis.color,
                    } as CSSProperties
                  }
                  title={ref?.name ?? id}
                >
                  <Icon aria-hidden className="wf-tool-chip__ico" size={13} strokeWidth={2.25} />
                </span>
              )
            })
          ) : (
            <span className="wf-tool-chip wf-tool-chip--empty">未选工具</span>
          )}
        </div>
      </div>
      <Handle className="wf-handle wf-handle--src" position={Position.Right} type="source" />
    </div>
  )
}

const nodeTypes = {
  [NODE_GOGO_START]: GogoStartNode,
  [NODE_GOGO_END]: GogoEndNode,
  [NODE_EMPLOYEE]: EmployeeFlowNode,
}

const START_ID = 'n_gogo_start'
const END_ID = 'n_gogo_end'

function TidyFlowPanel() {
  const { getNodes, getEdges, setNodes, fitView } = useReactFlow()

  const applyTidy = useCallback(
    (mode: TidyLayoutMode) => {
      setNodes(
        tidyWorkflowChain(getNodes(), getEdges(), {
          startId: START_ID,
          endId: END_ID,
          startX: mode === 'horizontal' ? 52 : 260,
          baseY: mode === 'horizontal' ? 124 : 44,
          gapX: mode === 'horizontal' ? 252 : 0,
          gapY: mode === 'vertical' ? 136 : undefined,
          mode,
        }),
      )
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 340 })
      })
    },
    [fitView, getEdges, getNodes, setNodes],
  )

  return (
    <Panel
      className="workflow-app__panel wf-tidy-panel m-3 flex flex-col gap-0.5 rounded-2xl border p-1.5 shadow-lg"
      position="top-right"
    >
      <button
        className="workflow-app__btn wf-tidy-panel__btn flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[var(--wf-text)] text-xs hover:bg-white/10"
        onClick={() => applyTidy('horizontal')}
        title="沿单链水平对齐"
        type="button"
      >
        <LayoutGrid aria-hidden className="size-3.5 shrink-0 opacity-90" strokeWidth={2.25} />
        <span>横向整理</span>
      </button>
      <button
        className="workflow-app__btn wf-tidy-panel__btn flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[var(--wf-text)] text-xs hover:bg-white/10"
        onClick={() => applyTidy('vertical')}
        title="沿单链垂直堆叠"
        type="button"
      >
        <Rows3 aria-hidden className="size-3.5 shrink-0 opacity-90" strokeWidth={2.25} />
        <span>纵向排列</span>
      </button>
    </Panel>
  )
}

function initialNodesAndEdges(): { nodes: Node[]; edges: Edge[] } {
  const e1 = 'n_emp_1'
  const e2 = 'n_emp_2'
  return {
    nodes: [
      {
        id: START_ID,
        type: NODE_GOGO_START,
        position: { x: 40, y: 120 },
        data: {},
      },
      {
        id: e1,
        type: NODE_EMPLOYEE,
        position: { x: 220, y: 100 },
        data: { employeeId: 'emp_a', toolIds: [] } satisfies EmployeeNodeData,
      },
      {
        id: e2,
        type: NODE_EMPLOYEE,
        position: { x: 420, y: 100 },
        data: { employeeId: 'emp_b', toolIds: [] } satisfies EmployeeNodeData,
      },
      {
        id: END_ID,
        type: NODE_GOGO_END,
        position: { x: 620, y: 120 },
        data: {},
      },
    ],
    edges: [
      { id: 'ed1', source: START_ID, target: e1 },
      { id: 'ed2', source: e1, target: e2 },
      { id: 'ed3', source: e2, target: END_ID },
    ],
  }
}

export function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner />
    </ReactFlowProvider>
  )
}

function WorkflowEditorInner() {
  const repo = useMemo(() => createLocalTeamRepository(), [])
  const [team, setTeam] = useState<TeamDefinition>(() => defaultTeam())
  const [tools] = useState<ToolRef[]>(() => defaultToolPalette())
  const init = useMemo(() => initialNodesAndEdges(), [])
  const [nodes, setNodes, onNodesChange] = useNodesState(init.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(init.edges)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const list = repo.listTeams()
    const t = repo.getTeam('team_default') ?? list[0]
    if (t) setTeam(t)
  }, [repo])

  const selectedNode = nodes.find((n) => n.id === selectedId)
  const selectedEmployeeData =
    selectedNode?.type === NODE_EMPLOYEE ? (selectedNode.data as EmployeeNodeData) : null

  const onConnect = useCallback(
    (params: Parameters<typeof addEdge>[0]) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  )

  const onSelectionChange = useCallback((p: OnSelectionChangeParams) => {
    const one = p.nodes[0]
    setSelectedId(one?.id ?? null)
  }, [])

  const persistTeam = useCallback(() => {
    repo.saveTeam(team)
    setMessage('团队已保存到本地')
    setTimeout(() => setMessage(null), 2000)
  }, [repo, team])

  const addEmployeeNode = useCallback(() => {
    const id = `n_emp_${crypto.randomUUID().slice(0, 8)}`
    const firstEmp = team.employees[0]
    setNodes((ns) => {
      const end = ns.find((n) => n.id === END_ID)
      const px = (end?.position.x ?? 620) - 180
      return [
        ...ns,
        {
          id,
          type: NODE_EMPLOYEE,
          position: { x: Math.max(200, px), y: 100 + Math.random() * 40 },
          data: {
            employeeId: firstEmp?.id ?? '',
            toolIds: [],
          } satisfies EmployeeNodeData,
        },
      ]
    })
    setEdges((es) => {
      const toEnd = es.find((e) => e.target === END_ID)
      if (!toEnd) return [...es, { id: `ed_${id}_end`, source: id, target: END_ID }]
      const filtered = es.filter((e) => e.id !== toEnd.id)
      return [
        ...filtered,
        { id: `ed_${toEnd.source}_${id}`, source: toEnd.source, target: id },
        { id: `ed_${id}_end`, source: id, target: END_ID },
      ]
    })
  }, [setEdges, setNodes, team.employees])

  const removeSelectedEmployeeNode = useCallback(() => {
    if (!selectedId || !selectedNode || selectedNode.type !== NODE_EMPLOYEE) return
    const incoming = edges.find((e) => e.target === selectedId)
    const outgoing = edges.find((e) => e.source === selectedId)
    if (!incoming || !outgoing) return
    setEdges((es) => {
      const rest = es.filter((e) => e.source !== selectedId && e.target !== selectedId)
      const bridge: Edge = {
        id: `ed_bridge_${incoming.source}_${outgoing.target}`,
        source: incoming.source,
        target: outgoing.target,
      }
      return [...rest, bridge]
    })
    setNodes((ns) => ns.filter((n) => n.id !== selectedId))
    setSelectedId(null)
  }, [edges, selectedId, selectedNode, setEdges, setNodes])

  const exportJson = useCallback(() => {
    const ui = loadWorkflowUiDefaults()
    const r = compileFlowToScript(team, tools, nodes, edges, {
      scenarioId: ui.scenarioId,
      phaseDurationsSec: ui.phaseDurationsSec,
    })
    if (!r.ok) {
      setMessage(r.error)
      return
    }
    const blob = new Blob([JSON.stringify(r.script, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'team-runtime-script.json'
    a.click()
    URL.revokeObjectURL(a.href)
    setMessage('已导出 JSON')
    setTimeout(() => setMessage(null), 2000)
  }, [edges, nodes, team, tools])

  const openPreview = useCallback(() => {
    const ui = loadWorkflowUiDefaults()
    const r = compileFlowToScript(team, tools, nodes, edges, {
      scenarioId: ui.scenarioId,
      phaseDurationsSec: ui.phaseDurationsSec,
    })
    if (!r.ok) {
      setMessage(r.error)
      return
    }
    const payload = JSON.stringify(r.script)
    try {
      sessionStorage.setItem(TEAM_RUNTIME_SCRIPT_SESSION_KEY, payload)
    } catch {
      setMessage('无法写入 sessionStorage')
      return
    }
    try {
      localStorage.setItem(TEAM_RUNTIME_SCRIPT_HANDOFF_KEY, payload)
    } catch {
      setMessage('无法写入 localStorage（新标签需要此通道传递脚本）')
      return
    }
    window.open('/', '_blank', 'noopener,noreferrer')
  }, [edges, nodes, team, tools])

  return (
    <div className="workflow-app relative flex h-screen w-screen flex-col overflow-hidden bg-[var(--wf-bg-deep)] text-[var(--wf-text)]">
      <div aria-hidden className="workflow-app__aurora" />
      <header className="workflow-app__panel relative z-10 flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Link
            className="text-[var(--wf-text-dim)] text-sm transition-colors hover:text-[var(--wf-text)]"
            href="/"
          >
            ← 返回编辑器
          </Link>
          <h1 className="font-semibold text-base tracking-tight">数字员工工作流</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {message ? (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-amber-200 text-xs">
              {message}
            </span>
          ) : null}
          <Link
            className="workflow-app__btn rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-sm text-[var(--wf-text)] hover:bg-white/10"
            href="/settings/team-workflow"
          >
            全局配置
          </Link>
          <button
            className="workflow-app__btn rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-sm text-[var(--wf-text)] hover:bg-white/10"
            onClick={addEmployeeNode}
            type="button"
          >
            添加员工节点
          </button>
          <button
            className="workflow-app__btn rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-sm text-[var(--wf-text)] hover:bg-white/10"
            onClick={exportJson}
            type="button"
          >
            导出脚本
          </button>
          <button
            className="workflow-app__btn workflow-app__btn--primary rounded-full border border-white/15 px-3.5 py-1.5 text-sm text-white"
            onClick={openPreview}
            type="button"
          >
            在 3D 场景预览
          </button>
        </div>
      </header>
      <div className="relative z-10 flex min-h-0 flex-1">
        <aside className="workflow-app__panel w-[22rem] shrink-0 space-y-4 overflow-y-auto border-r p-5">
          <section>
            <h2 className="mb-2 font-medium text-[var(--wf-text-dim)] text-xs uppercase tracking-wide">
              团队
            </h2>
            <label className="block text-xs text-[var(--wf-text-dim)]" htmlFor="team-name">
              名称
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-2.5 py-1.5 text-sm text-[var(--wf-text)] outline-none transition-[box-shadow,border-color] placeholder:text-[var(--wf-text-dim)] focus:border-[var(--wf-accent-soft)] focus:ring-2 focus:ring-[var(--wf-accent-soft)]"
              id="team-name"
              onChange={(e) => setTeam((t) => ({ ...t, name: e.target.value }))}
              value={team.name}
            />
            <button
              className="workflow-app__btn mt-2 w-full rounded-full border border-white/12 bg-white/5 py-1.5 text-xs text-[var(--wf-text)] hover:bg-white/10"
              onClick={persistTeam}
              type="button"
            >
              保存团队到本地
            </button>
          </section>
          <section>
            <h2 className="mb-2 font-medium text-[var(--wf-text-dim)] text-xs uppercase tracking-wide">
              成员库
            </h2>
            <ul className="space-y-3">
              {team.employees.map((emp) => (
                <li
                  className="wf-member-card rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm backdrop-blur-md transition-colors hover:bg-white/[0.08]"
                  key={emp.id}
                >
                  <div className="font-semibold text-[0.95rem] text-[var(--wf-text)]">
                    {emp.displayName}
                  </div>
                  <div className="mt-0.5 text-[var(--wf-text-dim)] text-xs">
                    {emp.title || '成员'}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(emp.toolIds ?? []).length ? (
                      (emp.toolIds ?? []).map((id) => {
                        const ref = tools.find((x) => x.id === id)
                        const vis = resolveToolVisual(id, ref?.iconKey)
                        const Icon = workflowToolIconFor(id, ref?.iconKey)
                        return (
                          <span
                            className="wf-tool-chip wf-tool-chip--large wf-tool-chip--with-icon"
                            key={id}
                            style={{ '--wf-chip': vis.color } as CSSProperties}
                            title={ref?.name ?? id}
                          >
                            <Icon
                              aria-hidden
                              className="wf-tool-chip__ico"
                              size={14}
                              strokeWidth={2.25}
                            />
                          </span>
                        )
                      })
                    ) : (
                      <span className="wf-tool-chip wf-tool-chip--empty wf-tool-chip--large">
                        未配置工具
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          {selectedEmployeeData && selectedNode ? (
            <section>
              <h2 className="mb-2 font-medium text-[var(--wf-text-dim)] text-xs uppercase tracking-wide">
                选中节点
              </h2>
              <label className="text-xs text-[var(--wf-text-dim)]">绑定员工</label>
              <select
                className="mt-1 w-full cursor-pointer rounded-xl border border-white/10 bg-black/25 px-2 py-1.5 text-sm text-[var(--wf-text)] outline-none focus:border-[var(--wf-accent-soft)] focus:ring-2 focus:ring-[var(--wf-accent-soft)]"
                onChange={(e) => {
                  const v = e.target.value
                  setNodes((ns) =>
                    ns.map((n) =>
                      n.id === selectedId ? { ...n, data: { ...n.data, employeeId: v } } : n,
                    ),
                  )
                }}
                value={selectedEmployeeData.employeeId}
              >
                <option value="">选择…</option>
                {team.employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.displayName}
                  </option>
                ))}
              </select>
              <div className="mt-3 text-xs text-[var(--wf-text-dim)]">
                节点工具（留空则用成员默认）
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {tools.map((t) => {
                  const set = new Set(selectedEmployeeData.toolIds ?? [])
                  const on = set.has(t.id)
                  const vis = resolveToolVisual(t.id, t.iconKey)
                  const Icon = workflowToolIconFor(t.id, t.iconKey)
                  return (
                    <label
                      className="wf-tool-toggle flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-black/20 px-2.5 py-2 text-xs transition-colors hover:bg-white/[0.06]"
                      key={t.id}
                    >
                      <input
                        checked={on}
                        onChange={() => {
                          const next = new Set(selectedEmployeeData.toolIds ?? [])
                          if (next.has(t.id)) next.delete(t.id)
                          else next.add(t.id)
                          setNodes((ns) =>
                            ns.map((n) =>
                              n.id === selectedId
                                ? { ...n, data: { ...n.data, toolIds: [...next] } }
                                : n,
                            ),
                          )
                        }}
                        type="checkbox"
                      />
                      <span
                        className="wf-tool-chip wf-tool-chip--large wf-tool-chip--with-icon shrink-0"
                        style={{ '--wf-chip': vis.color } as CSSProperties}
                      >
                        <Icon
                          aria-hidden
                          className="wf-tool-chip__ico"
                          size={14}
                          strokeWidth={2.25}
                        />
                      </span>
                      <span className="text-[var(--wf-text)]">{t.name}</span>
                    </label>
                  )
                })}
              </div>
              <button
                className="workflow-app__btn mt-3 w-full rounded-full border border-red-500/35 bg-red-500/10 py-1.5 text-red-200 text-xs hover:bg-red-500/20"
                onClick={removeSelectedEmployeeNode}
                type="button"
              >
                删除此员工节点
              </button>
            </section>
          ) : (
            <p className="text-[var(--wf-text-dim)] text-xs leading-relaxed">
              点击画布中的员工节点以配置绑定与工具覆盖。
            </p>
          )}
        </aside>
        <div className="relative min-h-0 flex-1">
          <WorkflowDiagramCtx.Provider value={{ team, tools }}>
            <ReactFlow
              className="!bg-transparent"
              defaultEdgeOptions={{
                animated: true,
                style: { strokeWidth: 2.25 },
              }}
              edges={edges}
              fitView
              nodes={nodes}
              nodeTypes={nodeTypes}
              onConnect={onConnect}
              onEdgesChange={onEdgesChange}
              onNodesChange={onNodesChange}
              onSelectionChange={onSelectionChange}
              proOptions={{ hideAttribution: true }}
            >
              <svg
                aria-hidden
                className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-visible"
              >
                <defs>
                  <linearGradient id="wfEdgeGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#5ac8fa" />
                    <stop offset="50%" stopColor="#7c8cff" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
              </svg>
              <Background gap={22} size={1.15} />
              <Controls />
              <TidyFlowPanel />
            </ReactFlow>
          </WorkflowDiagramCtx.Provider>
        </div>
      </div>
    </div>
  )
}
