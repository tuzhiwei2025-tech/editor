'use client'

import {
  type AnyNodeId,
  type ItemNode,
  sceneRegistry,
  useScene,
} from '@pascal-app/core'
import { Html } from '@react-three/drei'
import { createPortal, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import { Euler, type Object3D, Vector3 } from 'three'
import { useShallow } from 'zustand/react/shallow'

export type ItemHtmlPreviewMeta = {
  src?: string
  srcDoc?: string
  variant?: 'desk' | 'wall'
  /**
   * 相对 GLB 根（在应用 `asset.rotation` 之前）的屏幕中心偏移，单位米。
   * 不填则使用内置的 per-asset 预设，使画面对齐常见显示器几何。
   */
  screenOffset?: [number, number, number]
  /** 叠在 `asset.rotation` 之上的额外欧拉角（弧度），用于微调俯仰/朝向 */
  screenRotation?: [number, number, number]
  /** iframe 像素宽高，覆盖预设 */
  sizePx?: [number, number]
  /** 覆盖 drei Html 的 distanceFactor */
  distanceFactor?: number
  /** 水平翻转 iframe 内容（修正墙挂电视从背面看时文字镜像） */
  flipContentX?: boolean
}

type ScreenPreset = {
  /** 屏幕中心在模型局部空间中的位置（再经 asset.rotation 旋到与 Clone 一致） */
  rel: [number, number, number]
  /** 相对模型“竖直屏”的额外欧拉角（弧度），叠在 asset.rotation 上 */
  rot: [number, number, number]
  sizePx: [number, number]
  distanceFactor: number
}

/** 与 catalog 中 computer / television 模型大致对齐；可按实际 GLB 再调 */
const PRESETS: Record<string, { desk?: ScreenPreset; wall?: ScreenPreset }> = {
  computer: {
    desk: {
      rel: [0.02, 0.42, 0.1],
      rot: [-0.22, 0, 0],
      sizePx: [188, 106],
      distanceFactor: 3.45,
    },
  },
  television: {
    /** 立式 / 台面电视，屏幕法线常与「墙挂」相反，单独一套 */
    desk: {
      rel: [0, 0.42, 0.06],
      rot: [-0.08, 0, 0],
      sizePx: [320, 180],
      distanceFactor: 8,
    },
    wall: {
      rel: [0, 0.5, 0.12],
      /** 常见 GLB 屏幕朝 -Z，与 Html 平面默认朝向差 180° 时用 Y 轴 π 校正 */
      rot: [0, Math.PI, 0],
      /** 与 Html 的 node 级 scale 配合：像素略小，避免大屏上画面比玻璃还大 */
      sizePx: [360, 203],
      distanceFactor: 6.4,
    },
  },
}

const FALLBACK_DESK: ScreenPreset = {
  rel: [0, 0.38, 0.08],
  rot: [-0.18, 0, 0],
  sizePx: [200, 112],
  distanceFactor: 3.8,
}

const FALLBACK_WALL: ScreenPreset = {
  rel: [0, 0.45, 0.1],
  rot: [0, Math.PI, 0],
  sizePx: [360, 203],
  distanceFactor: 6.4,
}

function multiplyScales(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]
}

function cloneScale(node: ItemNode): [number, number, number] {
  return multiplyScales(node.asset.scale ?? [1, 1, 1], node.scale ?? [1, 1, 1])
}

function readPreview(node: ItemNode): ItemHtmlPreviewMeta | null {
  const raw = node.metadata as { htmlPreview?: ItemHtmlPreviewMeta } | undefined
  const p = raw?.htmlPreview
  if (!p || (!p.src && !p.srcDoc)) return null
  return p
}

function getPreset(assetId: string, variant: 'desk' | 'wall'): ScreenPreset {
  const row = PRESETS[assetId]
  const p = variant === 'wall' ? row?.wall : row?.desk
  return p ?? (variant === 'wall' ? FALLBACK_WALL : FALLBACK_DESK)
}

/**
 * 屏幕中心在物品根 group 局部坐标中的位置（与 ItemRenderer 里 Clone 一致：
 * offset + R(asset) * (cloneScale ⊙ rel)）
 */
function screenPositionWorldInItemRoot(node: ItemNode, rel: [number, number, number]): [number, number, number] {
  const [sx, sy, sz] = cloneScale(node)
  const v = new Vector3(rel[0] * sx, rel[1] * sy, rel[2] * sz)
  const [rx, ry, rz] = node.asset.rotation
  v.applyEuler(new Euler(rx, ry, rz, 'XYZ'))
  const [ox, oy, oz] = node.asset.offset
  return [ox + v.x, oy + v.y, oz + v.z]
}

