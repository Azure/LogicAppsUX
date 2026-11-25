import { createHash } from 'crypto';

export const logicAppExtensionRecommendations: readonly string[] = [
  'ms-azuretools.vscode-azurelogicapps',
  'ms-dotnettools.csharp',
  'ms-dotnettools.csdevkit',
] as const;

export const functionAppExtensionRecommendations: readonly string[] = [
  'ms-azuretools.vscode-azurefunctions',
  'ms-dotnettools.csharp',
] as const;

export const supportedCustomCodeTarget = 'net10' as const;
export const supportedCustomCodeDotNetVersionLabel = `.NET ${supportedCustomCodeTarget.slice('net'.length)}`;

export function sanitizeCreateWorkspaceCheckpoint(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!normalized) {
    return 'create-workspace-failure';
  }
  if (normalized.length <= 200) {
    return normalized;
  }

  const suffix = createHash('sha256').update(value).digest('hex').slice(0, 12);
  return `${normalized.slice(0, 200 - suffix.length - 1).replace(/-+$/g, '')}-${suffix}`;
}
