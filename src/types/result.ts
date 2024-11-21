import type { ResolvableValue } from "./node.ts";

export type Result =
  | undefined
  | null
  | string
  | Error
  | Record<string, ResolvableValue>
  | Array<unknown>
  | number
  | boolean;
