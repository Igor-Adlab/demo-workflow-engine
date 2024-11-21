import { JexlWrapper } from "../utils/jexl-expression.ts";

export type NodeParamType<T> = T | null | undefined | JexlWrapper | string;