function screenEuler(node: ItemNode, extra: [number, number, number]): Euler {
  const [rx, ry, rz] = node.asset.rotation
  return new Euler(rx + extra[0], ry + extra[1], rz + extra[2], 'XYZ')
}

function scaleAverage(node: ItemNode) {
  const [sx, sy, sz] = node.scale
  return (sx + sy + sz) / 3
}

function computeLayout(node: ItemNode, meta: ItemHtmlPreviewMeta) {
  const variant = meta.variant === 'wall' ? 'wall' : 'desk'
  const preset = getPreset(node.asset.id, variant)
  const rel = meta.screenOffset ?? preset.rel
  const rotExtra = meta.screenRotation ?? preset.rot
  const position = screenPositionWorldInItemRoot(node, rel)
  const rotation = screenEuler(node, rotExtra)
  const s = scaleAverage(node)
  const sizeBase = meta.sizePx ?? preset.sizePx
  /** 墙挂：Html 已与 Clone 同 scale，不再放大像素框，避免画面大于玻璃 */
  const sizeScale =
    variant === 'wall' ? 1 : Math.min(1.2, 0.9 + 0.08 * s)
  const width = Math.round(sizeBase[0] * sizeScale)
  const height = Math.round(sizeBase[1] * sizeScale)
  const distanceFactor = meta.distanceFactor ?? preset.distanceFactor
  return { position, rotation, width, height, distanceFactor, variant }
}

export function ItemHtmlPreviewSystem() {
  const nodeIds = useScene(
    useShallow((state) =>
      Object.values(state.nodes)
        .filter((n): n is ItemNode => n.type === 'item' && readPreview(n) != null)
        .map((n) => n.id),
    ),
  )

  return (
    <>
      {nodeIds.map((id) => (
        <ItemHtmlPreview key={id} nodeId={id} />
      ))}
    </>
  )
}

function ItemHtmlPreview({ nodeId }: { nodeId: AnyNodeId }) {
  const node = useScene((s) => s.nodes[nodeId] as ItemNode | undefined)
  const meta = node ? readPreview(node) : null
  const [itemObj, setItemObj] = useState<Object3D | null>(null)

  useEffect(() => {
    if (!node) setItemObj(null)
  }, [node])

  useFrame(() => {
    if (!node) {
      if (itemObj !== null) setItemObj(null)
      return
    }
    const obj = sceneRegistry.nodes.get(nodeId) ?? null
    /** 物品重挂载时 registry 会换新 Object3D，必须同步，否则 Html 挂在旧树上会读到坏 matrixWorld */
    if (obj !== itemObj) setItemObj(obj)
  })

  const layout = useMemo(() => {
    if (!(node && meta)) return null
    return computeLayout(node, meta)
  }, [node, meta])

  const iframeKey = useMemo(() => {
    if (!meta) return nodeId
    return `${nodeId}:${meta.src ?? ''}:${(meta.srcDoc ?? '').slice(0, 80)}`
  }, [meta, nodeId])

  if (!(itemObj && meta && node && layout)) return null

  const [sx, sy, sz] = cloneScale(node)

  const glassRadius = layout.variant === 'wall' ? 8 : 5
  const flipX = meta.flipContentX === true

  return createPortal(
    <Html
      center
      distanceFactor={layout.distanceFactor}
      occlude
      position={layout.position}
      rotation={[layout.rotation.x, layout.rotation.y, layout.rotation.z]}
      scale={[sx, sy, sz]}
      transform
      zIndexRange={[30, 0]}
    >
      <div
        style={{
          position: 'relative',
          width: layout.width,
          height: layout.height,
          borderRadius: glassRadius,
          overflow: 'hidden',
          boxShadow:
            '0 10px 36px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(255,255,255,0.06)',
          border: layout.variant === 'wall' ? '1px solid rgba(255,255,255,0.42)' : '1px solid rgba(226,232,240,0.55)',
          isolation: 'isolate',
          background: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'saturate(200%) blur(42px)',
          WebkitBackdropFilter: 'saturate(200%) blur(42px)',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 'inherit',
            transform: flipX ? 'scaleX(-1)' : undefined,
          }}
        >
          <iframe
            className="pointer-events-auto block h-full w-full border-0"
            key={iframeKey}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            src={meta.srcDoc ? undefined : meta.src}
            srcDoc={meta.srcDoc}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 'inherit',
              background: 'transparent',
              mixBlendMode: 'normal',
            }}
            title={node.name ?? 'html-preview'}
          />
        </div>
        <div
          aria-hidden
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background:
              'linear-gradient(165deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.06) 100%)',
            mixBlendMode: 'soft-light',
          }}
        />
        <div
          aria-hidden
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        />
      </div>
    </Html>,
    itemObj,
  )
}
