import dedent from 'dedent'
import { z } from 'zod'
import { BaseNode, nodeType, objectId } from '../base'
import { MaterialSchema } from '../material'
// import { DoorNode } from "./door";
// import { ItemNode } from "./item";
// import { WindowNode } from "./window";

export const WallNode = BaseNode.extend({
  id: objectId('wall'),
  type: nodeType('wall'),
  /** 门、窗、墙挂物品等子节点 id（不限于 item 前缀） */
  children: z.array(z.string()).default([]),
  material: MaterialSchema.optional(),
  thickness: z.number().optional(),
  height: z.number().optional(),
  // e.g., start/end points for path
  start: z.tuple([z.number(), z.number()]),
  end: z.tuple([z.number(), z.number()]),
  // Space detection for cutaway mode
  frontSide: z.enum(['interior', 'exterior', 'unknown']).default('unknown'),
  backSide: z.enum(['interior', 'exterior', 'unknown']).default('unknown'),
}).describe(
  dedent`
  Wall node - used to represent a wall in the building
  - thickness: thickness in meters
  - height: height in meters
  - start: start point of the wall in level coordinate system
  - end: end point of the wall in level coordinate system
  - size: size of the wall in grid units
  - frontSide: whether the front side faces interior, exterior, or unknown
  - backSide: whether the back side faces interior, exterior, or unknown
  `,
)
export type WallNode = z.infer<typeof WallNode>
