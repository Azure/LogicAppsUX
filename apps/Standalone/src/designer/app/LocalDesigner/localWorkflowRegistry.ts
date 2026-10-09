import type {
  Workflow,
  WorkflowExtractionPlan,
  WorkflowExtractionRequest,
  WorkflowExtractionResult,
  WorkflowExtractionService,
} from '@microsoft/logic-apps-designer-v2';
import type { OpenAPIV2 } from '@microsoft/logic-apps-shared';
import { generateUniqueName } from '@microsoft/logic-apps-shared';
import { getReactQueryClient } from '../../../../../../libs/designer-v2/src/lib/core/ReactQueryProvider';

export const localWorkflowRegistryKey = 'msla-standalone-workflow-extraction-v1';
export const localWorkflowRegistryEvent = 'msla-local-workflows-changed';
export const localWorkflowPrefix = 'local:';
export const localWorkflowOperation = {
  connectorId: 'connectionproviders/localworkflowextraction',
  operationId: 'invokelocalworkflow',
};
export const localWorkflowSchemaOperation = 'getLocalWorkflowSchema';

interface RegistryEntry {
  id: string;
  name: string;
  workflow: Workflow;
}

interface RegistryOperation {
  id: string;
  sourceId: string;
  sourceFingerprint: string;
  planFingerprint: string;
  childId: string;
}

interface RegistryData {
  version: 1;
  workflows: RegistryEntry[];
  operations: RegistryOperation[];
}

type RegistryStorage = Pick<Storage, 'getItem' | 'setItem'>;
type RegistryExclusiveRunner = <T>(operation: () => Promise<T>) => Promise<T>;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const normalize = (value: string) => value.toLowerCase();
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const credentialQueryParameterNames = new Set([
  'code',
  'sig',
  'token',
  'accesstoken',
  'apikey',
  'subscriptionkey',
  'xfunctionskey',
  'ocpapimsubscriptionkey',
]);
const containsCredentialQueryParameter = (value: string): boolean => {
  const queryStart = value.indexOf('?');
  if (queryStart < 0) {
    return false;
  }
  const query = value.slice(queryStart + 1).split('#', 1)[0];
  return Array.from(new URLSearchParams(query).keys()).some((key) =>
    credentialQueryParameterNames.has(normalize(key).replace(/[-_\s]/g, ''))
  );
};
const fingerprint = async (value: unknown): Promise<string> => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('This browser cannot safely create a compact workflow extraction fingerprint.');
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
};
const runWithBrowserRegistryLock: RegistryExclusiveRunner = async (operation) => {
  if (!globalThis.navigator?.locks) {
    throw new Error('This browser cannot safely save local workflows because cross-tab locking is unavailable.');
  }
  return navigator.locks.request(`${localWorkflowRegistryKey}:commit`, { mode: 'exclusive' }, operation);
};
function assertSafeAuthentication(value: unknown, isSafeReference: (value: unknown) => boolean): void {
  if (isSafeReference(value)) {
    return;
  }
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw new Error('Offline extraction cannot store credential-bearing workflows.');
  }
  const type = normalize(value.type);
  const credentialFields =
    type === 'managedserviceidentity' || type === 'none'
      ? []
      : type === 'basic'
        ? ['password']
        : type === 'raw'
          ? ['value']
          : type === 'clientcertificate' || (type === 'activedirectoryoauth' && value.credentialType === 'Certificate')
            ? ['pfx']
            : type === 'activedirectoryoauth'
              ? ['secret']
              : undefined;
  if (!credentialFields || credentialFields.some((field) => !isSafeReference(value[field]))) {
    throw new Error('Offline extraction cannot store credentials. Reference app settings or workflow parameters instead.');
  }
}

export const localWorkflowHref = (id: string): string => {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  params.set('extraction', 'true');
  params.set('local', id);
  return `/v2?${params.toString()}`;
};

export const isLocalExtractionEnabled = (): boolean =>
  typeof window !== 'undefined' &&
  window.location.pathname === '/v2' &&
  new URLSearchParams(window.location.search).get('extraction') === 'true';

