/**
 * Generates apps/editor/public/demos/demo_digital_office_factory.json
 * Run: node scripts/generate-digital-office-demo.mjs
 *
 * 工位坐标与 packages/editor/src/components/editor/demo-pack-ambient.tsx 中 OFFICE_DESKS 保持一致。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  deskEmployeePlaceholderSrcDoc,
  factoryBoardSrcDoc,
  meetingAgendaSrcDoc,
  teaStationSrcDoc,
  wallScreenSrcDoc,
} from './embedded-screen-templates.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = join(__dirname, '../apps/editor/public/demos/demo_digital_office_factory.json')

const A = (partial) => ({
  object: 'node',
  visible: true,
  metadata: {},
  ...partial,
})

function asset(id, name, category, dims, extra = {}) {
  return {
    id,
    category,
    name,
    thumbnail: `/items/${id}/thumbnail.webp`,
    src: `/items/${id}/model.glb`,
    dimensions: dims,
    offset: extra.offset ?? [0, 0, 0],
    rotation: extra.rotation ?? [0, 0, 0],
    scale: extra.scale ?? [1, 1, 1],
    ...Object.fromEntries(Object.entries(extra).filter(([k]) => !['offset', 'rotation', 'scale'].includes(k))),
  }
}

const buildingId = 'building_dof_demo'
const levelId = 'level_dof_demo'
const slabId = 'slab_dof_demo'

const X_DIV = 17
const X_MIN = -4
const X_MAX = 42
const Z_MIN = -4
const Z_MAX = 17

/** 8 工位：两行，与 demo-pack-ambient 同步 */
const OFFICE_DESKS = [
  { tx: 1, tz: 1.4, toward: 'south' },
  { tx: 4.5, tz: 1.4, toward: 'south' },
  { tx: 8, tz: 1.4, toward: 'south' },
  { tx: 11.5, tz: 1.4, toward: 'south' },
  { tx: 1, tz: 5.2, toward: 'south' },
  { tx: 4.5, tz: 5.2, toward: 'south' },
  { tx: 8, tz: 5.2, toward: 'south' },
  { tx: 11.5, tz: 5.2, toward: 'south' },
]

/** 桌面高度（与 catalog office-table surface.height 一致），显示器放在桌面上 */
const DESK_SURFACE_Y = 0.75
/** 会议长条桌使用 dining-table surface.height */
const MEET_TABLE_SURFACE_Y = 0.8

const defaultDoorSegments = [
  {
    type: 'panel',
    heightRatio: 0.4,
    columnRatios: [1],
    dividerThickness: 0.03,
    panelDepth: 0.01,
    panelInset: 0.04,
  },
  {
    type: 'glass',
    heightRatio: 0.6,
    columnRatios: [1],
    dividerThickness: 0.03,
    panelDepth: 0.01,
    panelInset: 0.04,
  },
]

function doorNode(id, wallId, position, rotation) {
  const height = 2.15
  const width = 1.35
  return A({
    id,
    type: 'door',
    parentId: wallId,
    wallId,
    children: [],
    position,
    rotation,
    side: 'front',
    width,
    height,
    frameThickness: 0.05,
    frameDepth: 0.07,
    threshold: true,
    thresholdHeight: 0.02,
    hingesSide: 'left',
    swingDirection: 'inward',
    segments: defaultDoorSegments,
    handle: true,
    handleHeight: 1.05,
    handleSide: 'right',
    contentPadding: [0.04, 0.04],
    doorCloser: false,
    panicBar: false,
    panicBarHeight: 1.0,
  })
}

const GLASS_PARTITION = {
  preset: 'glass',
  properties: {
    color: '#cfe8fc',
    roughness: 0.08,
    metalness: 0.12,
    opacity: 0.24,
    transparent: true,
    side: 'double',
  },
}

