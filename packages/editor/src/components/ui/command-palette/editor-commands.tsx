'use client'

import type { AnyNodeId } from '@pascal-app/core'
import { LevelNode, useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import {
  AppWindow,
  ArrowRight,
  Box,
  Building2,
  Camera,
  Copy,
  DoorOpen,
  Eye,
  EyeOff,
  Factory,
  FileJson,
  Grid3X3,
  Hexagon,
  Layers,
  Map,
  Maximize2,
  Minimize2,
  Moon,
  MousePointer2,
  Package,
  PencilLine,
  Plus,
  Redo2,
  Square,
  SquareStack,
  Sun,
  Trash2,
  Undo2,
  Video,
} from 'lucide-react'
import { useEffect } from 'react'
import { deleteLevelWithFallbackSelection } from '../../../lib/level-selection'
import {
  applySceneGraphToEditor,
  saveSceneToLocalStorage,
  type SceneGraph,
} from '../../../lib/scene'
import { useCommandRegistry } from '../../../store/use-command-registry'
import type { StructureTool } from '../../../store/use-editor'
import useEditor from '../../../store/use-editor'
import { useCommandPalette } from './index'

export function EditorCommands() {
  const register = useCommandRegistry((s) => s.register)
  const { navigateTo, setInputValue, setOpen } = useCommandPalette()

  const { setPhase, setMode, setTool, setStructureLayer, isPreviewMode, setPreviewMode } =
    useEditor()

  const exportScene = useViewer((s) => s.exportScene)

  // Re-register when exportScene availability changes (it's a conditional action)
  useEffect(() => {
    const run = (fn: () => void) => {
      fn()
      setOpen(false)
    }

    const runAsync = (fn: () => Promise<void>) => {
      void fn().finally(() => setOpen(false))
    }

    const activateTool = (tool: StructureTool) => {
      run(() => {
        setPhase('structure')
        setMode('build')
        if (tool === 'zone') setStructureLayer('zones')
        setTool(tool)
      })
    }

    return register([
      // ── Scene ────────────────────────────────────────────────────────────
      {
        id: 'editor.tool.wall',
        label: '墙体工具',
        group: '场景',
        icon: <Square className="h-4 w-4" />,
        keywords: ['draw', 'build', 'structure', '墙', '绘制', '结构'],
        execute: () => activateTool('wall'),
      },
      {
        id: 'editor.tool.slab',
        label: '楼板工具',
        group: '场景',
        icon: <Layers className="h-4 w-4" />,
        keywords: ['floor', 'build', '楼板', '地面'],
        execute: () => activateTool('slab'),
      },
      {
        id: 'editor.tool.ceiling',
        label: '天花板工具',
        group: '场景',
        icon: <Grid3X3 className="h-4 w-4" />,
        keywords: ['top', 'build', '天花', '顶'],
        execute: () => activateTool('ceiling'),
      },
      {
        id: 'editor.tool.door',
        label: '门工具',
        group: '场景',
        icon: <DoorOpen className="h-4 w-4" />,
        keywords: ['opening', 'entrance', '门', '入口'],
        execute: () => activateTool('door'),
      },
      {
        id: 'editor.tool.window',
        label: '窗工具',
        group: '场景',
        icon: <AppWindow className="h-4 w-4" />,
        keywords: ['opening', 'glass', '窗', '窗户'],
        execute: () => activateTool('window'),
      },
      {
        id: 'editor.tool.item',
        label: '物品工具',
        group: '场景',
        icon: <Package className="h-4 w-4" />,
        keywords: ['furniture', 'object', 'asset', 'furnish', '家具', '陈设', '物品'],
        execute: () => activateTool('item'),
      },
      {
        id: 'editor.demo.digital-office-factory',
        label: '加载演示：数字办公与流水线工厂',
        group: '场景',
        icon: <Factory className="h-4 w-4" />,
        keywords: [
          'demo',
          'sample',
          'office',
          'factory',
          'pipeline',
          'collab',
          '协同',
          '办公',
          '工厂',
          '产线',
          '演示',
        ],
        execute: () =>
          runAsync(async () => {
            const res = await fetch('/demos/demo_office.json')
            if (!res.ok) {
              console.error('[Editor] Failed to load demo scene', res.status)
              return
            }
            const graph = (await res.json()) as SceneGraph
            applySceneGraphToEditor(graph)
            saveSceneToLocalStorage(graph)
          }),
      },
      {
        id: 'editor.tool.stair',
        label: '楼梯工具',
        group: '场景',
        icon: <ArrowRight className="h-4 w-4" />,
        keywords: ['stairs', 'staircase', 'flight', 'landing', 'steps', '楼梯', '梯'],
        execute: () => activateTool('stair'),
      },
      {
        id: 'editor.tool.zone',
        label: '分区工具',
        group: '场景',
        icon: <Hexagon className="h-4 w-4" />,
        keywords: ['area', 'room', 'space', '分区', '区域'],
        execute: () => activateTool('zone'),
      },
      {
        id: 'editor.delete-selection',
        label: '删除选中',
        group: '场景',
        icon: <Trash2 className="h-4 w-4" />,
        keywords: ['remove', 'erase', '删除'],
        shortcut: ['⌫'],
        when: () => useViewer.getState().selection.selectedIds.length > 0,
        execute: () =>
          run(() => {
            const { selectedIds } = useViewer.getState().selection
            useScene.getState().deleteNodes(selectedIds as any[])
          }),
      },

      // ── Levels ───────────────────────────────────────────────────────────
      {
        id: 'editor.level.goto',
        label: '前往楼层',
        group: '楼层',
        icon: <ArrowRight className="h-4 w-4" />,
        keywords: ['level', 'floor', 'go', 'navigate', 'switch', 'select', '楼层', '切换'],
        navigate: true,
        when: () => Object.values(useScene.getState().nodes).some((n) => n.type === 'level'),
        execute: () => navigateTo('goto-level'),
      },
      {
        id: 'editor.level.add',
        label: '添加楼层',
        group: '楼层',
        icon: <Plus className="h-4 w-4" />,
        keywords: ['level', 'floor', 'add', 'create', 'new', '新建', '添加'],
        execute: () =>
          run(() => {
            const { nodes } = useScene.getState()
            const building = Object.values(nodes).find((n) => n.type === 'building')
            if (!building) return
            const newLevel = LevelNode.parse({
              level: building.children.length,
              children: [],
              parentId: building.id,
            })
            useScene.getState().createNode(newLevel, building.id)
            useViewer.getState().setSelection({ levelId: newLevel.id })
          }),
      },
      {
        id: 'editor.level.rename',
        label: '重命名楼层',
        group: '楼层',
        icon: <PencilLine className="h-4 w-4" />,
        keywords: ['level', 'floor', 'rename', 'name', '重命名'],
        navigate: true,
        when: () => !!useViewer.getState().selection.levelId,
        execute: () => {
          const activeLevelId = useViewer.getState().selection.levelId
          if (!activeLevelId) return
          const level = useScene.getState().nodes[activeLevelId as AnyNodeId] as LevelNode
          setInputValue(level?.name ?? '')
          navigateTo('rename-level')
        },
      },
      {
        id: 'editor.level.delete',
        label: '删除楼层',
        group: '楼层',
        icon: <Trash2 className="h-4 w-4" />,
        keywords: ['level', 'floor', 'delete', 'remove', '删除'],
        when: () => {
          const levelId = useViewer.getState().selection.levelId
          if (!levelId) return false
          const node = useScene.getState().nodes[levelId as AnyNodeId] as LevelNode
          return node?.type === 'level' && node.level !== 0
        },
        execute: () =>
          run(() => {
            const activeLevelId = useViewer.getState().selection.levelId
            if (!activeLevelId) return
            deleteLevelWithFallbackSelection(activeLevelId as AnyNodeId)
          }),
      },

      // ── Viewer Controls ──────────────────────────────────────────────────
      {
        id: 'editor.viewer.wall-mode',
        label: '墙体显示模式',
        group: '视图控制',
        icon: <Layers className="h-4 w-4" />,
        keywords: ['wall', 'cutaway', 'up', 'down', 'view', '墙', '剖切'],
        badge: () => {
          const mode = useViewer.getState().wallMode
          return { cutaway: '剖切', up: '全高', down: '低矮' }[mode]
        },
        navigate: true,
        execute: () => navigateTo('wall-mode'),
      },
      {
        id: 'editor.viewer.level-mode',
        label: '楼层显示模式',
        group: '视图控制',
        icon: <SquareStack className="h-4 w-4" />,
        keywords: ['level', 'floor', 'exploded', 'stacked', 'solo', '楼层', '堆叠'],
        badge: () => {
          const mode = useViewer.getState().levelMode
          return { manual: '手动', stacked: '堆叠', exploded: '分解', solo: '单层' }[mode]
        },
        navigate: true,
        execute: () => navigateTo('level-mode'),
      },
      {
        id: 'editor.viewer.camera-mode',
        label: () => {
          const mode = useViewer.getState().cameraMode
          return `相机：切换为${mode === 'perspective' ? '正交' : '透视'}`
        },
        group: '视图控制',
        icon: <Video className="h-4 w-4" />,
        keywords: ['camera', 'ortho', 'perspective', '2d', '3d', 'view', '相机', '透视', '正交'],
        execute: () =>
          run(() => {
            const { cameraMode, setCameraMode } = useViewer.getState()
            setCameraMode(cameraMode === 'perspective' ? 'orthographic' : 'perspective')
          }),
      },
      {
        id: 'editor.viewer.theme',
        label: () => {
          const theme = useViewer.getState().theme
          return theme === 'dark' ? '切换为浅色主题' : '切换为深色主题'
        },
        group: '视图控制',
        icon: <Sun className="h-4 w-4" />, // icon is static; label conveys the action
        keywords: ['theme', 'dark', 'light', 'appearance', 'color', '主题', '深色', '浅色'],
        execute: () =>
          run(() => {
            const { theme, setTheme } = useViewer.getState()
            setTheme(theme === 'dark' ? 'light' : 'dark')
          }),
      },
      {
        id: 'editor.viewer.camera-snapshot',
        label: '相机快照',
        group: '视图控制',
        icon: <Camera className="h-4 w-4" />,
        keywords: ['camera', 'snapshot', 'capture', 'save', 'view', 'bookmark', '快照', '相机'],
        navigate: true,
        execute: () => navigateTo('camera-view'),
      },

      // ── View ─────────────────────────────────────────────────────────────
      {
        id: 'editor.view.preview',
        label: () => (isPreviewMode ? '退出预览' : '进入预览'),
        group: '视图',
        icon: isPreviewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />,
        keywords: ['preview', 'view', 'read-only', 'present', '预览'],
        execute: () => run(() => setPreviewMode(!isPreviewMode)),
      },
      {
        id: 'editor.view.fullscreen',
        label: '全屏切换',
        group: '视图',
        icon: <Maximize2 className="h-4 w-4" />,
        keywords: ['fullscreen', 'maximize', 'expand', 'window', '全屏'],
        execute: () =>
          run(() => {
            if (document.fullscreenElement) document.exitFullscreen()
            else document.documentElement.requestFullscreen()
          }),
      },

      // ── History ──────────────────────────────────────────────────────────
      {
        id: 'editor.history.undo',
        label: '撤销',
        group: '历史',
        icon: <Undo2 className="h-4 w-4" />,
        keywords: ['undo', 'revert', 'back', '撤销'],
        execute: () => run(() => useScene.temporal.getState().undo()),
      },
      {
        id: 'editor.history.redo',
        label: '重做',
        group: '历史',
        icon: <Redo2 className="h-4 w-4" />,
        keywords: ['redo', 'forward', 'repeat', '重做'],
        execute: () => run(() => useScene.temporal.getState().redo()),
      },

      // ── Export & Share ───────────────────────────────────────────────────
      {
        id: 'editor.export.json',
        label: '导出场景 (JSON)',
        group: '导出与分享',
        icon: <FileJson className="h-4 w-4" />,
        keywords: ['export', 'download', 'json', 'save', 'data', '导出'],
        execute: () =>
          run(() => {
            const { nodes, rootNodeIds } = useScene.getState()
            const blob = new Blob([JSON.stringify({ nodes, rootNodeIds }, null, 2)], {
              type: 'application/json',
            })
            const url = URL.createObjectURL(blob)
            Object.assign(document.createElement('a'), {
              href: url,
              download: `scene_${new Date().toISOString().split('T')[0]}.json`,
            }).click()
            URL.revokeObjectURL(url)
          }),
      },
      ...(exportScene
        ? [
            {
              id: 'editor.export.glb',
              label: '导出 3D 模型 (GLB)',
              group: '导出与分享',
              icon: <Box className="h-4 w-4" />,
              keywords: ['export', 'glb', 'gltf', '3d', 'model', 'download', '导出', '模型'],
              execute: () => run(() => exportScene()),
            } as const,
          ]
        : []),
      {
        id: 'editor.export.share-link',
        label: '复制分享链接',
        group: '导出与分享',
        icon: <Copy className="h-4 w-4" />,
        keywords: ['share', 'copy', 'url', 'link', '分享', '链接'],
        execute: () => run(() => navigator.clipboard.writeText(window.location.href)),
      },
      {
        id: 'editor.export.screenshot',
        label: '截图',
        group: '导出与分享',
        icon: <Camera className="h-4 w-4" />,
        keywords: ['screenshot', 'capture', 'image', 'photo', 'png', '截图'],
        execute: () =>
          run(() => {
            const canvas = document.querySelector('canvas')
            if (!canvas) return
            Object.assign(document.createElement('a'), {
              href: canvas.toDataURL('image/png'),
              download: `screenshot_${new Date().toISOString().split('T')[0]}.png`,
            }).click()
          }),
      },
    ])
  }, [
    register,
    navigateTo,
    setInputValue,
    setOpen,
    setPhase,
    setMode,
    setTool,
    setStructureLayer,
    isPreviewMode,
    setPreviewMode,
    exportScene,
  ])

  return null
}