function assertSafeWorkflow(workflow: Workflow): void {
  if (
    !isRecord(workflow) ||
    !isRecord(workflow.definition) ||
    !isRecord(workflow.definition.actions) ||
    !isRecord(workflow.definition.triggers)
  ) {
    throw new Error('The local workflow registry contains an invalid workflow.');
  }
  const triggers = Object.values(workflow.definition.triggers);
  const operations = [...triggers, ...Object.values(workflow.definition.actions)];
  if (
    triggers.length !== 1 ||
    operations.some((operation) => !isRecord(operation) || typeof operation.type !== 'string' || !operation.type.trim())
  ) {
    throw new Error('A local workflow must have one trigger and valid action definitions.');
  }
  if (
    workflow.connectionReferences !== undefined &&
    (!isRecord(workflow.connectionReferences) ||
      Object.values(workflow.connectionReferences).some(
        (reference) =>
          !isRecord(reference) ||
          !isRecord(reference.api) ||
          typeof reference.api.id !== 'string' ||
          !isRecord(reference.connection) ||
          typeof reference.connection.id !== 'string'
      ))
  ) {
    throw new Error('The local workflow contains invalid connection references.');
  }
  const isSafeCredentialReference = (value: unknown, seen = new Set<string>()): boolean => {
    const reference = typeof value === 'string' ? /^@(parameters|appsetting)\(\s*'((?:[^']|'')+)'\s*\)$/i.exec(value) : null;
    if (!reference) {
      return false;
    }
    if (normalize(reference[1]) === 'appsetting') {
      return true;
    }
    const name = reference[2].replace(/''/g, "'");
    if (seen.has(name)) {
      return false;
    }
    const representations = [workflow.parameters?.[name], workflow.definition.parameters?.[name]].filter(
      (parameter) => parameter !== undefined
    );
    const values = representations.flatMap((parameter) =>
      ['value', 'defaultValue']
        .filter((key) => Object.prototype.hasOwnProperty.call(parameter, key))
        .map((key) => (key === 'value' ? parameter.value : parameter.defaultValue))
    );
    return values.length > 0 && values.every((entry) => isSafeCredentialReference(entry, new Set([...seen, name])));
  };
  const inspect = (value: unknown): void => {
    if (typeof value === 'string') {
      if (
        /SharedAccessSignature=|AccountKey=|Bearer\s+\S+|-----BEGIN .*PRIVATE KEY-----/i.test(value) ||
        containsCredentialQueryParameter(value)
      ) {
        throw new Error('Offline extraction cannot store credential-bearing workflows.');
      }
    } else if (Array.isArray(value)) {
      value.forEach(inspect);
    } else if (isRecord(value)) {
      for (const [key, child] of Object.entries(value)) {
        const normalizedKey = normalize(key).replace(/[-_\s]/g, '');
        if (normalize(key) === 'authentication') {
          assertSafeAuthentication(child, isSafeCredentialReference);
        } else if (
          (/password|secret|credential|authorization|access.?token|api.?key|connectionstring|^pfx$/i.test(key) ||
            /^(xfunctionskey|ocpapimsubscriptionkey|subscriptionkey|xapikey)$/.test(normalizedKey)) &&
          normalize(key) !== 'credentialtype' &&
          !isSafeCredentialReference(child)
        ) {
          throw new Error('Offline extraction cannot store credential-bearing workflows. Reference app settings or parameters instead.');
        }
        if (key === 'type' && typeof child === 'string' && /^secure/i.test(child)) {
          throw new Error('Offline extraction cannot store secure workflow parameters.');
        }
        inspect(child);
      }
    }
  };
  inspect(workflow);
}

function assertSafePlan(plan: WorkflowExtractionPlan): void {
  assertSafeWorkflow(plan.source);
  assertSafeWorkflow(plan.child);
  const invocation = plan.source.definition.actions?.[plan.invocationId];
  if (
    !invocation ||
    normalize(invocation.type) !== 'workflow' ||
    !('inputs' in invocation) ||
    invocation.inputs?.host?.workflow?.id !== plan.childName
  ) {
    throw new Error('Offline extraction requires a name-based local Standard invocation pointing to the new child workflow.');
  }
}

/** Browser-local authoring only: a single storage write commits both workflow documents. */
export class LocalWorkflowRegistry {
  private prepared = new Map<string, Workflow>();
  private readonly storage: () => RegistryStorage;
  private readonly runExclusive: RegistryExclusiveRunner;

