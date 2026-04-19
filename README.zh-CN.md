# Pascal Editor

基于 React Three Fiber 与 WebGPU 的 3D 建筑编辑器。

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm @pascal-app/core](https://img.shields.io/npm/v/@pascal-app/core?label=%40pascal-app%2Fcore)](https://www.npmjs.com/package/@pascal-app/core)
[![npm @pascal-app/viewer](https://img.shields.io/npm/v/@pascal-app/viewer?label=%40pascal-app%2Fviewer)](https://www.npmjs.com/package/@pascal-app/viewer)
[![Discord](https://img.shields.io/badge/Discord-Join%20Server-5865F2?logo=discord&logoColor=white)](https://discord.gg/SaBRA9t2)
[![X (Twitter)](https://img.shields.io/badge/follow-%40pascal__app-black?logo=x&logoColor=white)](https://x.com/pascal_app)

https://github.com/user-attachments/assets/8b50e7cf-cebe-4579-9cf3-8786b35f7b6b

---

## 仓库架构

这是一个 Turborepo 单体仓库，包含三个主要包：

```
editor-v2/
├── apps/
│   └── editor/          # Next.js 应用
├── packages/
│   ├── core/            # Schema 定义、状态管理、各类系统
│   └── viewer/          # 3D 渲染组件
```

### 职责划分

| 包 | 职责 |
|---------|---------------|
| **@pascal-app/core** | 节点 Schema、场景状态（Zustand）、系统（几何生成）、空间查询、事件总线 |
| **@pascal-app/viewer** | 通过 React Three Fiber 进行 3D 渲染，默认相机/控制器、后处理 |
| **apps/editor** | UI 组件、工具、自定义行为、编辑器专用系统 |

**viewer** 用合理的默认配置渲染场景。**editor** 在此基础上扩展交互式工具、选择管理与编辑能力。

### Store（状态仓库）

每个包都有自己的 Zustand store 来管理状态：

| Store | 包 | 职责 |
|-------|---------|----------------|
| `useScene` | `@pascal-app/core` | 场景数据：节点、根节点 ID、脏节点、CRUD。持久化到 IndexedDB，并通过 Zundo 支持撤销/重做。 |
| `useViewer` | `@pascal-app/viewer` | 查看器状态：当前选择（建筑/楼层/区域 ID）、楼层显示模式（堆叠/爆炸/单层）、相机模式。 |
| `useEditor` | `apps/editor` | 编辑器状态：当前工具、结构图层可见性、面板状态、编辑器偏好设置。 |

**访问方式：**

```typescript
// 订阅状态变化（React 组件）
const nodes = useScene((state) => state.nodes)
const levelId = useViewer((state) => state.selection.levelId)
const activeTool = useEditor((state) => state.tool)

// 在 React 之外访问状态（回调、系统）
const node = useScene.getState().nodes[id]
useViewer.getState().setSelection({ levelId: 'level_123' })
```

---

## 核心概念

### 节点（Nodes）

节点是描述 3D 场景的数据原语。所有节点都继承 `BaseNode`：

```typescript
BaseNode {
  id: string              // 自动生成，带类型前缀（例如 "wall_abc123"）
  type: string            // 用于类型安全处理的判别字段
  parentId: string | null // 父节点引用
  visible: boolean
  camera?: Camera         // 可选：保存的相机位姿
  metadata?: JSON         // 任意元数据（例如 { isTransient: true }）
}
```

**节点层级：**

```
Site
└── Building
    └── Level
        ├── Wall → Item (doors, windows)
        ├── Slab
        ├── Ceiling → Item (lights)
        ├── Roof
        ├── Zone
        ├── Scan (3D reference)
        └── Guide (2D reference)
```

节点保存在**扁平字典**（`Record<id, Node>`）中，而不是嵌套树。父子关系通过 `parentId` 与 `children` 数组定义。

---

### 场景状态（Zustand Store）

场景由 `@pascal-app/core` 中的 Zustand store 管理：

```typescript
useScene.getState() = {
  nodes: Record<id, AnyNode>,  // All nodes
  rootNodeIds: string[],       // Top-level nodes (sites)
  dirtyNodes: Set<string>,     // Nodes pending system updates

  createNode(node, parentId),
  updateNode(id, updates),
  deleteNode(id),
}
```

**中间件：**

- **Persist** - 保存到 IndexedDB（排除瞬态节点）
- **Temporal**（Zundo）- 撤销/重做，50 步历史

---

### 场景注册表（Scene Registry）

注册表将节点 ID 映射到 Three.js 对象，以便快速查找：

```typescript
sceneRegistry = {
  nodes: Map<id, Object3D>,    // ID → 3D object
  byType: {
    wall: Set<id>,
    item: Set<id>,
    zone: Set<id>,
    // ...
  }
}
```

渲染器通过 `useRegistry` hook 注册它们的 ref：

```tsx
const ref = useRef<Mesh>(null!)
useRegistry(node.id, 'wall', ref)
```

这样系统可以直接访问 3D 对象，而无需遍历场景图。

---

### 节点渲染器（Node Renderers）

渲染器是为每种节点类型创建 Three.js 对象的 React 组件：

```
SceneRenderer
└── NodeRenderer (dispatches by type)
    ├── BuildingRenderer
    ├── LevelRenderer
    ├── WallRenderer
    ├── SlabRenderer
    ├── ZoneRenderer
    ├── ItemRenderer
    └── ...
```

**模式：**

1. 渲染器创建占位 mesh/group
2. 通过 `useRegistry` 注册
3. 系统根据节点数据更新几何

示例（简化）：

```tsx
const WallRenderer = ({ node }) => {
  const ref = useRef<Mesh>(null!)
  useRegistry(node.id, 'wall', ref)

  return (
    <mesh ref={ref}>
      <boxGeometry args={[0, 0, 0]} />  {/* Replaced by WallSystem */}
      <meshStandardMaterial />
      {node.children.map(id => <NodeRenderer key={id} nodeId={id} />)}
    </mesh>
  )
}
```

---

### 系统（Systems）

系统是运行在渲染循环（`useFrame`）中的 React 组件，用于更新几何与变换。它们处理 store 中标记的**脏节点**。

**核心系统（在 `@pascal-app/core` 中）：**

| 系统 | 职责 |
|--------|---------------|
| `WallSystem` | 生成墙体几何，含斜接与用于门/窗的 CSG 开洞 |
| `SlabSystem` | 由多边形生成楼板几何 |
| `CeilingSystem` | 生成天花几何 |
| `RoofSystem` | 生成屋顶几何 |
| `ItemSystem` | 将物品定位到墙、天花或楼板（楼板标高）上 |

**查看器系统（在 `@pascal-app/viewer` 中）：**

| 系统 | 职责 |
|--------|---------------|
| `LevelSystem` | 处理楼层可见性与垂直位置（堆叠/爆炸/单层模式） |
| `ScanSystem` | 控制 3D 扫描可见性 |
| `GuideSystem` | 控制参考图可见性 |

**处理模式：**

```typescript
useFrame(() => {
  for (const id of dirtyNodes) {
    const obj = sceneRegistry.nodes.get(id)
    const node = useScene.getState().nodes[id]

    // Update geometry, transforms, etc.
    updateGeometry(obj, node)

    dirtyNodes.delete(id)
  }
})
```

---

### 脏节点（Dirty Nodes）

当节点发生变化时，会在 `useScene.getState().dirtyNodes` 中被标记为**脏**。系统每帧检查该集合，并仅为脏节点重算几何。

```typescript
// Automatic: createNode, updateNode, deleteNode mark nodes dirty
useScene.getState().updateNode(wallId, { thickness: 0.2 })
// → wallId added to dirtyNodes
// → WallSystem regenerates geometry next frame
// → wallId removed from dirtyNodes
```

**手动标记：**

```typescript
useScene.getState().dirtyNodes.add(wallId)
```

---

### 事件总线（Event Bus）

组件间通信使用类型化的事件发射器（mitt）：

```typescript
// Node events
emitter.on('wall:click', (event) => { ... })
emitter.on('item:enter', (event) => { ... })
emitter.on('zone:context-menu', (event) => { ... })

// Grid events (background)
emitter.on('grid:click', (event) => { ... })

// Event payload
NodeEvent {
  node: AnyNode
  position: [x, y, z]
  localPosition: [x, y, z]
  normal?: [x, y, z]
  stopPropagation: () => void
}
```

---

### 空间网格管理器（Spatial Grid Manager）

处理碰撞检测与放置校验：

```typescript
spatialGridManager.canPlaceOnFloor(levelId, position, dimensions, rotation)
spatialGridManager.canPlaceOnWall(wallId, t, height, dimensions)
spatialGridManager.getSlabElevationAt(levelId, x, z)
```

物品放置工具用它校验位置并计算楼板标高。

---

## 编辑器架构

编辑器在查看器基础上扩展：

### 工具（Tools）

通过工具栏激活工具，处理特定操作的用户输入：

- **SelectTool** - 选择与操作
- **WallTool** - 绘制墙体
- **ZoneTool** - 创建区域
- **ItemTool** - 放置家具/装置
- **SlabTool** - 创建楼板

### 选择管理器（Selection Manager）

编辑器使用自定义选择管理器，支持层级导航：

```
Site → Building → Level → Zone → Items
```

每个深度层级都有各自的悬停/点击选择策略。

### 编辑器专用系统

- `ZoneSystem` - 根据楼层模式控制区域可见性
- 自定义相机控制与节点聚焦

---

## 数据流

```
User Action (click, drag)
       ↓
Tool Handler
       ↓
useScene.createNode() / updateNode()
       ↓
Node added/updated in store
Node marked dirty
       ↓
React re-renders NodeRenderer
useRegistry() registers 3D object
       ↓
System detects dirty node (useFrame)
Updates geometry via sceneRegistry
Clears dirty flag
```

---

## 技术栈

- **React 19** + **Next.js 16**
- **Three.js**（WebGPU 渲染器）
- **React Three Fiber** + **Drei**
- **Zustand**（状态管理）
- **Zod**（Schema 校验）
- **Zundo**（撤销/重做）
- **three-bvh-csg**（布尔几何运算）
- **Turborepo**（单体仓库管理）
- **Bun**（包管理器）

---

## 快速开始

### 开发

在**仓库根目录**（本仓库中为 `editor/`）运行开发服务器，以便所有包都能热更新：

```bash
# 安装依赖
bun install

# 运行开发服务器（构建包 + 以 watch 模式启动编辑器）
bun dev

# 将会：
# 1. 构建 @pascal-app/core 与 @pascal-app/viewer
# 2. 开始监听两个包的变更
# 3. 启动 Next.js 编辑器开发服务器
# 打开 http://localhost:3000
```

**重要：** 始终在根目录运行 `bun dev`，确保包监听进程在运行。这样编辑 `packages/core/src/` 或 `packages/viewer/src/` 时才能热更新。

### 若出现 `command not found: bun`

本仓库在 `package.json` 中指定了 `packageManager: "bun@1.3.0"`，需要先安装 Bun：

- 官方安装脚本（macOS / Linux）：<https://bun.sh>
- 或全局安装：`npm install -g bun`

安装完成后**新开一个终端**，再执行 `bun install` 与 `bun dev`。

### 生产构建

```bash
# 构建所有包
turbo build

# 构建指定包
turbo build --filter=@pascal-app/core
```

### 发布包

```bash
# 构建包
turbo build --filter=@pascal-app/core --filter=@pascal-app/viewer

# 发布到 npm
npm publish --workspace=@pascal-app/core --access public
npm publish --workspace=@pascal-app/viewer --access public
```

---

## 关键文件

| 路径 | 说明 |
|------|-------------|
| `packages/core/src/schema/` | 节点类型定义（Zod schemas） |
| `packages/core/src/store/use-scene.ts` | 场景状态 store |
| `packages/core/src/hooks/scene-registry/` | 3D 对象注册表 |
| `packages/core/src/systems/` | 几何生成系统 |
| `packages/viewer/src/components/renderers/` | 节点渲染器 |
| `packages/viewer/src/components/viewer/` | 主 Viewer 组件 |
| `apps/editor/components/tools/` | 编辑器工具 |
| `apps/editor/store/` | 编辑器专用状态 |

---

## 贡献者

<a href="https://github.com/Aymericr"><img src="https://avatars.githubusercontent.com/u/4444492?v=4" width="60" height="60" alt="Aymeric Rabot" style="border-radius:50%"></a>
<a href="https://github.com/wass08"><img src="https://avatars.githubusercontent.com/u/6551176?v=4" width="60" height="60" alt="Wassim Samad" style="border-radius:50%"></a>

---

<a href="https://trendshift.io/repositories/23831" target="_blank"><img src="https://trendshift.io/api/badge/repositories/23831" alt="pascalorg/editor | Trendshift" width="250" height="55"/></a>