/** 墙体；doorIds 会写入 wall.children（门节点单独加入 nodes） */
const wallDefs = [
  { id: 'wall_dof_s', start: [X_MIN, Z_MIN], end: [X_MAX, Z_MIN], doorIds: [] },
  { id: 'wall_dof_e', start: [X_MAX, Z_MIN], end: [X_MAX, Z_MAX], doorIds: [] },
  { id: 'wall_dof_n', start: [X_MAX, Z_MAX], end: [X_MIN, Z_MAX], doorIds: [] },
  { id: 'wall_dof_w', start: [X_MIN, Z_MAX], end: [X_MIN, Z_MIN], doorIds: [] },
  {
    id: 'wall_dof_div',
    start: [X_DIV, Z_MIN],
    end: [X_DIV, Z_MAX],
    doorIds: ['door_dof_factory'],
    thickness: 0.1,
    material: GLASS_PARTITION,
  },
  {
    id: 'wall_dof_meeting_div',
    /** 会议室再缩小：更靠北、更窄 */
    start: [5.45, 9.45],
    end: [12.75, 9.45],
    doorIds: ['door_dof_meeting'],
    thickness: 0.1,
    material: GLASS_PARTITION,
  },
]

const wallIds = wallDefs.map((w) => w.id)

const zoneDefs = [
  {
    id: 'zone_dof_office',
    name: '开放办公 · 8 工位',
    color: '#5ac8fa',
    polygon: [
      [X_MIN, Z_MIN],
      [X_DIV - 0.2, Z_MIN],
      [X_DIV - 0.2, Z_MAX],
      [X_MIN, Z_MAX],
    ],
  },
  {
    id: 'zone_dof_meeting',
    name: '会议室',
    color: '#bf5af2',
    polygon: [
      [5.46, 9.46],
      [12.74, 9.46],
      [12.74, Z_MAX],
      [5.46, Z_MAX],
    ],
  },
  {
    id: 'zone_dof_line_a',
    name: '流水线 · A 段',
    color: '#636366',
    polygon: [
      [X_DIV, Z_MIN],
      [X_MAX, Z_MIN],
      [X_MAX, 5.5],
      [X_DIV, 5.5],
    ],
  },
  {
    id: 'zone_dof_line_b',
    name: '流水线 · B 段',
    color: '#636366',
    polygon: [
      [X_DIV, 5.5],
      [X_MAX, 5.5],
      [X_MAX, Z_MAX],
      [X_DIV, Z_MAX],
    ],
  },
]

let itemCounter = 0
function itemId() {
  itemCounter++
  return `item_dof_${itemCounter.toString(36)}`
}

const items = []

function addItem(name, position, rotation, assetDef, opts = {}) {
  const scale = opts.scale ?? [1, 1, 1]
  const metadata = opts.metadata
  const id = itemId()
  const node = {
    id,
    type: 'item',
    name,
    parentId: levelId,
    position,
    rotation,
    scale,
    asset: assetDef,
  }
  if (metadata && Object.keys(metadata).length > 0) {
    node.metadata = metadata
  }
  items.push(A(node))
  return id
}

function deskBundle(tx, tz, chairToward = 'south', deskSlotIndex) {
  const ry = chairToward === 'south' ? Math.PI : 0
  const cz = chairToward === 'south' ? tz + 1.35 : tz - 1.35
  const mx = chairToward === 'south' ? tx - 0.35 : tx + 0.35
  addItem('办公桌', [tx, 0, tz], [0, 0, 0], asset('office-table', 'Office Table', 'furniture', [2, 0.8, 1], { surface: { height: 0.75 } }))
  addItem('办公椅', [tx, 0, cz], [0, ry, 0], asset('office-chair', 'Office Chair', 'furniture', [1, 1.2, 1], { offset: [0.01, 0, 0.03] }))
  addItem(
    `工位 ${deskSlotIndex + 1} · 屏幕`,
    [mx, DESK_SURFACE_Y, tz],
    [0, 0, 0],
    asset('computer', 'Computer', 'appliance', [1, 0.5, 0.5], { offset: [0.01, 0, 0] }),
    {
      metadata: {
        screenRole: 'desk-employee',
        deskSlotIndex,
        htmlPreview: {
          variant: 'desk',
          srcDoc: deskEmployeePlaceholderSrcDoc(deskSlotIndex),
        },
      },
    },
  )
}

for (let di = 0; di < OFFICE_DESKS.length; di++) {
  const d = OFFICE_DESKS[di]
  deskBundle(d.tx, d.tz, d.toward, di)
}

