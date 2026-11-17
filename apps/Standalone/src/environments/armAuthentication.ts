import jwtDecode from 'jwt-decode';

export interface ArmAuthenticationSnapshot {
  revision: number;
  tenantId?: string;
  principalId?: string;
  authority?: string;
  expiresOn?: number;
  error?: string;
}

let snapshot: ArmAuthenticationSnapshot = {
  revision: 0,
  error: 'Sign in to Azure and refresh the ARM token before enabling direct management.',
};
let currentToken: string | undefined;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const invalidators = new Set<() => void>();

export function getArmAuthenticationSnapshot(): ArmAuthenticationSnapshot {
  return snapshot;
}

export function subscribeArmAuthentication(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function subscribeArmAuthenticationInvalidation(listener: () => void): () => void {
  invalidators.add(listener);
  return () => invalidators.delete(listener);
}

export function setArmAuthenticationToken(token: string | undefined): void {
  if (token === currentToken) {
    return;
  }
  currentToken = token;
  if (expiryTimer) {
    clearTimeout(expiryTimer);
    expiryTimer = undefined;
  }
  snapshot = { revision: snapshot.revision + 1, ...readIdentity(token) };
  // Retire pending issuance synchronously, before React subscribers render the new identity.
  for (const invalidate of invalidators) {
    invalidate();
  }
  for (const listener of listeners) {
    listener();
  }
  if (snapshot.expiresOn) {
    expiryTimer = setTimeout(() => setArmAuthenticationToken(undefined), Math.min(snapshot.expiresOn - Date.now(), 2_147_483_647));
  }
}

function readIdentity(token: string | undefined): Omit<ArmAuthenticationSnapshot, 'revision'> {
  if (!token) {
    return { error: 'Sign in to Azure and refresh the ARM token before enabling direct management.' };
  }
  try {
    const claims = jwtDecode<Record<string, unknown>>(token);
    if (
      typeof claims.tid !== 'string' ||
      !claims.tid.trim() ||
      typeof claims.oid !== 'string' ||
      !claims.oid.trim() ||
      typeof claims.iss !== 'string' ||
      typeof claims.exp !== 'number' ||
      !Number.isFinite(claims.exp) ||
      claims.exp * 1000 <= Date.now()
    ) {
      return { error: 'The ARM token is expired or lacks a tenant, account, issuer, or expiry. Refresh Azure authentication.' };
    }
    const authority = new URL(claims.iss);
    if (authority.protocol !== 'https:' || authority.username || authority.password) {
      return { error: 'The ARM token has an unsupported issuer. Refresh Azure authentication.' };
    }
    return { tenantId: claims.tid, principalId: claims.oid, authority: authority.href, expiresOn: claims.exp * 1000 };
  } catch {
    return { error: 'The ARM token cannot be read. Refresh Azure authentication before enabling direct management.' };
  }
}
