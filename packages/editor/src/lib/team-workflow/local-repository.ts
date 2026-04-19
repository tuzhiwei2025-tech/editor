import type { TeamDefinition } from './schema'
import { TEAM_WORKFLOW_LS_PREFIX } from './schema'

export type TeamRepository = {
  listTeams: () => TeamDefinition[]
  getTeam: (id: string) => TeamDefinition | null
  saveTeam: (team: TeamDefinition) => void
  deleteTeam: (id: string) => void
}

function teamsKey() {
  return `${TEAM_WORKFLOW_LS_PREFIX}teams`
}

function readRaw(): TeamDefinition[] {
  if (typeof window === 'undefined') return []
  try {
    const s = window.localStorage.getItem(teamsKey())
    if (!s) return []
    const j = JSON.parse(s) as unknown
    if (!Array.isArray(j)) return []
    return j.filter(Boolean) as TeamDefinition[]
  } catch {
    return []
  }
}

function writeRaw(teams: TeamDefinition[]) {
  window.localStorage.setItem(teamsKey(), JSON.stringify(teams))
}

export function createLocalTeamRepository(): TeamRepository {
  return {
    listTeams() {
      return readRaw()
    },
    getTeam(id) {
      return readRaw().find((t) => t.id === id) ?? null
    },
    saveTeam(team) {
      const rest = readRaw().filter((t) => t.id !== team.id)
      writeRaw([...rest, team])
    },
    deleteTeam(id) {
      writeRaw(readRaw().filter((t) => t.id !== id))
    },
  }
}