/** 南墙主屏：面向办公区 +Z；节点 Y=0 与 Html 预设 π 组合，避免与模型再叠一层 π 导致画面朝外 */
addItem('信息发布大屏', [8, 0, -3.35], [0, 0, 0], asset('television', 'Television', 'appliance', [2, 1.1, 0.5]), {
  scale: [1.88, 1.88, 1.88],
  metadata: {
    screenRole: 'team-result',
    htmlPreview: {
      variant: 'wall',
      srcDoc: wallScreenSrcDoc(),
      /** 与电视玻璃可视区对齐（略小于全局 television.wall 预设） */
      sizePx: [320, 180],
      distanceFactor: 6.0,
      flipContentX: true,
    },
  },
})

/**
 * 休闲区：沙发原在 z≈5.4 与后排工位 (tz=5.2) 及椅位 (≈6.5) 易穿模；
 * 整体南移并略对正茶几。
 */
addItem('休闲沙发', [7.35, 0, 6.95], [0, Math.PI, 0], asset('sofa', 'Sofa', 'furniture', [2, 0.8, 1]))
addItem('接待茶几', [7.35, 0, 4.12], [0, 0, 0], asset('coffee-table', 'Coffee Table', 'furniture', [2, 0.4, 1.5], { surface: { height: 0.3 } }))
addItem('边凳', [10.05, 0, 4.18], [0, -0.25, 0], asset('stool', 'Stool', 'furniture', [1, 1.2, 1]))
/** 略抬高、离南墙与墙角更远，减少盆体与墙体重叠 */
addItem('入口绿植', [1.5, 0.02, -3.12], [0, 0.28, 0], asset('indoor-plant', 'Indoor Plant', 'furniture', [1, 1.5, 1]))
addItem('工区绿植', [5.35, 0.02, 6.25], [0, 0.12, 0], asset('small-indoor-plant', 'Small Indoor Plant', 'furniture', [0.5, 0.6, 0.5]))
addItem('工区绿植', [3.55, 0.02, 4.05], [0, -0.15, 0], asset('small-indoor-plant', 'Small Indoor Plant', 'furniture', [0.5, 0.6, 0.5]))
addItem('画架白板', [0.95, 0, 6.35], [0, 0.55, 0], asset('easel', 'Easel', 'furniture', [1.5, 2.3, 1]))
addItem('资料柜', [15.65, 0, 2.1], [0, -Math.PI / 2, 0], asset('bookshelf', 'Bookshelf', 'furniture', [1, 2, 0.5]))
addItem('工位台灯', [3.2, DESK_SURFACE_Y, 1.4], [0, 0, 0], asset('table-lamp', 'Table Lamp', 'furniture', [0.5, 0.8, 1]))
addItem('工位台灯', [9.2, DESK_SURFACE_Y, 5.2], [0, 0.15, 0], asset('table-lamp', 'Table Lamp', 'furniture', [0.5, 0.8, 1]))
addItem('文印边柜', [0.85, 0, 0.35], [0, 0.2, 0], asset('bookshelf', 'Bookshelf', 'furniture', [1, 2, 0.5]))
addItem('办公垃圾桶', [15.75, 0, 7.55], [0, 0.4, 0], asset('trash-bin', 'Trash Bin', 'furniture', [0.5, 0.6, 0.5]))

