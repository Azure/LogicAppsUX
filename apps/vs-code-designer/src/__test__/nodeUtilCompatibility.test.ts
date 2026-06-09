import { afterEach, describe, expect, it, vi } from 'vitest';
import util from 'node:util';

type LegacyNodeUtil = {
  isArray?: (value: unknown) => value is unknown[];
  isNullOrUndefined?: (value: unknown) => value is null | undefined;
  isNumber?: (value: unknown) => value is number;
};

const legacyUtil = util as LegacyNodeUtil;
const originalHelpers = {
  isArray: legacyUtil.isArray,
  isNullOrUndefined: legacyUtil.isNullOrUndefined,
  isNumber: legacyUtil.isNumber,
};

function restoreHelper<T extends keyof LegacyNodeUtil>(name: T, value: LegacyNodeUtil[T]): void {
  if (value === undefined) {
    delete legacyUtil[name];
  } else {
    legacyUtil[name] = value;
  }
}

describe('applyNodeUtilCompatibility', () => {
  afterEach(() => {
    restoreHelper('isArray', originalHelpers.isArray);
    restoreHelper('isNullOrUndefined', originalHelpers.isNullOrUndefined);
    restoreHelper('isNumber', originalHelpers.isNumber);
    vi.resetModules();
  });

  it('restores legacy util helpers removed from newer Node runtimes', async () => {
    legacyUtil.isArray = undefined;
    legacyUtil.isNullOrUndefined = undefined;
    legacyUtil.isNumber = undefined;

    const { applyNodeUtilCompatibility } = await import('../nodeUtilCompatibility');
    applyNodeUtilCompatibility();

    expect(legacyUtil.isArray?.([])).toBe(true);
    expect(legacyUtil.isArray?.('value')).toBe(false);
    expect(legacyUtil.isNullOrUndefined?.(null)).toBe(true);
    expect(legacyUtil.isNullOrUndefined?.(undefined)).toBe(true);
    expect(legacyUtil.isNullOrUndefined?.('value')).toBe(false);
    expect(legacyUtil.isNumber?.(1)).toBe(true);
    expect(legacyUtil.isNumber?.('1')).toBe(false);
  });
});
