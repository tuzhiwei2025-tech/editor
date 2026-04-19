'use client'

import { applySceneGraphToEditor, type SceneGraph, saveSceneToLocalStorage } from './scene'

/** 首页无存档时的默认场景（较轻）— `apps/editor/public/demos/demo_office.json` */
export const DEMO_OFFICE_JSON_PATH = '/demos/demo_office.json'

/** 「数字办公与流水线工厂」完整演示 — `demo_digital_office_factory.json`（与命令面板 / 生成脚本一致） */
const DEMO_DIGITAL_OFFICE_FACTORY_JSON = '/demos/demo_digital_office_factory.json'

/** 加载「数字办公与流水线工厂」演示场景（与命令面板 / 顶部按钮一致）。 */
export async function loadDigitalOfficeFactoryDemo(): Promise<boolean> {
  const res = await fetch(DEMO_DIGITAL_OFFICE_FACTORY_JSON)
  if (!res.ok) {
    console.error('[Editor] Failed to load demo scene', res.status)
    return false
  }
  const graph = (await res.json()) as SceneGraph
  applySceneGraphToEditor(graph)
  saveSceneToLocalStorage(graph)
  return true
}