const MEET_TABLE_X = 9.1
const MEET_TABLE_Z = 13.22
/** 长条沿世界 X；Y=0 相对原先 π/2 旋转 90°。用餐桌 GLB 沿本地长轴放大 */
addItem(
  '会议长条桌',
  [MEET_TABLE_X, 0, MEET_TABLE_Z],
  [0, 0, 0],
  asset('dining-table', 'Dining Table', 'furniture', [2.5, 0.8, 1], { surface: { height: 0.8 } }),
  { scale: [2.35, 1, 0.92] },
)
addItem(
  '会议投屏',
  [MEET_TABLE_X - 2.58, MEET_TABLE_SURFACE_Y, MEET_TABLE_Z],
  [0, Math.PI / 2, 0],
  asset('computer', 'Computer', 'appliance', [1, 0.5, 0.5], { offset: [0.01, 0, 0] }),
  {
    metadata: {
      htmlPreview: {
        variant: 'desk',
        srcDoc: meetingAgendaSrcDoc(),
      },
    },
  },
)
/** 长桌两侧椭圆落座：长轴沿 X */
const meetChairRx = 2.52
const meetChairRz = 0.98
for (let i = 0; i < 6; i++) {
  const angle = (i / 6) * Math.PI * 2
  const cx = MEET_TABLE_X + Math.cos(angle) * meetChairRx
  const cz = MEET_TABLE_Z + Math.sin(angle) * meetChairRz
  addItem(
    '会议椅',
    [cx, 0, cz],
    [0, angle + Math.PI, 0],
    asset('dining-chair', 'Dining Chair', 'furniture', [0.5, 1, 0.5]),
  )
}
addItem('会议资料', [MEET_TABLE_X + 2.42, MEET_TABLE_SURFACE_Y, MEET_TABLE_Z], [0, -Math.PI / 2, 0], asset('books', 'Books', 'furniture', [0.5, 0.3, 0.5], { offset: [-0.08, 0, 0.02] }))
addItem('会议室落地灯', [6.15, 0, 15.45], [0, 0.35, 0], asset('floor-lamp', 'Floor Lamp', 'furniture', [1, 1.9, 1], { offset: [0.04, 0, 0.02] }))

addItem('茶水台', [13.5, 0, -1.2], [0, 0, 0], asset('kitchen-counter', 'Kitchen Counter', 'kitchen', [2, 0.8, 1], { surface: { height: 0.75 } }))
addItem(
  '茶水间显示器',
  [13.1, DESK_SURFACE_Y, -1.05],
  [0, 0, 0],
  asset('computer', 'Computer', 'appliance', [1, 0.5, 0.5], { offset: [0.01, 0, 0] }),
  {
    metadata: {
      htmlPreview: {
        variant: 'desk',
        srcDoc: teaStationSrcDoc(),
      },
    },
  },
)
addItem('咖啡机', [13.9, DESK_SURFACE_Y, -0.65], [0, 0, 0], asset('coffee-machine', 'Coffee Machine', 'appliance', [0.5, 0.3, 0.5], { offset: [0, 0, -0.03] }))
addItem('微波炉', [12.55, DESK_SURFACE_Y, -0.72], [0, 0.08, 0], asset('microwave', 'Microwave', 'kitchen', [1, 0.3, 0.5], { offset: [0, 0, -0.03] }))

for (let x = 19; x <= 36; x += 3.4) {
  addItem('线边台', [x, 0, 2.8], [0, 0, 0], asset('kitchen-counter', 'Kitchen Counter', 'kitchen', [2, 0.8, 1], { surface: { height: 0.75 } }))
}
addItem('来料架', [19.5, 0, 0.35], [0, 0, 0], asset('drying-rack', 'Drying Rack', 'bathroom', [2, 1.1, 1]))
addItem('料箱架', [27, 0, 0.55], [0, Math.PI / 5, 0], asset('bookshelf', 'Bookshelf', 'furniture', [1, 2, 0.5]))
addItem('清洗单元', [23, 0, 0.95], [0, 0, 0], asset('washing-machine', 'Washing Machine', 'bathroom', [1, 1, 1]))
addItem('装配工位', [31, 0, 1.05], [0, -0.12, 0], asset('sewing-machine', 'Sewing Machine', 'appliance', [1, 0.7, 0.5]))
addItem('质检台', [25, 0, 13.8], [0, 0, 0], asset('kitchen-counter', 'Kitchen Counter', 'kitchen', [2, 0.8, 1], { surface: { height: 0.75 } }))
/**
 * 电子看板：原与质检台 (25,13.8) 在 Z 上重叠带内；南移 + 略朝产线开口，并抬离地面一点减少与台面穿插。
 */
