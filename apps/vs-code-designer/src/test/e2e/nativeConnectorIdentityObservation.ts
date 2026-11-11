import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { type Debugger, Session, url as inspectorUrl } from 'inspector';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { types } from 'util';

export interface ConnectorIdentityObservation {
  observed: boolean;
  providerSessionCorrelated: boolean;
  inputTenantMatchesFixture: boolean;
  sessionAccountIsTenantOnly: boolean;
  sessionAccountHasCompositeShape: boolean;
  returnedTenantPresent: boolean;
  returnedTenantMatchesFixture: boolean;
  returnedClientIsFixtureTenant: boolean;
  connectorsEnabled: boolean;
  consistent: boolean;
  nonPausing: boolean;
}

interface Probe {
  lineNumber: number;
  columnNumber: number;
  condition: string;
}

const normalize = (value: string): string => {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};
const objectValue = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

function dataValue(value: unknown, key: string): unknown {
  const record = objectValue(value);
  if (!record) {
    return undefined;
  }
  if (types.isProxy(record)) {
    throw new Error('Connector identity observer: proxy properties cannot be inspected');
  }
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor && !('value' in descriptor)) {
    throw new Error('Connector identity observer: accessor properties cannot be inspected');
  }
  return descriptor?.value;
}

export function shouldObserveNativeConnectorIdentity(env: NodeJS.ProcessEnv): boolean {
  return Boolean(
    (env.FC_SERVICE_CONNECTION_ID || env.AzCode_ServiceConnectionID) &&
      (env.FC_SERVICE_CONNECTION_TENANT_ID || env.AzCode_ServiceConnectionDomain) &&
      (env.FC_SERVICE_CONNECTION_CLIENT_ID || env.AzCode_ServiceConnectionClientID)
  );
}

function uniqueOffset(source: string, marker: string): number {
  const offset = source.indexOf(marker);
  if (offset < 0 || source.indexOf(marker, offset + marker.length) >= 0) {
    throw new Error('Connector identity observer: compiled source anchor is missing or ambiguous');
  }
  return offset;
}

function functionSource(source: string, start: string, end: string): { text: string; offset: number } {
  const offset = uniqueOffset(source, start);
  const limit = uniqueOffset(source, end);
  if (limit <= offset) {
    throw new Error('Connector identity observer: compiled function boundaries changed');
  }
  return { text: source.slice(offset, limit), offset };
}

export function connectorIdentityProbes(source: string, key: string): Probe[] {
  const auth = functionSource(source, 'async function getAuthData(', 'async function getAuthorizationToken(');
  const details = functionSource(
    source,
    'async function getAzureConnectorDetailsForLocalProject(',
    'function invalidateAzureDetailsCache('
  );
  const tenant = details.text.match(/const authData = await getAuthData\(([$\w]+)\);/)?.[1];
  if (!tenant || !details.text.startsWith('async function getAzureConnectorDetailsForLocalProject(')) {
    throw new Error('Connector identity observer: compiled auth call changed');
  }
  const receiver = `globalThis[${JSON.stringify(key)}]`;
  return [
    { block: auth, marker: 'if (providerAuthData)', call: `${receiver}.provider(providerAuthData)` },
    { block: details, marker: 'if (authData?.account?.id)', call: `${receiver}.input(projectPath, ${tenant}, authData)` },
    { block: details, marker: 'return details;', call: `${receiver}.output(projectPath, details)` },
  ].map(({ block, marker, call }) => {
    const offset = block.offset + uniqueOffset(block.text, marker);
    const before = source.slice(0, offset);
    return {
      lineNumber: before.split('\n').length - 1,
      columnNumber: offset - before.lastIndexOf('\n') - 1,
      condition: `(${call}, false)`,
    };
  });
}