  constructor(
    storage?: () => RegistryStorage,
    private readonly reservedNames: string[] = [],
    private readonly onChanged: () => void = () => window.dispatchEvent(new Event(localWorkflowRegistryEvent)),
    runExclusive?: RegistryExclusiveRunner
  ) {
    this.storage = storage ?? (() => window.localStorage);
    this.runExclusive = runExclusive ?? (storage ? (operation) => operation() : runWithBrowserRegistryLock);
  }

  private read(): RegistryData {
    let text: string | null;
    try {
      text = this.storage().getItem(localWorkflowRegistryKey);
    } catch {
      throw new Error('Local workflow storage is unavailable. Nothing has been saved.');
    }
    if (text === null) {
      return { version: 1, workflows: [], operations: [] };
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Local workflow storage is malformed. Preserve or clear the registry before retrying.');
    }
    if (
      !isRecord(data) ||
      data.version !== 1 ||
      !Array.isArray(data.workflows) ||
      !Array.isArray(data.operations) ||
      data.workflows.some((entry: unknown) => !isRecord(entry) || typeof entry.id !== 'string' || typeof entry.name !== 'string') ||
      data.operations.some(
        (operation: unknown) =>
          !isRecord(operation) ||
          ['id', 'sourceId', 'sourceFingerprint', 'planFingerprint', 'childId'].some((key) => typeof operation[key] !== 'string')
      )
    ) {
      throw new Error('Local workflow storage has an unsupported or malformed format.');
    }
    const result = data as unknown as RegistryData;
    result.workflows.forEach((entry) => assertSafeWorkflow(entry.workflow));
    if (
      new Set(result.workflows.map((entry) => normalize(entry.id))).size !== result.workflows.length ||
      new Set(result.workflows.map((entry) => normalize(entry.name))).size !== result.workflows.length ||
      new Set(result.operations.map((operation) => operation.id)).size !== result.operations.length
    ) {
      throw new Error('Local workflow storage contains duplicate entries.');
    }
    return result;
  }

  list(): RegistryEntry[] {
    return clone(this.read().workflows);
  }

  get(id: string): Workflow | undefined {
    return this.list().find((entry) => normalize(entry.id) === normalize(id))?.workflow;
  }