addItem(
  '电子看板',
  [27.85, 0, 14.58],
  [0, -0.42, 0],
  asset('television', 'Television', 'appliance', [2, 1.1, 0.5], { offset: [0.04, 0.035, 0.12] }),
  {
    scale: [1.02, 1.02, 1.02],
    metadata: {
      screenRole: 'belt-status',
      htmlPreview: {
        variant: 'wall',
        srcDoc: factoryBoardSrcDoc(),
      },
    },
  },
)
addItem('包装台', [34, 0, 14.2], [0, 0, 0], asset('dining-table', 'Dining Table', 'furniture', [2.5, 0.8, 1], { surface: { height: 0.8 } }))
addItem('成品架', [37.5, 0, 14.8], [0, -Math.PI / 6, 0], asset('bookshelf', 'Bookshelf', 'furniture', [1, 2, 0.5]))
addItem('叉车区标识', [35, 0, 0.75], [0, 0, 0], asset('parking-spot', 'Parking Spot', 'outdoor', [5, 1, 2.5], { scale: [0.72, 1, 0.65], offset: [0, 0, 0.01] }))
addItem('立柱', [22, 0, 9], [0, 0, 0], asset('column', 'Column', 'furniture', [0.5, 2.6, 0.5], { offset: [0, 1.26, 0] }))
addItem('废料桶', [38.5, 0, 3.8], [0, 0, 0], asset('trash-bin', 'Trash Bin', 'furniture', [0.5, 0.6, 0.5]))

function wallLen2d(s, e) {
  const dx = e[0] - s[0]
  const dz = e[1] - s[1]
  return Math.sqrt(dx * dx + dz * dz)
}

/** 沿墙参数坐标：办公-会议门约在墙长 52% 处；产线-办公门约在 48% 处 */
const doorMeetingLocalX = wallLen2d([5.45, 9.45], [12.75, 9.45]) * 0.52
const doorFactoryLocalX = wallLen2d([X_DIV, Z_MIN], [X_DIV, Z_MAX]) * 0.48

const doorMeeting = doorNode('door_dof_meeting', 'wall_dof_meeting_div', [doorMeetingLocalX, 2.15 / 2, 0], [0, 0, 0])
const doorFactory = doorNode('door_dof_factory', 'wall_dof_div', [doorFactoryLocalX, 2.15 / 2, 0], [0, 0, 0])

const levelChildren = [slabId, ...zoneDefs.map((z) => z.id), ...wallIds, ...items.map((i) => i.id)]

const nodes = {
  [buildingId]: A({
    id: buildingId,
    type: 'building',
    parentId: null,
    children: [levelId],
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    metadata: { demoPack: 'digital-office-factory' },
  }),
  [levelId]: A({
    id: levelId,
    type: 'level',
    parentId: buildingId,
    children: levelChildren,
    level: 0,
    camera: {
      position: [26, 20, 18],
      target: [9, 0, 5],
      mode: 'perspective',
    },
  }),
  [slabId]: A({
    id: slabId,
    type: 'slab',
    name: '联合厂房地面',
    parentId: levelId,
    polygon: [
      [X_MIN, Z_MIN],
      [X_MAX, Z_MIN],
      [X_MAX, Z_MAX],
      [X_MIN, Z_MAX],
    ],
    elevation: 0.05,
    material: {
      preset: 'tile',
      properties: {
        color: '#dbeafe',
        roughness: 0.55,
        metalness: 0.04,
        opacity: 1,
        transparent: false,
        side: 'front',
      },
    },
  }),
  door_dof_meeting: doorMeeting,
  door_dof_factory: doorFactory,
}

for (const w of wallDefs) {
  nodes[w.id] = A({
    id: w.id,
    type: 'wall',
    parentId: levelId,
    children: w.doorIds ?? [],
    start: w.start,
    end: w.end,
    ...(w.thickness != null ? { thickness: w.thickness } : {}),
    ...(w.material != null ? { material: w.material } : {}),
  })
}

for (const z of zoneDefs) {
  nodes[z.id] = A({
    id: z.id,
    type: 'zone',
    name: z.name,
    parentId: levelId,
    polygon: z.polygon,
    color: z.color,
  })
}

for (const it of items) {
  nodes[it.id] = it
}

const scene = {
  nodes,
  rootNodeIds: [buildingId],
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(scene, null, 2), 'utf8')
console.log('Wrote', out)
