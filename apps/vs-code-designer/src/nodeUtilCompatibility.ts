import util from 'node:util';

type LegacyNodeUtil = {
  isArray?: (value: unknown) => value is unknown[];
  isNullOrUndefined?: (value: unknown) => value is null | undefined;
  isNumber?: (value: unknown) => value is number;
};

export function applyNodeUtilCompatibility(): void {
  const legacyUtil = util as LegacyNodeUtil;

  legacyUtil.isArray ??= Array.isArray;
  legacyUtil.isNullOrUndefined ??= (value: unknown): value is null | undefined => value === null || value === undefined;
  legacyUtil.isNumber ??= (value: unknown): value is number => typeof value === 'number';
}

applyNodeUtilCompatibility();
