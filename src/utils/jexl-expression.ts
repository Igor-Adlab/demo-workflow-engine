import jexl from "npm:jexl";
import type { CtxHelpersMap } from "./resolve-param.ts";

export class JexlWrapper {
  constructor(
    private readonly template: TemplateStringsArray,
    private readonly args: any[]
  ) {}

  eval(helpers: CtxHelpersMap) {
    const instance = new jexl.Jexl();

    instance.addFunctions(helpers);

    try {
        return instance.expr(this.template, this.args).evalSync({});
    } catch {
        return null;
    }
  }

  // deno-lint-ignore no-explicit-any
  static isJexlExpression(obj: any) {
    return obj instanceof jexl.expr``.constructor || obj instanceof JexlWrapper;
  }
}

// deno-lint-ignore no-explicit-any
export const expr = (strs: TemplateStringsArray, ...args: any[]) =>
  new JexlWrapper(strs, args);
