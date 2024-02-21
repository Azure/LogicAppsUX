export const Theme = {
  Dark: 'dark',
  Light: 'light',
};
export type Theme = (typeof Theme)[keyof typeof Theme];