  isLocalWorkflowReference(name: string): boolean {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(name)) {
      return false;
    }
    return this.prepared.has(normalize(name)) || this.read().workflows.some((entry) => normalize(entry.name) === normalize(name));
  }

  validateName(name: string, sourceName?: string): string | undefined {
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(name)) {
      return 'Use 1–80 letters, numbers, hyphens or underscores, starting with a letter.';
    }
    try {
      if (
        normalize(name) === normalize(sourceName ?? '') ||
        this.reservedNames.some((reserved) => normalize(reserved) === normalize(name)) ||
        this.read().workflows.some((entry) => normalize(entry.name) === normalize(name))
      ) {
        return 'A local workflow with this name already exists. Choose a new name.';
      }
    } catch (error) {
      return error instanceof Error ? error.message : 'Local workflow storage is unavailable.';
    }
    return undefined;
  }

  prepare(plan: WorkflowExtractionPlan): () => void {
    assertSafePlan(plan);
    const name = normalize(plan.childName);
    const candidate = clone(plan.child);
    this.removeCandidateSchemaQueries(name);
    this.prepared.set(name, candidate);
    return () => {
      if (this.prepared.get(name) === candidate) {
        this.prepared.delete(name);
        this.removeCandidateSchemaQueries(name);
      }
    };
  }

  private removeCandidateSchemaQueries(name: string): void {
    // getDynamicSchemaProperties keys include the serialized name and separate input/output entries.
    getReactQueryClient().removeQueries({
      predicate: ({ queryKey }) =>
        queryKey[0] === 'dynamicschemaproperties' &&
        queryKey[2] === localWorkflowOperation.connectorId &&
        queryKey[3] === localWorkflowOperation.operationId &&
        queryKey[4] === normalize(localWorkflowSchemaOperation) &&
        typeof queryKey[5] === 'string' &&
        normalize(queryKey[5]).includes(`, name-${JSON.stringify(name)}`),
    });
  }

  schema(name: string, isInput: boolean): OpenAPIV2.SchemaObject {
    const workflow = this.prepared.get(normalize(name)) ?? this.list().find((entry) => normalize(entry.name) === normalize(name))?.workflow;
    if (!workflow) {
      throw new Error(`Local workflow "${name}" is not available.`);
    }
    const operations = isInput ? workflow.definition.triggers : workflow.definition.actions;
    const operation = Object.values(operations ?? {}).find((item) => normalize(item.type) === (isInput ? 'request' : 'response'));
    const schema = operation?.inputs?.schema;
    if (!isRecord(schema)) {
      throw new Error(`Local workflow "${name}" has no ${isInput ? 'Request' : 'Response'} schema.`);
    }
    return clone(schema as OpenAPIV2.SchemaObject);
  }

  createService(sourceId: string, sourceName: string): WorkflowExtractionService {
    let baseline: string | undefined;
    let baselineError: unknown;
    try {
      baseline = JSON.stringify(this.get(sourceId));
    } catch (error) {
      baselineError = error;
    }
    return {
      hostingPlan: 'standard',
      persistenceDescription:
        'Offline local authoring only. Saves both workflows in this browser; does not deploy or run them in Azure. Use synthetic data, never credentials.',
      sourceId,
      sourceName,
      createInvocation: (childName, body, runAfter) => ({
        type: 'Workflow',
        inputs: { host: { workflow: { id: childName } }, body: clone(body) },
        runAfter: clone(runAfter ?? {}),
      }),
      validateName: (name) => this.validateName(name, sourceName),
      getSuggestedName: (baseName) =>
        generateUniqueName(baseName, [sourceName, ...this.reservedNames, ...this.read().workflows.map((entry) => entry.name)], 1),
      prepare: (plan: WorkflowExtractionPlan) => this.prepare(plan),
      commit: (request: WorkflowExtractionRequest): Promise<WorkflowExtractionResult> =>
        this.runExclusive(async () => {
          if (baselineError) {
            throw baselineError;
          }
          const { operationId, sourceFingerprint, plan } = request;
          const data = this.read();
          const previous = data.operations.find((operation) => operation.id === operationId);
          const planFingerprint = await fingerprint(plan);
          if (previous) {
            if (
              previous.sourceId !== sourceId ||
              previous.sourceFingerprint !== sourceFingerprint ||
              previous.planFingerprint !== planFingerprint
            ) {
              throw new Error('This extraction operation was already used for a different plan.');
            }
            const child = data.workflows.find((entry) => entry.id === previous.childId);
            if (!child) {
              throw new Error('The previously created local child workflow is missing.');
            }
            return { status: 'completed', child: { name: child.name, href: localWorkflowHref(child.id) } };
          }
          const invalidName = this.validateName(plan.childName, sourceName);
          if (invalidName) {
            throw new Error(invalidName);
          }
          if (JSON.stringify(data.workflows.find((entry) => normalize(entry.id) === normalize(sourceId))?.workflow) !== baseline) {
            throw new Error('The stored source changed. Reopen it before extracting again.');
          }
          assertSafePlan(plan);
          const childId = `${localWorkflowPrefix}${plan.childName}`;
          data.workflows = data.workflows.filter((entry) => normalize(entry.id) !== normalize(sourceId));
          data.workflows.push(
            { id: sourceId, name: sourceName, workflow: clone(plan.source) },
            { id: childId, name: plan.childName, workflow: clone(plan.child) }
          );
          data.operations.push({ id: operationId, sourceId, sourceFingerprint, planFingerprint, childId });
          try {
            this.storage().setItem(localWorkflowRegistryKey, JSON.stringify(data));
          } catch {
            throw new Error('Could not save local workflows (storage unavailable or full). Neither workflow was changed.');
          }
          baseline = JSON.stringify(plan.source);
          this.onChanged();
          return { status: 'completed', child: { name: plan.childName, href: localWorkflowHref(childId) } };
        }),
    };
  }
}

const fixtures = import.meta.glob('../../../../../../__mocks__/workflows/*.json');
const fixtureNames = Object.keys(fixtures).map((path) =>
  path
    .split('/')
    .pop()!
    .replace(/\.json$/, '')
);
export const localWorkflowRegistry = new LocalWorkflowRegistry(undefined, fixtureNames);
