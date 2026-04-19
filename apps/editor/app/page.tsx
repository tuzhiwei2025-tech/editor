'use client'

import {
  Editor,
  loadSceneFromLocalStorage,
  parseTeamRuntimeScript,
  type SceneGraph,
  type SidebarTab,
  TEAM_RUNTIME_SCRIPT_HANDOFF_KEY,
  TEAM_RUNTIME_SCRIPT_SESSION_KEY,
  type TeamRuntimeScript,
  ViewerToolbarLeft,
  ViewerToolbarRight,
} from '@pascal-app/editor'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

/** 无本机存档时默认打开办公演示场景 */
async function loadInitialScene(): Promise<SceneGraph | null> {
  const saved = loadSceneFromLocalStorage()
  if (saved) return saved
  try {
    const res = await fetch('/demos/demo_office.json')
    if (!res.ok) return null
    return (await res.json()) as SceneGraph
  } catch {
    return null
  }
}

const SIDEBAR_TABS: (SidebarTab & { component: React.ComponentType })[] = [
  {
    id: 'site',
    label: '场景',
    component: () => null,
  },
]

export default function Home() {
  const [teamRuntimeScript, setTeamRuntimeScript] = useState<TeamRuntimeScript | null>(null)
  const onLoadScene = useCallback(() => loadInitialScene(), [])

  useEffect(() => {
    try {
      let raw = sessionStorage.getItem(TEAM_RUNTIME_SCRIPT_SESSION_KEY)
      if (!raw) {
        raw = localStorage.getItem(TEAM_RUNTIME_SCRIPT_HANDOFF_KEY)
        if (raw) {
          sessionStorage.setItem(TEAM_RUNTIME_SCRIPT_SESSION_KEY, raw)
          localStorage.removeItem(TEAM_RUNTIME_SCRIPT_HANDOFF_KEY)
        }
      }
      if (!raw) {
        setTeamRuntimeScript(null)
        return
      }
      const parsed = parseTeamRuntimeScript(JSON.parse(raw) as unknown)
      setTeamRuntimeScript(parsed)
    } catch {
      setTeamRuntimeScript(null)
    }
  }, [])

  return (
    <div className="h-screen w-screen">
      <Editor
        layoutVersion="v2"
        onLoad={onLoadScene}
        projectId="local-editor"
        sidebarTabs={SIDEBAR_TABS}
        teamRuntimeScript={teamRuntimeScript}
        viewerToolbarLeft={<ViewerToolbarLeft />}
        viewerToolbarRight={
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex h-8 shrink-0 items-center rounded-xl border border-border bg-background/90 px-2.5 font-medium text-muted-foreground text-xs shadow-2xl backdrop-blur-md transition-colors hover:bg-white/8 hover:text-foreground"
              href="/settings/team-workflow"
            >
              团队全局配置
            </Link>
            <Link
              className="inline-flex h-8 shrink-0 items-center rounded-xl border border-border bg-background/90 px-2.5 font-medium text-muted-foreground text-xs shadow-2xl backdrop-blur-md transition-colors hover:bg-white/8 hover:text-foreground"
              href="/workflow"
            >
              工作流画布
            </Link>
            <ViewerToolbarRight />
          </div>
        }
      />
    </div>
  )
}
