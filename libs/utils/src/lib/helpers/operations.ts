export const isScopeOperation = (s: string): boolean => {
  return ['scope', 'foreach', 'until', 'if', 'switch'].includes(s.toLowerCase());
};
