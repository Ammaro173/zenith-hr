/** biome-ignore-all lint/suspicious/noExplicitAny://TODO */
export const on = <T extends EventTarget, A extends any[]>(
  obj: T,
  ...args: A
) => {
  if (obj?.addEventListener) {
    // @ts-expect-error
    obj.addEventListener(...args);
  }
};

export const off = <T extends EventTarget, A extends any[]>(
  obj: T,
  ...args: A
) => {
  if (obj?.removeEventListener) {
    // @ts-expect-error
    obj.removeEventListener(...args);
  }
};
