import type { TeamRuntimeScript } from '@pascal-app/editor'

const STORAGE_KEY = 'pascal:workflow-ui-defaults:v1'

export type WorkflowUiDefaults = {
  scenarioId: string
  phaseDurationsSec: NonNullable<TeamRuntimeScript['phaseDurationsSec']>
}

export const WORKFLOW_UI_DEFAULTS_FALLBACK: WorkflowUiDefaults = {
  scenarioId: 'software-dev',
  phaseDurationsSec: {
    meeting: 2.5,
    walkToDesk: 4.2,
    work: 14,
    gogoPatrol: 8,
    resultHold: 6,
  },
}

export function loadWorkflowUiDefaults(): WorkflowUiDefaults {
  if (typeof window === 'undefined') return WORKFLOW_UI_DEFAULTS_FALLBACK
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return WORKFLOW_UI_DEFAULTS_FALLBACK
    const p = JSON.parse(raw) as Partial<WorkflowUiDefaults>
    return {
      scenarioId:
        typeof p.scenarioId === 'string' ? p.scenarioId : WORKFLOW_UI_DEFAULTS_FALLBACK.scenarioId,
      phaseDurationsSec: {
        ...WORKFLOW_UI_DEFAULTS_FALLBACK.phaseDurationsSec,
        ...(p.phaseDurationsSec ?? {}),
      },
    }
  } catch {
    return WORKFLOW_UI_DEFAULTS_FALLBACK
  }
}

export function saveWorkflowUiDefaults(next: WorkflowUiDefaults) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}
