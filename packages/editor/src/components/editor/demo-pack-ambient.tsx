'use client'

import { useScene } from '@pascal-app/core'
import { resolveCdnUrl } from '@pascal-app/viewer'
import { Html } from '@react-three/drei'
import { Clone } from '@react-three/drei/core/Clone'
import { useGLTF } from '@react-three/drei/core/Gltf'
import { useFrame } from '@react-three/fiber'
import {
  type MutableRefObject,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Group, Object3D } from 'three'
import { Color, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { clone as cloneSkinnedScene } from 'three/addons/utils/SkeletonUtils.js'
import {
  getGogoMeetingCaption,
  resolveToolVisual,
  type TeamRuntimeScript,
} from '../../lib/team-workflow'
import {
  applyTeamRuntimeScreens,
  DemoPackTeamRuntimeBand,
  getScriptTimelineParams,
} from './demo-pack-team-runtime'
import { LiquidSpeechBubble } from './liquid-speech-bubble'
import '../../styles/liquid-speech-bubble.css'

/** Must match `metadata.demoPack` on the demo building in `demo_digital_office_factory.json`. */
const DEMO_PACK = 'digital-office-factory'

const ROBOT_GLB = '/items/robot/model.glb'
const GOGO_GLB = '/items/gogo/model.glb'

/** 与 scripts/generate-digital-office-demo.mjs 中 OFFICE_DESKS 一致 */
const OFFICE_DESKS = [
  { tx: 1, tz: 1.4, toward: 'south' as const },
  { tx: 4.5, tz: 1.4, toward: 'south' as const },
  { tx: 8, tz: 1.4, toward: 'south' as const },
  { tx: 11.5, tz: 1.4, toward: 'south' as const },
  { tx: 1, tz: 5.2, toward: 'south' as const },
  { tx: 4.5, tz: 5.2, toward: 'south' as const },
  { tx: 8, tz: 5.2, toward: 'south' as const },
  { tx: 11.5, tz: 5.2, toward: 'south' as const },
]

/** 工位小机器人、产线侧机器人脚底（与 GLB 接地面一致） */
const ROBOT_FOOT_Y = 0.78

/** GoGo 脚底（地面站立） */
const GOGO_FOOT_Y = 1.08

const GOGO_SCALE = 1.02
const GOGO_CMD_SCALE = 1.08
const GOGO_HOST_SCALE = 1.02

/** 工位外圈巡逻：再高一层 + 大号 */
const GOGO_PATROL_FOOT_Y = GOGO_FOOT_Y + 0.18
const GOGO_PATROL_SCALE = 1.16

/** 皮带承载面 Y（与 belt mesh position 一致） */
const BELT_PLANE_Y = 0.055
/** 站在皮带面上的 GoGo 脚底：在承载面之上再抬高，避免脚埋进带面 */
const GOGO_ON_BELT_FOOT_Y = BELT_PLANE_Y + 0.22

/** 沿八个工位外缘闭环：前排 0→3，经转角到后排 7→4，再回到起点 */
const GOGO_DESK_PATROL_ORDER = [0, 1, 2, 3, 7, 6, 5, 4] as const

const DESK_ROBOT_SCALE = 0.74

const BELT_CYCLE_SEC = [34, 38, 32, 40, 36, 42]
const PARCEL_SPIN_RAD_PER_SEC = 0.14
const STRIP_PULSE_HZ = 0.62

/** 同类传送带共用强调色（Apple 系蓝） */
const BELT_EMISSIVE = '#0a84ff'

const PARCEL_COUNT = 16
/** 无工作流脚本时包裹统一基色 */
const PARCEL_IDLE_HEX = '#8e8e93'

type BeltConfig = {
  xCenter: number
  z: number
  length: number
  width: number
  cycleSec: number
  direction: 1 | -1
  emissive: string
}

/**
 * 产线：六层往返式（沿 +X / −X 直行，在左右端 x±L/2 用短 Z 段衔接），
 * 轴对齐、无斜跨、带内建闭环，视觉上不会互相交叉。
 */
const BELTS: BeltConfig[] = [
  {
    xCenter: 30,
    z: 3.95,
    length: 11.6,
    width: 0.64,
    cycleSec: BELT_CYCLE_SEC[0]!,
    direction: 1,
    emissive: BELT_EMISSIVE,
  },
  {
    xCenter: 30,
    z: 5.32,
    length: 11.6,
    width: 0.64,
    cycleSec: BELT_CYCLE_SEC[1]!,
    direction: -1,
    emissive: BELT_EMISSIVE,
  },
  {
    xCenter: 30,
    z: 6.69,
    length: 11.6,
    width: 0.64,
    cycleSec: BELT_CYCLE_SEC[2]!,
    direction: 1,
    emissive: BELT_EMISSIVE,
  },
  {
    xCenter: 30,
    z: 8.06,
    length: 11.6,
    width: 0.64,
    cycleSec: BELT_CYCLE_SEC[3]!,
    direction: -1,
    emissive: BELT_EMISSIVE,
  },
  {
    xCenter: 30,
    z: 9.43,
    length: 11.6,
    width: 0.64,
    cycleSec: BELT_CYCLE_SEC[4]!,
    direction: 1,
    emissive: BELT_EMISSIVE,
  },
  {
    xCenter: 30,
    z: 10.8,
    length: 11.6,
    width: 0.64,
    cycleSec: BELT_CYCLE_SEC[5]!,
    direction: -1,
    emissive: BELT_EMISSIVE,
  },
]

/** 相邻皮带「出端 → 入端」斜向衔接，形成闭环转角 */
type BeltConnector = {
  x: number
  z: number
  len: number
  rotY: number
  width: number
  emissive: string
}

function buildBeltConnectors(belts: BeltConfig[]): BeltConnector[] {
  const n = belts.length
  const out: BeltConnector[] = []
  for (let i = 0; i < n; i++) {
    const a = belts[i]!
    const b = belts[(i + 1) % n]!
    const aExitX = a.direction === 1 ? a.xCenter + a.length / 2 : a.xCenter - a.length / 2
    const bEntryX = b.direction === 1 ? b.xCenter - b.length / 2 : b.xCenter + b.length / 2
    const ax = aExitX
    const az = a.z
    const bx = bEntryX
    const bz = b.z
    const dx = bx - ax
    const dz = bz - az
    const full = Math.hypot(dx, dz)
    if (full < 0.2) continue
    const ux = dx / full
    const uz = dz / full
    const trim = 0.3
    const ax2 = ax + ux * trim
    const az2 = az + uz * trim
    const bx2 = bx - ux * trim
    const bz2 = bz - uz * trim
    const len = Math.max(0.45, Math.hypot(bx2 - ax2, bz2 - az2))
    const midx = (ax2 + bx2) / 2
    const midz = (az2 + bz2) / 2
    const rotY = Math.atan2(bx2 - ax2, bz2 - az2)
    const width = Math.min(a.width, b.width) * 0.95
    out.push({ x: midx, z: midz, len, rotY, width, emissive: a.emissive })
  }
  return out
}

const BELT_CONNECTORS = buildBeltConnectors(BELTS)

/** 沿皮带中心线移动、与 parcel 同一套 U 与周期（脚在带面上方） */
type BeltGogoCfg = {
  beltIndex: number
  phase: number
  scale: number
}

const BELT_GOGO_CFG: BeltGogoCfg[] = [
  { beltIndex: 0, phase: 0.08, scale: 0.98 },
  { beltIndex: 2, phase: 2.15, scale: 0.98 },
  { beltIndex: 4, phase: 4.4, scale: 0.98 },
]

function wrap01(v: number) {
  return ((v % 1) + 1) % 1
}

function stationEasedU(rawU: number) {
  const u = wrap01(rawU)
  const edge = 0.12
  if (u < edge) {
    const t = u / edge
    return t * t * 0.08
  }
  if (u > 1 - edge) {
    const t = (1 - u) / edge
    return 1 - t * t * 0.08
  }
  const mid = (u - edge) / (1 - 2 * edge)
  return 0.08 + mid * 0.84
}

function smoothstep01(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

function useDemoPackActive() {
  return useScene((s) =>
    Object.values(s.nodes).some(
      (n) =>
        n &&
        typeof n === 'object' &&
        (n as { metadata?: { demoPack?: string } }).metadata?.demoPack === DEMO_PACK,
    ),
  )
}

function useDemoPackGltfPreload() {
  useLayoutEffect(() => {
    const r = resolveCdnUrl(ROBOT_GLB)
    const g = resolveCdnUrl(GOGO_GLB)
    if (r) useGLTF.preload(r)
    if (g) useGLTF.preload(g)
  }, [])
}

/** 走向工位椅 → 坐下 → 站起走回：整组平移/旋转，无额外步态层 */
function DeskRobotAnimator({ tx, tz, deskIndex }: { tx: number; tz: number; deskIndex: number }) {
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

  const cycleSec = 20 + (deskIndex % 5) * 1.9 + ((tx + tz) % 5) * 0.08
  const phaseOff = deskIndex * 2.71 + tz * 0.39 + tx * 0.11

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const u = wrap01((clock.elapsedTime + phaseOff) / cycleSec)
    const p = groupRef.current.position

    if (u < 0.38) {
      const pathT = smoothstep01(u / 0.38)
      p.lerpVectors(vStart, vStandChair, pathT)
      groupRef.current.rotation.set(
        0,
        Math.atan2(vStandChair.x - vStart.x, vStandChair.z - vStart.z),
        0,
      )
    } else if (u < 0.48) {
      const t = smoothstep01((u - 0.38) / 0.1)
      p.lerpVectors(vStandChair, vSitChair, t)
      groupRef.current.rotation.set(0, Math.PI, 0)
    } else if (u < 0.64) {
      p.copy(vSitChair)
      groupRef.current.rotation.set(0, Math.PI, 0)
    } else if (u < 0.74) {
      const t = smoothstep01((u - 0.64) / 0.1)
      p.lerpVectors(vSitChair, vStandChair, t)
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

  return (
    <group ref={groupRef}>
      <Clone object={clone} isChild scale={DESK_ROBOT_SCALE} />
    </group>
  )
}

function DemoPackOfficeRobots() {
  return (
    <>
      {OFFICE_DESKS.map((d, i) => (
        <DeskRobotAnimator key={`desk-bot-${d.tx}-${d.tz}`} deskIndex={i} tx={d.tx} tz={d.tz} />
      ))}
    </>
  )
}

function BeltGogoFollower({ cfg }: { cfg: BeltGogoCfg }) {
  const url = resolveCdnUrl(GOGO_GLB)!
  const { scene } = useGLTF(url) as { scene: Object3D }
  const clone = useMemo(() => cloneSkinnedScene(scene) as Object3D, [scene])
  const groupRef = useRef<Group>(null!)

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const belt = BELTS[cfg.beltIndex]
    if (!belt) return
    const halfLen = belt.length / 2
    const minX = belt.xCenter - halfLen
    const t = clock.elapsedTime + cfg.phase
    const rawU = (t / belt.cycleSec) * belt.direction + cfg.phase * 0.04
    const u = stationEasedU(rawU)
    const x = minX + u * belt.length
    const z = belt.z
    const bob = Math.sin(clock.elapsedTime * 5.5 + cfg.phase * 2.1) * 0.012
    groupRef.current.position.set(x, GOGO_ON_BELT_FOOT_Y + bob, z)
    const facePlusX = belt.direction === 1
    groupRef.current.rotation.set(0, facePlusX ? 0 : Math.PI, 0)
  })

  return (
    <group ref={groupRef}>
      <Clone object={clone} isChild scale={cfg.scale} />
    </group>
  )
}

function DemoPackBeltGogos() {
  return (
    <>
      {BELT_GOGO_CFG.map((cfg, i) => (
        <BeltGogoFollower key={`belt-gogo-${cfg.beltIndex}-${i}`} cfg={cfg} />
      ))}
    </>
  )
}

function GogoDeskPerimeterPatrol() {
  const url = resolveCdnUrl(GOGO_GLB)!
  const { scene } = useGLTF(url) as { scene: Object3D }
  const clone = useMemo(() => cloneSkinnedScene(scene) as Object3D, [scene])
  const groupRef = useRef<Group>(null!)

  const { corners, segLens, totalLen } = useMemo(() => {
    const corners = GOGO_DESK_PATROL_ORDER.map((idx) => {
      const d = OFFICE_DESKS[idx]!
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

  useFrame(({ clock }) => {
    if (!groupRef.current || totalLen < 1e-4) return
    const speed = 0.62
    let dist = (clock.elapsedTime * speed) % totalLen
    let seg = 0
    while (seg < segLens.length && dist >= segLens[seg]!) {
      dist -= segLens[seg]!
      seg++
    }
    const a = corners[seg]!
    const b = corners[seg + 1]!
    const sl = segLens[seg]!
    const t = sl > 1e-6 ? dist / sl : 0
    const p = groupRef.current.position
    p.lerpVectors(a, b, t)
    const dx = b.x - a.x
    const dz = b.z - a.z
    if (Math.hypot(dx, dz) > 0.02) {
      groupRef.current.rotation.y = Math.atan2(dx, dz)
    }
  })

  return (
    <group ref={groupRef} position={corners[0]!.clone()}>
      <Clone object={clone} isChild scale={GOGO_PATROL_SCALE} />
    </group>
  )
}

function GogoFactoryCommander() {
  const url = resolveCdnUrl(GOGO_GLB)!
  const { scene } = useGLTF(url) as { scene: Object3D }
  const clone = useMemo(() => cloneSkinnedScene(scene) as Object3D, [scene])
  return (
    <group position={[30, GOGO_FOOT_Y, 7.38]} rotation={[0, -0.9, 0]}>
      <Clone object={clone} isChild scale={GOGO_CMD_SCALE} />
    </group>
  )
}

function GogoMeetingHostSpeech({
  script,
  tRef,
}: {
  script: TeamRuntimeScript
  tRef: MutableRefObject<number>
}) {
  const [line, setLine] = useState('')
  const lastRef = useRef('')
  useFrame(() => {
    const tl = getScriptTimelineParams(script)
    const next = getGogoMeetingCaption(script, tRef.current, tl) ?? ''
    if (next !== lastRef.current) {
      lastRef.current = next
      setLine(next)
    }
  })
  if (!line) return null
  return (
    <Html center distanceFactor={10} position={[0, 2.08, 0]} style={{ pointerEvents: 'none' }}>
      <LiquidSpeechBubble body={line} variant="gogo" />
    </Html>
  )
}

function GogoMeetingHost({
  script,
  tRef,
}: {
  script?: TeamRuntimeScript | null
  tRef?: MutableRefObject<number>
}) {
  const url = resolveCdnUrl(GOGO_GLB)!
  const { scene } = useGLTF(url) as { scene: Object3D }
  const clone = useMemo(() => cloneSkinnedScene(scene) as Object3D, [scene])
  return (
    <group
      position={[10.65, GOGO_FOOT_Y, 13.18]}
      rotation={[0, Math.atan2(9.1 - 10.65, 13.22 - 13.18), 0]}
    >
      <Clone object={clone} isChild scale={GOGO_HOST_SCALE} />
      {script && tRef ? <GogoMeetingHostSpeech script={script} tRef={tRef} /> : null}
    </group>
  )
}

export function DemoPackAmbient({
  teamRuntimeScript,
}: {
  teamRuntimeScript?: TeamRuntimeScript | null
}) {
  const active = useDemoPackActive()
  const root = useRef<Group>(null!)
  const beltRefs = useRef<(Mesh | null)[]>([])
  const beltConnectorRefs = useRef<(Group | null)[]>([])
  const beltRollerRowRefs = useRef<(Group | null)[]>([])
  const parcels = useRef<Mesh[]>([])
  const scriptT0Ref = useRef<number | null>(null)
  const scriptTRef = useRef(0)
  const screensDoneRef = useRef(false)

  useEffect(() => {
    screensDoneRef.current = false
  }, [teamRuntimeScript])

  const onPatrolComplete = useCallback(() => {
    if (!teamRuntimeScript || screensDoneRef.current) return
    screensDoneRef.current = true
    applyTeamRuntimeScreens(teamRuntimeScript)
  }, [teamRuntimeScript])

  useDemoPackGltfPreload()

  useFrame((state) => {
    if (!active || !root.current) return

    const t = state.clock.elapsedTime

    if (teamRuntimeScript) {
      if (scriptT0Ref.current === null) scriptT0Ref.current = state.clock.elapsedTime
      scriptTRef.current = state.clock.elapsedTime - scriptT0Ref.current
    } else {
      scriptT0Ref.current = null
      scriptTRef.current = 0
    }

    BELTS.forEach((belt, beltIdx) => {
      const beltMesh = beltRefs.current[beltIdx]
      const mat = beltMesh?.material
      if (mat && !Array.isArray(mat) && 'emissiveIntensity' in mat) {
        const phase = beltIdx * 1.4
        mat.emissiveIntensity = 0.1 + Math.sin(t * STRIP_PULSE_HZ + phase) * 0.04
      }
    })

    beltConnectorRefs.current.forEach((grp, i) => {
      if (!grp) return
      const phase = i * 1.7 + 0.4
      const pulse = 0.09 + Math.sin(t * STRIP_PULSE_HZ + phase) * 0.035
      grp.traverse((obj) => {
        if (!(obj instanceof Mesh)) return
        const mesh = obj
        const mat = mesh.material
        if (mat && !Array.isArray(mat) && 'emissiveIntensity' in mat) {
          mat.emissiveIntensity = pulse
        }
      })
    })

    const halfLen = (idx: number) => BELTS[idx]!.length / 2
    const minX = (idx: number) => BELTS[idx]!.xCenter - halfLen(idx)

    beltRollerRowRefs.current.forEach((row, beltIdx) => {
      if (!row) return
      const belt = BELTS[beltIdx]!
      const spin = t * (2.05 + beltIdx * 0.12) * belt.direction
      row.children.forEach((ch, k) => {
        const mesh = ch as Mesh
        if (mesh.isMesh) mesh.rotation.x = spin + k * 0.31
      })
    })

    const script = teamRuntimeScript
    const timeline = script ? getScriptTimelineParams(script) : null

    for (let i = 0; i < parcels.current.length; i++) {
      const m = parcels.current[i]
      if (!m) continue
      const beltIdx = i % BELTS.length
      const belt = BELTS[beltIdx]!
      const phase = (i * 0.27) % 1
      const rawU = (t / belt.cycleSec) * belt.direction + phase
      const u = stationEasedU(rawU)
      const x = minX(beltIdx) + u * belt.length
      const bounce = Math.sin(t * 6.2 + i * 0.7) * 0.014
      m.position.set(x, 0.086 + bounce, belt.z)
      m.rotation.y = t * PARCEL_SPIN_RAD_PER_SEC * (belt.direction === 1 ? 1 : -1) + i * 0.35

      const mat = m.material
      if (script && timeline && mat instanceof MeshStandardMaterial) {
        const tw = scriptTRef.current
        const workU = Math.min(1, Math.max(0, (tw - timeline.workStart) / timeline.Twork))
        const toolIdx = i % Math.max(1, script.tools.length)
        const toolRef = script.tools[toolIdx]
        const vis = toolRef
          ? resolveToolVisual(toolRef.id, toolRef.iconKey)
          : { color: PARCEL_IDLE_HEX }
        const c = new Color(vis.color)
        mat.color.copy(c)
        const em = c.clone().multiplyScalar(0.35 + workU * 0.45 + Math.sin(t * 2.4 + i) * 0.08)
        mat.emissive.copy(em)
        mat.emissiveIntensity = 0.22 + workU * 0.35
      } else if (!script && mat instanceof MeshStandardMaterial) {
        const c = new Color(PARCEL_IDLE_HEX)
        mat.color.copy(c)
        mat.emissive.copy(c.clone().multiplyScalar(0.25))
        mat.emissiveIntensity = 0.12
      }
    }
  })

  if (!active) return null

  const rollerSteps = 16

  return (
    <group ref={root} name="demo-pack-ambient">
      {BELTS.map((belt, idx) => (
        <mesh
          key={`belt-${belt.xCenter}-${belt.z}`}
          receiveShadow
          ref={(el: Mesh | null) => {
            beltRefs.current[idx] = el
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[belt.xCenter, 0.055, belt.z]}
        >
          <planeGeometry args={[belt.length, belt.width]} />
          <meshStandardMaterial
            color="#141418"
            emissive={belt.emissive}
            emissiveIntensity={0.12}
            metalness={0.55}
            roughness={0.42}
          />
        </mesh>
      ))}

      {BELT_CONNECTORS.map((c, i) => {
        const floorH = 0.042
        const floorY = 0.055
        const wallH = 0.11
        const wallT = 0.038
        const wallY = floorY + floorH / 2 + wallH / 2
        const w = c.width
        const len = c.len
        const matProps = {
          color: '#141418',
          emissive: BELT_EMISSIVE,
          emissiveIntensity: 0.1,
          metalness: 0.55,
          roughness: 0.42,
        } as const
        return (
          <group
            key={`belt-connector-${i}`}
            ref={(el: Group | null) => {
              beltConnectorRefs.current[i] = el
            }}
            position={[c.x, 0, c.z]}
            rotation={[0, c.rotY, 0]}
          >
            <mesh receiveShadow position={[0, floorY, 0]}>
              <boxGeometry args={[w, floorH, len]} />
              <meshStandardMaterial {...matProps} />
            </mesh>
            <mesh receiveShadow position={[-w / 2 - wallT / 2, wallY, 0]}>
              <boxGeometry args={[wallT, wallH, len]} />
              <meshStandardMaterial {...matProps} />
            </mesh>
            <mesh receiveShadow position={[w / 2 + wallT / 2, wallY, 0]}>
              <boxGeometry args={[wallT, wallH, len]} />
              <meshStandardMaterial {...matProps} />
            </mesh>
          </group>
        )
      })}

      {BELTS.map((belt) => (
        <group key={`belt-frame-${belt.z}`}>
          <mesh position={[belt.xCenter, 0.048, belt.z]} receiveShadow>
            <boxGeometry args={[belt.length + 0.35, 0.024, belt.width + 0.14]} />
            <meshStandardMaterial color="#2c2c2e" metalness={0.4} roughness={0.52} />
          </mesh>
          <mesh position={[belt.xCenter, 0.11, belt.z - belt.width * 0.5 - 0.035]} receiveShadow>
            <boxGeometry args={[belt.length + 0.28, 0.1, 0.04]} />
            <meshStandardMaterial color="#3a3a3c" metalness={0.45} roughness={0.48} />
          </mesh>
          <mesh position={[belt.xCenter, 0.11, belt.z + belt.width * 0.5 + 0.035]} receiveShadow>
            <boxGeometry args={[belt.length + 0.28, 0.1, 0.04]} />
            <meshStandardMaterial color="#3a3a3c" metalness={0.45} roughness={0.48} />
          </mesh>
        </group>
      ))}

      {BELTS.map((belt) => (
        <group key={`rails-${belt.z}`}>
          <mesh position={[belt.xCenter, 0.07, belt.z - belt.width * 0.48]} receiveShadow>
            <boxGeometry args={[belt.length, 0.04, 0.04]} />
            <meshStandardMaterial color="#3a3a3c" metalness={0.35} roughness={0.5} />
          </mesh>
          <mesh position={[belt.xCenter, 0.07, belt.z + belt.width * 0.48]} receiveShadow>
            <boxGeometry args={[belt.length, 0.04, 0.04]} />
            <meshStandardMaterial color="#3a3a3c" metalness={0.35} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {BELTS.map((belt, idx) => (
        <group
          key={`rollers-${belt.z}`}
          ref={(g: Group | null) => {
            beltRollerRowRefs.current[idx] = g
          }}
        >
          {Array.from({ length: rollerSteps }, (_, k) => {
            const lx = belt.xCenter - belt.length / 2 + (k / (rollerSteps - 1)) * belt.length
            return (
              <mesh castShadow key={`r-${belt.z}-${k}`} position={[lx, 0.11, belt.z]}>
                <boxGeometry args={[0.14, 0.088, belt.width * 0.9]} />
                <meshStandardMaterial color="#636366" metalness={0.55} roughness={0.32} />
              </mesh>
            )
          })}
        </group>
      ))}

      <mesh receiveShadow position={[30, 0.06, 7.38]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <planeGeometry args={[2.2, 2.2]} />
        <meshStandardMaterial
          color="#2c2c2e"
          emissive={BELT_EMISSIVE}
          emissiveIntensity={0.05}
          metalness={0.55}
          roughness={0.4}
        />
      </mesh>

      {Array.from({ length: PARCEL_COUNT }, (_, i) => (
        <mesh
          castShadow
          key={`p-${i}`}
          ref={(el: Mesh | null) => {
            if (el) parcels.current[i] = el
          }}
        >
          <boxGeometry args={[0.32, 0.2, 0.26]} />
          <meshStandardMaterial
            color={PARCEL_IDLE_HEX}
            emissive={PARCEL_IDLE_HEX}
            emissiveIntensity={0.08}
            metalness={0.18}
            roughness={0.48}
          />
        </mesh>
      ))}

      <Suspense fallback={null}>
        {teamRuntimeScript ? (
          <DemoPackTeamRuntimeBand
            onPatrolComplete={onPatrolComplete}
            script={teamRuntimeScript}
            tRef={scriptTRef}
          />
        ) : (
          <DemoPackOfficeRobots />
        )}
        <DemoPackBeltGogos />
        {!teamRuntimeScript ? <GogoDeskPerimeterPatrol key="gogo-desk-loop" /> : null}
        <GogoFactoryCommander />
        <GogoMeetingHost script={teamRuntimeScript ?? null} tRef={scriptTRef} />
      </Suspense>
    </group>
  )
}
