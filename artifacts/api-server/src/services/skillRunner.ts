export async function runSkillCode(code: string, params: Record<string, unknown>): Promise<unknown> {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const fn = new AsyncFunction(
    "params",
    "fetch",
    `
    "use strict";
    ${code}
    `
  );
  return fn(params, fetch);
}