export class NativeConnectorIdentityObservation {
  private readonly session = new Session();
  private readonly key = `__logicAppsConnectorIdentity_${randomUUID().replace(/-/g, '')}`;
  private readonly providerSessions = new WeakSet<object>();
  private readonly breakpoints: string[] = [];
  private inputState?: Pick<
    ConnectorIdentityObservation,
    'providerSessionCorrelated' | 'inputTenantMatchesFixture' | 'sessionAccountIsTenantOnly' | 'sessionAccountHasCompositeShape'
  >;
  private result?: ConnectorIdentityObservation;
  private pending = false;
  private invalid = false;
  private paused = false;
  private disposed = false;
  private disposal?: Promise<void>;

  private constructor(
    private readonly projectPath: string,
    private readonly fixtureTenant: string
  ) {}

  static async install(bundlePath: string, projectPath: string, fixtureTenant: string): Promise<NativeConnectorIdentityObservation> {
    if (!nonempty(fixtureTenant)) {
      throw new Error('Connector identity observer: approved fixture tenant is required');
    }
    // Never open a listener or share a debugging session with another debugger.
    if (inspectorUrl()) {
      throw new Error('Connector identity observer: an inspector listener is already active');
    }
    const observer = new NativeConnectorIdentityObservation(normalize(projectPath), fixtureTenant);
    try {
      await observer.attach(bundlePath);
      return observer;
    } catch (error) {
      try {
        await observer.dispose();
      } catch {
        throw new Error('Connector identity observer: installation and disposal failed');
      }
      // Inspector errors can include evaluated expressions. Do not publish their payloads.
      if (error instanceof Error && error.message.startsWith('Connector identity observer:')) {
        throw error;
      }
      throw new Error('Connector identity observer: installation failed');
    }
  }

