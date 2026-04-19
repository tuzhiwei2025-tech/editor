'use client'

import '../../workflow/workflow-editor.css'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  loadWorkflowUiDefaults,
  saveWorkflowUiDefaults,
  WORKFLOW_UI_DEFAULTS_FALLBACK,
  type WorkflowUiDefaults,
} from '@/lib/workflow-ui-defaults'

export default function TeamWorkflowSettingsPage() {
  const [form, setForm] = useState<WorkflowUiDefaults>(WORKFLOW_UI_DEFAULTS_FALLBACK)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(loadWorkflowUiDefaults())
  }, [])

  const persist = useCallback(() => {
    saveWorkflowUiDefaults(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [form])

  const setPhase = (key: keyof WorkflowUiDefaults['phaseDurationsSec'], v: number) => {
    setForm((f) => ({
      ...f,
      phaseDurationsSec: { ...f.phaseDurationsSec, [key]: Number.isFinite(v) && v > 0 ? v : 1 },
    }))
  }

  return (
    <div className="workflow-app relative min-h-screen w-full overflow-auto bg-[var(--wf-bg-deep)] text-[var(--wf-text)]">
      <div aria-hidden className="workflow-app__aurora fixed inset-0" />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-semibold text-xl tracking-tight">团队工作流 · 全局配置</h1>
            <p className="mt-1 max-w-xl text-[var(--wf-text-dim)] text-sm leading-relaxed">
              此处保存的「场景」与「阶段时长」会在工作流画布导出、3D
              预览时写入运行脚本。编排节点请前往工作流页面。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="workflow-app__btn rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-sm text-[var(--wf-text)] hover:bg-white/10"
              href="/"
            >
              返回编辑器
            </Link>
            <Link
              className="workflow-app__btn workflow-app__btn--primary rounded-full border border-white/15 px-3.5 py-1.5 text-sm text-white"
              href="/workflow"
            >
              打开工作流画布
            </Link>
          </div>
        </header>

        <div className="workflow-app__panel space-y-6 rounded-3xl border p-6 shadow-xl">
          <section>
            <h2 className="mb-3 font-medium text-[var(--wf-text-dim)] text-xs uppercase tracking-wide">
              叙事场景
            </h2>
            <label className="text-xs text-[var(--wf-text-dim)]" htmlFor="scenario-id">
              scenarioId
            </label>
            <select
              className="mt-1 w-full cursor-pointer rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-[var(--wf-text)] outline-none focus:border-[var(--wf-accent-soft)] focus:ring-2 focus:ring-[var(--wf-accent-soft)]"
              id="scenario-id"
              onChange={(e) => setForm((f) => ({ ...f, scenarioId: e.target.value }))}
              value={form.scenarioId}
            >
              <option value="software-dev">软件开发协作（默认）</option>
            </select>
          </section>

          <section>
            <h2 className="mb-3 font-medium text-[var(--wf-text-dim)] text-xs uppercase tracking-wide">
              阶段时长（秒）
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ['meeting', '站会 / 指挥'],
                  ['walkToDesk', '回工位'],
                  ['work', '集中开发'],
                  ['gogoPatrol', '巡查节拍'],
                  ['resultHold', '大屏停留'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-[var(--wf-text-dim)]" htmlFor={`ph-${key}`}>
                    {label}
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-[var(--wf-text)] outline-none focus:border-[var(--wf-accent-soft)] focus:ring-2 focus:ring-[var(--wf-accent-soft)]"
                    id={`ph-${key}`}
                    min={0.5}
                    onChange={(e) => setPhase(key, Number(e.target.value))}
                    step={0.1}
                    type="number"
                    value={form.phaseDurationsSec[key]}
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3 border-white/10 border-t pt-2">
            <button
              className="workflow-app__btn workflow-app__btn--primary rounded-full border border-white/15 px-5 py-2 text-sm text-white"
              onClick={persist}
              type="button"
            >
              保存到本机
            </button>
            <button
              className="workflow-app__btn rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-[var(--wf-text)] hover:bg-white/10"
              onClick={() => setForm(WORKFLOW_UI_DEFAULTS_FALLBACK)}
              type="button"
            >
              恢复默认
            </button>
            {saved ? <span className="text-[var(--wf-mint)] text-xs">已保存</span> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
