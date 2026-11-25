import { makeStyles } from '@fluentui/react-components';
import { NodeIconTile, type NodeCategory } from '@microsoft/designer-ui-v2';
import {
  a2aRequestOperation,
  composeOperation,
  getBuiltInOperationInfo,
  getClientBuiltInOperations,
  inlinePythonCodeOperation,
  slidingWindowOperation,
  UnsupportedException,
  type DiscoveryOperation,
  type DiscoveryResultTypes,
} from '@microsoft/logic-apps-shared';
import { getControlOperationGlyph, getOperationNodeGlyph } from './CustomNodes/components/card/operationNodeGlyphs';

const normalize = (value?: string) => value?.trim().toLowerCase() || undefined;
// Strip leading slashes so Standard (`connectionProviders/workflow`) and Consumption (`/connectionProviders/workflow`) share one key.
const operationKey = (apiId: string, id: string) => `${apiId.trim().replace(/^\/+/, '').toLowerCase()}\0${id.trim().toLowerCase()}`;
type DiscoveryRow = DiscoveryOperation<DiscoveryResultTypes>;

interface KnownOperationIdentity {
  type: string | undefined;
  kind: string | undefined;
  isTrigger: boolean;
}

// Discovery already distinguishes variants such as CSV/HTML Table and plain/Swagger HTTP.
// The workflow-definition resolver alone cannot distinguish them without inputs or metadata.
// Built lazily on first lookup so importing helpers does not eagerly evaluate built-in operation manifests.
let knownOperationsCache: Map<string, KnownOperationIdentity> | undefined;
const getKnownOperations = () => {
  if (!knownOperationsCache) {
    const builtInRows: DiscoveryRow[] = [
      ...getClientBuiltInOperations(),
      composeOperation,
      slidingWindowOperation,
      inlinePythonCodeOperation as DiscoveryRow,
      a2aRequestOperation,
    ];
    knownOperationsCache = new Map<string, KnownOperationIdentity>([
      ...builtInRows.map((row): [string, KnownOperationIdentity] => [
        operationKey(row.properties.api.id, row.id),
        {
          type: normalize(row.properties.operationType),
          kind: normalize(row.properties.operationKind),
          isTrigger: !!row.properties.trigger,
        },
      ]),
      // Additional verified Standard and Consumption built-in discovery identities not present in getClientBuiltInOperations().
      [operationKey('connectionProviders/workflow', 'invokenestedagent'), { type: 'nestedagent', kind: undefined, isTrigger: false }],
      [operationKey('connectionProviders/workflow', 'invokeworkflow'), { type: 'workflow', kind: undefined, isTrigger: false }],
      [operationKey('connectionProviders/a2aconsumption', 'a2arequest'), { type: 'request', kind: 'agent', isTrigger: true }],
      [operationKey('connectionProviders/inlineCode', 'csharpcode'), { type: 'csharpcode', kind: undefined, isTrigger: false }],
    ]);
  }
  return knownOperationsCache;
};

const useStyles = makeStyles({
  pickerTile: { width: '24px', height: '24px', fontSize: '16px' },
});

const resolveGlyph = (type: string, kind: string | undefined, category: NodeCategory) => {
  const controlGlyph = getControlOperationGlyph(type);
  const glyph = controlGlyph ?? getOperationNodeGlyph(type, kind);
  const tileCategory = controlGlyph && type !== 'scope' ? 'control' : type === 'agent' || type === 'nestedagent' ? 'agent' : category;
  return glyph ? { ...glyph, category: tileCategory } : undefined;
};

const matchesKnownOperation = (key: string, type: string, kind: string | undefined, isTrigger: boolean) => {
  const known = getKnownOperations().get(key);
  if (known) {
    return type === known.type && kind === known.kind && isTrigger === known.isTrigger;
  }

  // Standard can also return server-only operations. Check their exact manifest identity.
  try {
    const { connectorId, operationId } = getBuiltInOperationInfo({ type, kind }, isTrigger);
    return key === operationKey(connectorId, operationId);
  } catch (error) {
    if (error instanceof UnsupportedException) {
      return false;
    }
    throw error;
  }
};

type Glyph = NonNullable<ReturnType<typeof resolveGlyph>>;

const OperationGlyphTile = ({ glyph, picker }: { glyph: Glyph; picker?: boolean }) => {
  const styles = useStyles();
  return (
    <NodeIconTile
      category={glyph.category}
      className={picker ? styles.pickerTile : undefined}
      icon={glyph.icon}
      size="small"
      tone={glyph.tone}
    />
  );
};

export const getPanelOperationGlyph = (type: string | undefined, kind: string | undefined, category: NodeCategory) => {
  const glyph = type && resolveGlyph(type.toLowerCase(), kind, category);
  return glyph ? <OperationGlyphTile glyph={glyph} /> : undefined;
};

export const getPickerOperationGlyph = (operation: DiscoveryRow) => {
  const { properties, id } = operation;
  const apiId = properties.api?.id;
  // Use the same type/kind pair as addOperation. A contradictory raw pair cannot authorize a replacement,
  // while allowing Consumption payloads whose raw `type` echoes `id` (e.g. `invokeworkflow` with `operationType: Workflow`).
  const type = normalize(properties.operationType);
  const kind = normalize(properties.operationKind);
  const rawType = normalize(operation.type);
  const rawKind = normalize(operation.kind);
  const normalizedId = normalize(id);
  const rawTypeMatches = !rawType || rawType === type || rawType === normalizedId;
  if (!apiId || !id || !type || !rawTypeMatches || (rawKind && rawKind !== kind) || properties.isCustomApi) {
    return undefined;
  }
  const isTrigger = !!properties.trigger;
  const glyph = resolveGlyph(type, kind, isTrigger ? 'trigger' : 'action');
  return glyph && matchesKnownOperation(operationKey(apiId, id), type, kind, isTrigger) ? (
    <OperationGlyphTile glyph={glyph} picker />
  ) : undefined;
};