  private async attach(bundlePath: string): Promise<void> {
    const realPath = fs.realpathSync(bundlePath);
    const source = fs.readFileSync(realPath, 'utf8');
    const probes = connectorIdentityProbes(source, this.key);
    // V8 emits literal tildes, including in Windows DOS 8.3 aliases.
    const expectedUrl = pathToFileURL(realPath).href.replace(/%7e/gi, '~');
    const scripts = new Set<string>();
    this.session.on('Debugger.scriptParsed', ({ params }) => {
      const scriptUrl = params.url.replace(/%7e/gi, '~');
      const actual = process.platform === 'win32' ? scriptUrl.toLowerCase() : scriptUrl;
      const expected = process.platform === 'win32' ? expectedUrl.toLowerCase() : expectedUrl;
      if (actual === expected) {
        scripts.add(params.scriptId);
      }
    });
    this.session.on('Debugger.paused', () => {
      this.paused = true;
      this.session.post('Debugger.resume', () => {
        // The observation remains rejected even if resuming fails.
      });
    });
    this.session.connect();
    Object.defineProperty(globalThis, this.key, {
      configurable: true,
      value: {
        provider: (session: unknown) => {
          const value = objectValue(session);
          if (value) {
            this.providerSessions.add(value);
          }
        },
        input: (project: unknown, tenant: unknown, session: unknown) => {
          if (typeof project !== 'string' || normalize(project) !== this.projectPath) {
            return;
          }
          this.invalid ||= this.pending;
          this.pending = true;
          this.inputState = undefined;
          const value = objectValue(session);
          const account = dataValue(dataValue(value, 'account'), 'id');
          this.inputState = {
            providerSessionCorrelated: Boolean(value && this.providerSessions.has(value)),
            inputTenantMatchesFixture: tenant === this.fixtureTenant,
            sessionAccountIsTenantOnly: nonempty(account) && account === tenant,
            sessionAccountHasCompositeShape: nonempty(account) && account.split('.').length === 2 && account.split('.').every(nonempty),
          };
        },
        output: (project: unknown, details: unknown) => {
          if (typeof project !== 'string' || normalize(project) !== this.projectPath) {
            return;
          }
          const value = objectValue(details);
          if (!this.inputState || !value) {
            this.invalid = true;
            throw new Error('Connector identity observer: caller input was not observed');
          }
          const result: ConnectorIdentityObservation = {
            observed: true,
            ...this.inputState,
            returnedTenantPresent: nonempty(dataValue(value, 'tenantId')),
            returnedTenantMatchesFixture: dataValue(value, 'tenantId') === this.fixtureTenant,
            returnedClientIsFixtureTenant: dataValue(value, 'clientId') === this.fixtureTenant,
            connectorsEnabled: dataValue(value, 'enabled') === true,
            consistent: true,
            nonPausing: !this.paused,
          };
          if (this.result) {
            result.consistent =
              this.result.consistent &&
              (Object.keys(result) as (keyof ConnectorIdentityObservation)[])
                .filter((key) => key !== 'consistent' && key !== 'nonPausing')
                .every((key) => result[key] === this.result?.[key]);
          }
          this.result = result;
          this.inputState = undefined;
          this.pending = false;
        },
      },
    });
    await new Promise<void>((resolve, reject) =>
      this.session.post('Debugger.enable', (error) => (error ? reject(new Error('Connector identity observer: enable failed')) : resolve()))
    );
    if (scripts.size !== 1) {
      throw new Error('Connector identity observer: expected exactly one loaded product script');
    }
    const scriptId = [...scripts][0];
    const loadedSource = await new Promise<string>((resolve, reject) =>
      this.session.post('Debugger.getScriptSource', { scriptId }, (error, value) =>
        error ? reject(new Error('Connector identity observer: source verification failed')) : resolve(value.scriptSource)
      )
    );
    if (loadedSource !== source) {
      throw new Error('Connector identity observer: loaded product does not match the admitted bundle');
    }
    for (const probe of probes) {
      const location = { scriptId, lineNumber: probe.lineNumber, columnNumber: probe.columnNumber };
      const breakpoint = await new Promise<Debugger.SetBreakpointReturnType>((resolve, reject) =>
        this.session.post('Debugger.setBreakpoint', { location, condition: probe.condition }, (error, value) =>
          error ? reject(new Error('Connector identity observer: probe installation failed')) : resolve(value)
        )
      );
      this.breakpoints.push(breakpoint.breakpointId);
      if (
        breakpoint.actualLocation.scriptId !== location.scriptId ||
        breakpoint.actualLocation.lineNumber !== location.lineNumber ||
        breakpoint.actualLocation.columnNumber !== location.columnNumber
      ) {
        throw new Error('Connector identity observer: probe resolved outside its exact source anchor');
      }
    }
  }

  snapshot(): ConnectorIdentityObservation {
    if (!this.result || this.pending || this.invalid || this.paused || !this.result.consistent) {
      throw new Error('Connector identity observer: complete consistent non-pausing caller evidence is unavailable');
    }
    return { ...this.result };
  }

  dispose(): Promise<void> {
    this.disposal ??= this.release();
    return this.disposal;
  }

  private async release(): Promise<void> {
    const failures: Error[] = [];
    try {
      for (const breakpointId of this.breakpoints) {
        await new Promise<void>((resolve) =>
          this.session.post('Debugger.removeBreakpoint', { breakpointId }, (error) => {
            if (error) {
              failures.push(new Error('Connector identity observer: probe disposal failed'));
            }
            resolve();
          })
        );
      }
    } finally {
      try {
        this.session.disconnect();
      } catch {
        failures.push(new Error('Connector identity observer: disconnect failed'));
      }
      this.session.removeAllListeners();
      if (!Reflect.deleteProperty(globalThis, this.key)) {
        failures.push(new Error('Connector identity observer: receiver disposal failed'));
      }
      this.disposed = true;
    }
    if (failures.length > 0 || this.paused) {
      throw new Error('Connector identity observer: disposal or non-pausing contract failed');
    }
  }

  get isDisposed(): boolean {
    return this.disposed;
  }
}
