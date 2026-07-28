import { exec } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type { Plugin } from 'vite';

const execAsync = promisify(exec);

/** Same tenant used by `scripts/generateArmToken.js`. */
const TENANT_ID = '72f988bf-86f1-41af-91ab-2d7cd011db47';

/** Dev-only endpoint the Standalone app polls for fresh tokens. */
export const ARM_TOKEN_DEV_ENDPOINT = '/__dev/armToken';

/** Refresh a token once it is within this window of expiring. */
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

interface AzToken {
  accessToken: string;
  expiresOn: string;
  expires_on?: number;
}

interface TokenTarget {
  /** Key returned to the client. */
  name: 'arm' | 'foundry';
  /** `--resource` passed to the az CLI, when the default (ARM) is not wanted. */
  resource?: string;
  /** File under `src/environments/jsonImport` kept in sync for full page reloads. */
  file: string;
}

const TOKEN_TARGETS: TokenTarget[] = [
  { name: 'arm', file: 'armToken.json' },
  { name: 'foundry', resource: 'https://ai.azure.com', file: 'foundryToken.json' },
];

const expiryTime = (token: AzToken): number =>
  typeof token.expires_on === 'number' ? token.expires_on * 1000 : new Date(token.expiresOn).getTime();

const isUsable = (token: AzToken | undefined): token is AzToken => !!token && expiryTime(token) - Date.now() > EXPIRY_MARGIN_MS;

const fetchToken = async (target: TokenTarget): Promise<AzToken> => {
  const resourceArg = target.resource ? ` --resource ${target.resource}` : '';
  const { stdout } = await execAsync(`az account get-access-token --tenant ${TENANT_ID}${resourceArg} --output json`, {
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(stdout) as AzToken;
};

/**
 * Dev-server plugin that hands the Standalone app freshly minted Azure tokens on demand,
 * so a long-running `pnpm run start:arm` session never has to be restarted when the
 * original token expires.
 *
 * Tokens are cached in memory and only re-minted when they are close to expiring, and the
 * `jsonImport` files are kept in sync so a hard page reload also picks up the fresh token.
 */
export const armTokenDevServer = (): Plugin => {
  const cache = new Map<string, AzToken>();
  const inFlight = new Map<string, Promise<AzToken>>();
  let jsonImportDir = '';

  const getToken = async (target: TokenTarget): Promise<AzToken> => {
    const cached = cache.get(target.name);
    if (isUsable(cached)) {
      return cached;
    }

    let pending = inFlight.get(target.name);
    if (!pending) {
      pending = fetchToken(target)
        .then(async (token) => {
          cache.set(target.name, token);
          await fs.writeFile(path.join(jsonImportDir, target.file), JSON.stringify(token, null, 2), 'utf-8').catch(() => undefined);
          return token;
        })
        .finally(() => inFlight.delete(target.name));
      inFlight.set(target.name, pending);
    }
    return pending;
  };

  return {
    name: 'arm-token-dev-server',
    apply: 'serve',
    configResolved(config) {
      jsonImportDir = path.resolve(config.root, 'src/environments/jsonImport');
    },
    configureServer(server) {
      server.middlewares.use(ARM_TOKEN_DEV_ENDPOINT, async (_req, res) => {
        const tokens = await Promise.all(
          TOKEN_TARGETS.map(async (target) => {
            try {
              const token = await getToken(target);
              return [target.name, { accessToken: token.accessToken, expiresOn: token.expiresOn }] as const;
            } catch (error) {
              // ARM failures are worth surfacing; the Foundry token is optional.
              if (target.name === 'arm') {
                server.config.logger.warn(`[arm-token] az account get-access-token failed: ${(error as Error).message}`);
              }
              return [target.name, undefined] as const;
            }
          })
        );

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(Object.fromEntries(tokens)));
      });
    },
  };
};
