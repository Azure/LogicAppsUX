// Operating System Platforms
export const Platform = {
  windows: 'win32',
  mac: 'darwin',
  linux: 'linux',
} as const;
export type Platform = (typeof Platform)[keyof typeof Platform];
