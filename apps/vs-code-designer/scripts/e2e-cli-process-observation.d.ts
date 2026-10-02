import type { OwnedProcessProvider } from './e2e-cli-owned-processes';

export function createProcessObservationProvider(
  platform?: string,
  execute?: (script: string, budget: number, input?: string) => string
): OwnedProcessProvider;
