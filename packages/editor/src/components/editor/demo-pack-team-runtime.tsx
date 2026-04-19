'use client'

import { type ItemNode, useScene } from '@pascal-app/core'
import { resolveCdnUrl } from '@pascal-app/viewer'
import { Html } from '@react-three/drei'
import { Clone } from '@react-three/drei/core/Clone'
import { useGLTF } from '@react-three/drei/core/Gltf'
import { useFrame } from '@react-three/fiber'
import { type MutableRefObject, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { Group, Object3D } from 'three'
import { Vector3 } from 'three'
import { clone as cloneSkinnedScene } from 'three/addons/utils/SkeletonUtils.js'
import {
  buildDeskEmployeeSrcDoc,
  buildFactoryBoardSrcDoc,
  buildTeamResultSrcDoc,
  GOGO_MEETING_HOST,
  getEmployeeBubbleContent,
  getGogoPatrolCaption,
  getScriptTimelineParams,
  meetingSpawnForIndex,
  OFFICE_DESKS_LAYOUT,
  type TeamRuntimeScript,
} from '../../lib/team-workflow'
import { LiquidSpeechBubble } from './liquid-speech-bubble'
import '../../styles/liquid-speech-bubble.css'

const ROBOT_GLB = '/items/robot/model.glb'
const GOGO_GLB = '/items/gogo/model.glb'
const ROBOT_FOOT_Y = 0.78
const DESK_ROBOT_SCALE = 0.74
const GOGO_PATROL_FOOT_Y = 1.08 + 0.18
const GOGO_PATROL_SCALE = 1.16
const GOGO_DESK_PATROL_ORDER = [0, 1, 2, 3, 7, 6, 5, 4] as const

function wrap01(v: number) {
  return ((v % 1) + 1) % 1
}

function smoothstep01(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

function findItemIdsByScreenRole(nodes: Record<string, unknown>, role: string): string[] {
  const out: string[] = []
  for (const [id, n] of Object.entries(nodes)) {
    if (!n || typeof n !== 'object') continue
    const node = n as { type?: string; metadata?: { screenRole?: string } }
    if (node.type === 'item' && node.metadata?.screenRole === role) out.push(id)
  }
  return out
}

function findDeskEmployeeScreens(
  nodes: Record<string, unknown>,
): { id: string; deskSlotIndex: number }[] {
  const out: { id: string; deskSlotIndex: number }[] = []
  for (const [id, n] of Object.entries(nodes)) {
    if (!n || typeof n !== 'object') continue
    const node = n as { type?: string; metadata?: { screenRole?: string; deskSlotIndex?: unknown } }
    if (node.type !== 'item' || node.metadata?.screenRole !== 'desk-employee') continue
    const idx = node.metadata?.deskSlotIndex
    if (typeof idx === 'number' && idx >= 0 && idx <= 7) out.push({ id, deskSlotIndex: idx })
  }
  return out.sort((a, b) => a.deskSlotIndex - b.deskSlotIndex)
}

export { getScriptTimelineParams } from '../../lib/team-workflow'

export function applyTeamRuntimeScreens(script: TeamRuntimeScript) {
  const nodes = useScene.getState().nodes
  const { updateNode } = useScene.getState()
  const resultIds = findItemIdsByScreenRole(nodes as Record<string, unknown>, 'team-result')
  const beltIds = findItemIdsByScreenRole(nodes as Record<string, unknown>, 'belt-status')
  const html = buildTeamResultSrcDoc(script)
  const beltHtml = buildFactoryBoardSrcDoc(
    script,
    `节拍正常 · ${script.orderedEmployees.length} 位员工已交付`,
  )
  const patch = (id: string, srcDoc: string) => {
    const raw = nodes[id as keyof typeof nodes]
    if (!raw || (raw as { type?: string }).type !== 'item') return
    const node = raw as ItemNode
    const meta = (node.metadata ?? {}) as Record<string, unknown>
    const prevPreview = (meta.htmlPreview ?? {}) as Record<string, unknown>
    updateNode(id as never, {
      metadata: {
        ...meta,
        htmlPreview: { ...prevPreview, srcDoc },
      } as ItemNode['metadata'],
    })
  }
  for (const id of resultIds) patch(id, html)
  for (const id of beltIds) patch(id, beltHtml)

  for (const { id, deskSlotIndex } of findDeskEmployeeScreens(nodes as Record<string, unknown>)) {
    const raw = nodes[id as keyof typeof nodes]
    if (!raw || (raw as { type?: string }).type !== 'item') continue
    const node = raw as ItemNode
    const meta = (node.metadata ?? {}) as Record<string, unknown>
    const prevPreview = (meta.htmlPreview ?? {}) as Record<string, unknown>
    const srcDoc = buildDeskEmployeeSrcDoc(script, deskSlotIndex)
    const oe = script.orderedEmployees.find((x) => x.deskIndex === deskSlotIndex)
    const emp = oe ? script.team.employees.find((e) => e.id === oe.employeeId) : undefined
    const nextName =
      emp && oe ? `${emp.displayName} · 工位屏` : `工位 ${deskSlotIndex + 1} · 空闲屏`
    updateNode(id as never, {
      name: nextName,
      metadata: {
        ...meta,
        htmlPreview: { ...prevPreview, srcDoc },
      } as ItemNode['metadata'],
    })
  }
}

type PatrolGeom = {
  corners: Vector3[]
  segLens: number[]
  totalLen: number
}

function usePatrolGeometry(): PatrolGeom {
  return useMemo(() => {
    const corners = GOGO_DESK_PATROL_ORDER.map((idx) => {
      const d = OFFICE_DESKS_LAYOUT[idx]!
      return new Vector3(d.tx, GOGO_PATROL_FOOT_Y, d.tz + 1.35)
    })
    const closed = [...corners, corners[0]!]
    const segLens: number[] = []
    let totalLen = 0
    for (let i = 0; i < closed.length - 1; i++) {
      const l = closed[i]!.distanceTo(closed[i + 1]!)
      segLens.push(l)
      totalLen += l
    }
    return { corners: closed, segLens, totalLen }
  }, [])
}

/** 从挂载起算恰好两圈（用于在 `patrolStart` 之后才挂载本组件） */
export function GogoDeskPatrolTwoLaps({
  onComplete,
  script,
  tRef,
}: {
  onComplete?: () => void
  script?: TeamRuntimeScript
  tRef?: MutableRefObject<number>
}) {
  const url = resolveCdnUrl(GOGO_GLB)!
  const { scene } = useGLTF(url) as { scene: Object3D }
  const clone = useMemo(() => cloneSkinnedScene(scene) as Object3D, [scene])
  const groupRef = useRef<Group>(null!)
  const { corners, segLens, totalLen } = usePatrolGeometry()
  const doneRef = useRef(false)
  const t0Ref = useRef<number | null>(null)
  const speed = 1.55
  const [patrolCaption, setPatrolCaption] = useState('')
  const lastPatrolRef = useRef('')

  useFrame(({ clock }) => {
    if (!groupRef.current || totalLen < 1e-4) return
    if (t0Ref.current === null) t0Ref.current = clock.elapsedTime
    const maxDist = totalLen * 2
    let dist = (clock.elapsedTime - t0Ref.current) * speed
    if (dist >= maxDist) {
      dist = maxDist
      if (!doneRef.current) {
        doneRef.current = true
        onComplete?.()
      }
    }
    let d = dist
    let seg = 0
    while (seg < segLens.length && d >= segLens[seg]!) {
      d -= segLens[seg]!
      seg++
    }
    const a = corners[seg]!
    const b = corners[seg + 1]!
    const sl = segLens[seg]!
    const t = sl > 1e-6 ? d / sl : 0
    const p = groupRef.current.position
    p.lerpVectors(a, b, t)
    const dx = b.x - a.x
    const dz = b.z - a.z
    if (Math.hypot(dx, dz) > 0.02) {
      groupRef.current.rotation.y = Math.atan2(dx, dz)
    }

    if (script && tRef) {
      const tl = getScriptTimelineParams(script)
      const line = getGogoPatrolCaption(script, tRef.current, tl) ?? ''
      if (line !== lastPatrolRef.current) {
        lastPatrolRef.current = line
        setPatrolCaption(line)
      }
    }
  })

  return (
    <group ref={groupRef} position={corners[0]!.clone()}>
      <Clone object={clone} isChild scale={GOGO_PATROL_SCALE} />
      {script && tRef && patrolCaption ? (
        <Html center distanceFactor={9} position={[0, 2.05, 0]} style={{ pointerEvents: 'none' }}>
          <LiquidSpeechBubble variant="gogo" body={patrolCaption} />
        </Html>
      ) : null}
    </group>
  )
}

type ScriptedRobotProps = {
  script: TeamRuntimeScript
  deskIndex: number
  scriptIndex: number
  totalN: number
  tx: number
  tz: number
  tRef: React.MutableRefObject<number>
  Tmeet: number
  Twalk: number
  Twork: number
  stagger: number
}

function ScriptedDeskRobot({
  script,
  deskIndex,
  scriptIndex,
  totalN,
  tx,
  tz,
  tRef,
  Tmeet,
  Twalk,
  Twork,
  stagger,
}: ScriptedRobotProps) {
  const url = resolveCdnUrl(ROBOT_GLB)!
  const { scene } = useGLTF(url) as { scene: Object3D }
  const clone = useMemo(() => cloneSkinnedScene(scene) as Object3D, [scene])
  const groupRef = useRef<Group>(null!)
  const chairZ = tz + 1.35
  const side = deskIndex % 2 === 0 ? 1 : -1
  const vStart = useMemo(
    () => new Vector3(tx + side * 0.94, ROBOT_FOOT_Y, tz + 2.62),
    [tx, tz, side],
  )
  const vStandChair = useMemo(() => new Vector3(tx, ROBOT_FOOT_Y, chairZ), [tx, chairZ])
  const vSitChair = useMemo(() => new Vector3(tx, ROBOT_FOOT_Y - 0.32, chairZ), [tx, chairZ])
  const spawn = useMemo(() => {
    const s = meetingSpawnForIndex(scriptIndex, totalN)
    return new Vector3(s.x, ROBOT_FOOT_Y, s.z)
  }, [scriptIndex, totalN])

  const oe = script.orderedEmployees[scriptIndex]!
  const emp = script.team.employees.find((e) => e.id === oe.employeeId)
  const toolIds = oe.toolIds.length ? oe.toolIds : (emp?.toolIds ?? [])
  const toolNames = toolIds.map((id) => script.tools.find((x) => x.id === id)?.name ?? id)
  const toolFooter = toolNames.join(' · ') || '—'
  const tlParams = useMemo(() => getScriptTimelineParams(script), [script])
  const bubbleSnap = useRef(getEmployeeBubbleContent(script, tRef.current, tlParams, scriptIndex))
  const [, setBubbleTick] = useState(0)

  useEffect(() => {
    bubbleSnap.current = getEmployeeBubbleContent(script, tRef.current, tlParams, scriptIndex)
    setBubbleTick((x) => x + 1)
  }, [script, scriptIndex, tlParams, tRef])

  const t0 = Tmeet + scriptIndex * stagger
  const tWalkEnd = t0 + Twalk
  const workEnd = tWalkEnd + Twork
  const cycleSec = 16 + deskIndex * 0.4
  const phaseOff = deskIndex * 1.1

  useFrame(() => {
    if (!groupRef.current) return
    const t = tRef.current
    const p = groupRef.current.position

    const nextBubble = getEmployeeBubbleContent(script, t, tlParams, scriptIndex)
    const b = bubbleSnap.current
    if (b.headline !== nextBubble.headline || b.body !== nextBubble.body) {
      bubbleSnap.current = nextBubble
      setBubbleTick((x) => x + 1)
    }

    if (t < Tmeet) {
      p.copy(spawn)
      const cx = GOGO_MEETING_HOST.x
      const cz = GOGO_MEETING_HOST.z
      groupRef.current.rotation.y = Math.atan2(cx - spawn.x, cz - spawn.z)
      return
    }

    if (t < tWalkEnd) {
      const u = smoothstep01((t - t0) / Twalk)
      p.lerpVectors(spawn, vStart, u)
      groupRef.current.rotation.set(0, Math.atan2(vStart.x - spawn.x, vStart.z - spawn.z), 0)
      return
    }

    if (t >= workEnd) {
      p.copy(vStandChair)
      groupRef.current.rotation.set(0, Math.PI, 0)
      return
    }

    const u = wrap01((t - tWalkEnd + phaseOff) / cycleSec)
    if (u < 0.38) {
      const pathT = smoothstep01(u / 0.38)
      p.lerpVectors(vStart, vStandChair, pathT)
      groupRef.current.rotation.set(
        0,
        Math.atan2(vStandChair.x - vStart.x, vStandChair.z - vStart.z),
        0,
      )
    } else if (u < 0.48) {
      const tt = smoothstep01((u - 0.38) / 0.1)
      p.lerpVectors(vStandChair, vSitChair, tt)
      groupRef.current.rotation.set(0, Math.PI, 0)
    } else if (u < 0.64) {
      p.copy(vSitChair)
      groupRef.current.rotation.set(0, Math.PI, 0)
    } else if (u < 0.74) {
      const tt = smoothstep01((u - 0.64) / 0.1)
      p.lerpVectors(vSitChair, vStandChair, tt)
      groupRef.current.rotation.set(0, Math.PI, 0)
    } else {
      const pathT = smoothstep01((u - 0.74) / 0.26)
      p.lerpVectors(vStandChair, vStart, pathT)
      groupRef.current.rotation.set(
        0,
        Math.atan2(vStart.x - vStandChair.x, vStart.z - vStandChair.z),
        0,
      )
    }
  })

  const snap = bubbleSnap.current
  return (
    <group ref={groupRef}>
      <Clone object={clone} isChild scale={DESK_ROBOT_SCALE} />
      <Html center distanceFactor={8} position={[0, 1.22, 0]} style={{ pointerEvents: 'none' }}>
        <LiquidSpeechBubble
          body={snap.body}
          footer={`工具 · ${toolFooter}`}
          headline={snap.headline}
          variant="employee"
        />
      </Html>
    </group>
  )
}

function PatrolMountController({
  patrolStart,
  tRef,
  onPatrolComplete,
  script,
}: {
  patrolStart: number
  tRef: MutableRefObject<number>
  onPatrolComplete?: () => void
  script: TeamRuntimeScript
}) {
  const [mounted, setMounted] = useState(false)
  useFrame(() => {
    if (!mounted && tRef.current >= patrolStart) setMounted(true)
  })
  if (!mounted) return null
  return <GogoDeskPatrolTwoLaps onComplete={onPatrolComplete} script={script} tRef={tRef} />
}

export function DemoPackTeamRuntimeBand({
  script,
  tRef,
  onPatrolComplete,
}: {
  script: TeamRuntimeScript
  tRef: React.MutableRefObject<number>
  onPatrolComplete?: () => void
}) {
  const { Tmeet, Twalk, Twork, stagger, patrolStart, n } = getScriptTimelineParams(script)

  return (
    <Suspense fallback={null}>
      {script.orderedEmployees.map((oe, scriptIndex) => {
        const d = OFFICE_DESKS_LAYOUT[oe.deskIndex]
        if (!d) return null
        return (
          <ScriptedDeskRobot
            key={`sr-${oe.employeeId}-${oe.deskIndex}`}
            Tmeet={Tmeet}
            Twalk={Twalk}
            Twork={Twork}
            deskIndex={oe.deskIndex}
            script={script}
            scriptIndex={scriptIndex}
            stagger={stagger}
            tRef={tRef}
            totalN={n}
            tx={d.tx}
            tz={d.tz}
          />
        )
      })}
      <PatrolMountController
        onPatrolComplete={onPatrolComplete}
        patrolStart={patrolStart}
        script={script}
        tRef={tRef}
      />
    </Suspense>
  )
}
