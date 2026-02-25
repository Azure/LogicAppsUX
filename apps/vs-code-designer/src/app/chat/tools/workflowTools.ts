/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';
import * as fse from 'fs-extra';
import type { WorkflowTypeOption } from '../chatConstants';
import { ToolName } from '../chatConstants';
import {
  azurePublicBaseUrl,
  connectionsFileName,
  extensionCommand,
  localSettingsFileName,
  workflowFileName,
  workflowManagementBaseURIKey,
  workflowTenantIdKey,
} from '../../../constants';
import { getAuthorizationToken } from '../../utils/codeless/getAuthorizationToken';
import { HttpClient } from '@microsoft/vscode-extension-logic-apps';

/**
 * Parameters for creating a workflow
 */
export interface CreateWorkflowParams {
  name: string;
  type: WorkflowTypeOption;
  description?: string;
}

/**
 * Parameters for modifying an action
 */
export interface ModifyActionParams {
  workflowName: string;
  projectName?: string;
  actionName: string;
  modification: string;
}

/**
 * Parameters for adding an action
 */
export interface AddActionParams {
  workflowName: string;
  projectName?: string;
  actionType: string;
  actionName: string;
  configuration?: Record<string, unknown>;
  connectorReference?: string;
  connectorId?: string;
  operationId?: string;
  method?: string;
  path?: string;
}

/**
 * Result of a workflow operation
 */
export interface WorkflowOperationResult {
  success: boolean;
  message: string;
  workflowPath?: string;
  error?: string;
}

interface ProjectConnectionsInfo {
  managedApiReferences: string[];
  managedApiReferencesWithApiId: string[];
  managedApiIdByReference: Record<string, string>;
  workflowManagementBaseUri?: string;
  workflowTenantId?: string;
  weatherManagedReference?: string;
}

export interface ApiConnectionHints {
  connectorReference?: string;
  connectorId?: string;
  operationId?: string;
  method?: string;
  path?: string;
}

function getManagedApiConnections(connectionsData: Record<string, unknown>): Record<string, unknown> {
  return typeof connectionsData.managedApiConnections === 'object' && connectionsData.managedApiConnections !== null
    ? (connectionsData.managedApiConnections as Record<string, unknown>)
    : {};
}

function getManagedApiId(connectionValue: unknown): string | undefined {
  const apiId =
    typeof connectionValue === 'object' && connectionValue !== null
      ? ((connectionValue as Record<string, unknown>).api as Record<string, unknown> | undefined)?.id
      : undefined;

  return typeof apiId === 'string' && apiId.trim() ? apiId : undefined;
}

function normalizeTypeToken(actionType: string): string {
  return actionType
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Returns true when an action type represents a workflow trigger shape.
 * @internal Exported for testing
 */
export function isTriggerType(actionType: string): boolean {
  const normalized = normalizeTypeToken(actionType);
  return normalized === 'request' || normalized === 'manual' || normalized === 'recurrence';
}

/**
 * Build a trigger definition from an actionType/configuration pair.
 * @internal Exported for testing
 */
export function buildTriggerDefinition(actionType: string, configuration?: Record<string, unknown>): Record<string, unknown> {
  const normalized = normalizeTypeToken(actionType);
  const config = configuration ? { ...configuration } : {};

  if (normalized === 'request' || normalized === 'manual') {
    const inputsValue = typeof config.inputs === 'object' && config.inputs !== null ? (config.inputs as Record<string, unknown>) : config;

    return {
      type: 'Request',
      kind: typeof config.kind === 'string' ? config.kind : 'Http',
      inputs: inputsValue,
    };
  }

  if (normalized === 'recurrence') {
    const inputsValue = typeof config.inputs === 'object' && config.inputs !== null ? (config.inputs as Record<string, unknown>) : config;

    return {
      type: 'Recurrence',
      recurrence: inputsValue,
    };
  }

  return {
    type: actionType,
    inputs: config,
  };
}

/**
 * Build an action definition from an actionType/configuration pair.
 * @internal Exported for testing
 */
export function buildActionDefinition(actionType: string, configuration?: Record<string, unknown>): Record<string, unknown> {
  const config = configuration ? { ...configuration } : {};
  const hasExplicitType = Object.prototype.hasOwnProperty.call(config, 'type');
  const topLevelInputs =
    typeof config.inputs === 'object' && config.inputs !== null
      ? ({ ...(config.inputs as Record<string, unknown>) } as Record<string, unknown>)
      : undefined;
  const topLevelRunAfter =
    typeof config.runAfter === 'object' && config.runAfter !== null
      ? ({ ...(config.runAfter as Record<string, unknown>) } as Record<string, unknown>)
      : undefined;

  if (hasExplicitType || topLevelInputs || topLevelRunAfter) {
    const actionDefinition: Record<string, unknown> = {
      ...config,
      type: actionType,
    };

    const resolvedInputs = topLevelInputs ? { ...topLevelInputs } : {};
    const nestedRunAfter =
      typeof resolvedInputs.runAfter === 'object' && resolvedInputs.runAfter !== null
        ? ({ ...(resolvedInputs.runAfter as Record<string, unknown>) } as Record<string, unknown>)
        : undefined;

    delete resolvedInputs.runAfter;

    actionDefinition.inputs = resolvedInputs;
    actionDefinition.runAfter = topLevelRunAfter ?? nestedRunAfter ?? {};

    return actionDefinition;
  }

  const normalizedInputs = { ...config };
  const nestedRunAfter =
    typeof normalizedInputs.runAfter === 'object' && normalizedInputs.runAfter !== null
      ? ({ ...(normalizedInputs.runAfter as Record<string, unknown>) } as Record<string, unknown>)
      : undefined;

  delete normalizedInputs.runAfter;

  return {
    type: actionType,
    inputs: normalizedInputs,
    runAfter: nestedRunAfter ?? {},
  };
}

/**
 * Detect a weather connector reference from a connections.json object.
 * @internal Exported for testing
 */
export function detectWeatherManagedApiReference(connectionsData: Record<string, unknown>): string | undefined {
  const managedApiConnections = getManagedApiConnections(connectionsData);

  for (const [referenceName, value] of Object.entries(managedApiConnections)) {
    const apiId = getManagedApiId(value);
    if (!apiId) {
      continue;
    }

    const normalizedReference = referenceName.toLowerCase();
    const normalizedApiId = apiId.toLowerCase();

    if (normalizedReference.includes('weather') || normalizedApiId.includes('weather')) {
      return referenceName;
    }
  }

  return undefined;
}

/**
 * Returns true when a requested action appears to be weather retrieval intent.
 * @internal Exported for testing
 */
export function shouldAutoUseWeatherConnector(actionType: string, actionName: string, configuration?: Record<string, unknown>): boolean {
  const normalizedType = normalizeTypeToken(actionType);
  if (normalizedType !== 'http' && normalizedType !== 'apiconnection') {
    return false;
  }

  const inputs =
    typeof configuration?.inputs === 'object' && configuration.inputs !== null
      ? (configuration.inputs as Record<string, unknown>)
      : undefined;

  const uri = typeof configuration?.uri === 'string' ? configuration.uri : typeof inputs?.uri === 'string' ? inputs.uri : '';
  const pathValue = typeof configuration?.path === 'string' ? configuration.path : typeof inputs?.path === 'string' ? inputs.path : '';

  const combined = `${actionName} ${uri} ${pathValue}`.toLowerCase();
  return combined.includes('weather') || combined.includes('seattle') || combined.includes('open-meteo');
}

function normalizeReferenceToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function extractActionInputs(configuration?: Record<string, unknown>): Record<string, unknown> {
  if (!configuration) {
    return {};
  }

  if (typeof configuration.inputs === 'object' && configuration.inputs !== null) {
    return configuration.inputs as Record<string, unknown>;
  }

  return configuration;
}

function extractApiConnectionHints(
  configuration?: Record<string, unknown>,
  overrideHints?: Partial<ApiConnectionHints>
): ApiConnectionHints {
  const inputs = extractActionInputs(configuration);
  const methodFromInputs = typeof inputs.method === 'string' ? inputs.method : undefined;
  const pathFromInputs = typeof inputs.path === 'string' ? inputs.path : undefined;
  const operationIdFromInputs = typeof inputs.operationId === 'string' ? inputs.operationId : undefined;

  const hints: ApiConnectionHints = {
    connectorReference:
      overrideHints?.connectorReference ||
      (typeof configuration?.connectorReference === 'string' ? configuration.connectorReference : undefined) ||
      (typeof configuration?.referenceName === 'string' ? configuration.referenceName : undefined) ||
      getApiConnectionReferenceName(inputs),
    connectorId: overrideHints?.connectorId || (typeof configuration?.connectorId === 'string' ? configuration.connectorId : undefined),
    operationId:
      overrideHints?.operationId || (typeof configuration?.operationId === 'string' ? configuration.operationId : operationIdFromInputs),
    method: overrideHints?.method || (typeof configuration?.method === 'string' ? configuration.method : methodFromInputs),
    path: overrideHints?.path || (typeof configuration?.path === 'string' ? configuration.path : pathFromInputs),
  };

  return hints;
}

/**
 * Resolve a managed connector reference case-insensitively against available references.
 * @internal Exported for testing
 */
export function resolveManagedApiReferenceName(
  referenceHint: string | undefined,
  managedApiReferencesWithApiId: readonly string[]
): string | undefined {
  if (!referenceHint || managedApiReferencesWithApiId.length === 0) {
    return undefined;
  }

  const exact = managedApiReferencesWithApiId.find((name) => name.toLowerCase() === referenceHint.toLowerCase());
  if (exact) {
    return exact;
  }

  const normalizedHint = normalizeReferenceToken(referenceHint);
  if (!normalizedHint) {
    return undefined;
  }

  return managedApiReferencesWithApiId.find((name) => normalizeReferenceToken(name) === normalizedHint);
}

/**
 * Build a generic ApiConnection action shape.
 * @internal Exported for testing
 */
export function buildManagedApiConnectionAction(
  referenceName: string,
  method: string,
  pathValue: string,
  configuration?: Record<string, unknown>
): Record<string, unknown> {
  const runAfter =
    typeof configuration?.runAfter === 'object' && configuration.runAfter !== null
      ? (configuration.runAfter as Record<string, unknown>)
      : {};

  const sourceInputs = { ...extractActionInputs(configuration) };
  delete sourceInputs.type;
  delete sourceInputs.host;
  delete sourceInputs.connectorReference;
  delete sourceInputs.connectorId;
  delete sourceInputs.referenceName;
  delete sourceInputs.operationId;
  delete sourceInputs.runAfter;

  return {
    type: 'ApiConnection',
    inputs: {
      ...sourceInputs,
      host: {
        connection: {
          referenceName,
        },
      },
      method: method.toLowerCase(),
      path: pathValue,
    },
    runAfter,
  };
}

function getApiConnectionReferenceName(inputs: Record<string, unknown>): string | undefined {
  const host = typeof inputs.host === 'object' && inputs.host !== null ? (inputs.host as Record<string, unknown>) : undefined;
  const connection =
    host && typeof host.connection === 'object' && host.connection !== null ? (host.connection as Record<string, unknown>) : undefined;

  if (connection && typeof connection.referenceName === 'string' && connection.referenceName.trim()) {
    return connection.referenceName;
  }

  if (connection && typeof connection.name === 'string' && connection.name.trim()) {
    return connection.name;
  }

  if (host && typeof host.connection === 'string' && host.connection.trim()) {
    return host.connection;
  }

  return undefined;
}

/**
 * Validate that an ApiConnection reference exists in connections.json and has an api.id.
 * @internal Exported for testing
 */
export function validateApiConnectionReferenceExists(
  configuration: Record<string, unknown> | undefined,
  managedApiReferencesWithApiId: readonly string[]
): string | undefined {
  const inputs = configuration ?? {};
  const referenceNameHint = getApiConnectionReferenceName(inputs);

  if (!referenceNameHint) {
    return undefined;
  }

  const referenceName = resolveManagedApiReferenceName(referenceNameHint, managedApiReferencesWithApiId);

  if (referenceName && managedApiReferencesWithApiId.includes(referenceName)) {
    return undefined;
  }

  const available = managedApiReferencesWithApiId;
  const hint =
    available.length > 0
      ? ` Valid managed connection references with api.id: ${available.join(', ')}.`
      : ' No managed connection references with api.id were found in connections.json.';

  return `ApiConnection reference "${referenceNameHint}" could not be resolved to a managed API with api.id in connections.json.${hint}`;
}

/**
 * Build a Seattle weather connector action in ApiConnection shape.
 * @internal Exported for testing
 */
export function buildSeattleWeatherConnectorAction(referenceName: string): Record<string, unknown> {
  return {
    type: 'ApiConnection',
    inputs: {
      host: {
        connection: {
          referenceName,
        },
      },
      method: 'get',
      path: "/current/@{encodeURIComponent('98101')}",
      queries: {
        units: 'I',
      },
    },
    runAfter: {},
  };
}

function resolveManagedApiReferenceByConnectorId(
  connectorIdHint: string | undefined,
  managedApiIdByReference: Record<string, string>
): string | undefined {
  if (!connectorIdHint) {
    return undefined;
  }

  const normalizedHint = connectorIdHint.toLowerCase().trim();
  if (!normalizedHint) {
    return undefined;
  }

  const exactMatch = Object.entries(managedApiIdByReference).find(([, apiId]) => apiId.toLowerCase() === normalizedHint);
  if (exactMatch) {
    return exactMatch[0];
  }

  const containsMatch = Object.entries(managedApiIdByReference).find(([, apiId]) => apiId.toLowerCase().includes(normalizedHint));
  if (containsMatch) {
    return containsMatch[0];
  }

  const simpleHint = normalizedHint.split('/').filter(Boolean).pop();
  if (!simpleHint) {
    return undefined;
  }

  const managedApiMatch = Object.entries(managedApiIdByReference).find(([, apiId]) =>
    apiId.toLowerCase().endsWith(`/managedapis/${simpleHint}`)
  );
  return managedApiMatch?.[0];
}

export interface ManagedApiOperation {
  id?: string;
  name?: string;
  properties?: {
    summary?: string;
    description?: string;
    swaggerOperationId?: string;
    trigger?: string;
  };
}

export interface SwaggerOperationResolution {
  method: string;
  path: string;
  operationId?: string;
}

interface SwaggerOperationCandidate {
  method: string;
  path: string;
  operationId: string;
  summary?: string;
  description?: string;
}

function normalizeManagementBaseUri(baseUri?: string): string {
  const fallback = azurePublicBaseUrl;
  const normalized = (baseUri ?? fallback).trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.replace(/\/+$/, '');
}

async function createArmHttpClient(projectConnections: ProjectConnectionsInfo): Promise<HttpClient | undefined> {
  try {
    const accessToken = await getAuthorizationToken(projectConnections.workflowTenantId);
    const managementBaseUri = normalizeManagementBaseUri(projectConnections.workflowManagementBaseUri);
    return new HttpClient({
      accessToken,
      baseUrl: managementBaseUri,
      apiHubBaseUrl: managementBaseUri,
    });
  } catch {
    return undefined;
  }
}

function getOperationIdTail(operationId: string | undefined): string {
  if (!operationId) {
    return '';
  }

  return operationId.split('/').filter(Boolean).pop()?.toLowerCase() ?? '';
}

function normalizeOperationHintValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function scoreOperationHintMatch(operation: ManagedApiOperation, operationHint: string): number {
  const normalizedHint = normalizeOperationHintValue(operationHint);
  if (!normalizedHint) {
    return 0;
  }

  const matchTargets = [operation.name, getOperationIdTail(operation.id), operation.properties?.swaggerOperationId]
    .map((value) => normalizeOperationHintValue(value ?? ''))
    .filter((value) => value.length > 0);

  let bestScore = 0;
  for (const target of matchTargets) {
    if (target === normalizedHint) {
      bestScore = Math.max(bestScore, 140);
      continue;
    }

    if (target.startsWith(normalizedHint) || normalizedHint.startsWith(target)) {
      bestScore = Math.max(bestScore, 95);
      continue;
    }

    if (target.includes(normalizedHint) || normalizedHint.includes(target)) {
      bestScore = Math.max(bestScore, 60);
    }
  }

  return bestScore;
}

function selectOperationByHint(operationHint: string, operations: ManagedApiOperation[]): ManagedApiOperation | undefined {
  let bestScore = 0;
  let bestMatch: ManagedApiOperation | undefined;

  for (const operation of operations) {
    if (operation.properties?.trigger) {
      continue;
    }

    const score = scoreOperationHintMatch(operation, operationHint);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = operation;
    }
  }

  return bestScore > 0 ? bestMatch : undefined;
}

function getActionIntentMethods(actionName: string): Set<string> {
  const actionTokens = new Set(tokenizeOperationText(actionName));
  const methods = new Set<string>();

  if (['list', 'get', 'read', 'fetch', 'query', 'find'].some((token) => actionTokens.has(token))) {
    methods.add('get');
  }

  if (['create', 'add', 'insert', 'send', 'publish', 'enqueue', 'submit', 'post'].some((token) => actionTokens.has(token))) {
    methods.add('post');
  }

  if (['update', 'replace', 'upsert', 'set', 'modify'].some((token) => actionTokens.has(token))) {
    methods.add('patch');
    methods.add('put');
  }

  if (['delete', 'remove'].some((token) => actionTokens.has(token))) {
    methods.add('delete');
  }

  return methods;
}

interface ActionIntentSignals {
  wantsSingleEntity: boolean;
  wantsCollection: boolean;
  wantsSendMessage: boolean;
  wantsReceiveMessage: boolean;
  wantsPeekMessage: boolean;
}

function getActionIntentSignals(actionName: string): ActionIntentSignals {
  const actionTokens = new Set(tokenizeOperationText(actionName));
  const normalizedAction = actionName.toLowerCase();
  const hasAny = (candidates: string[]): boolean => candidates.some((token) => actionTokens.has(token));

  const wantsSingleEntity =
    hasAny(['single', 'one', 'row', 'item', 'record', 'message']) &&
    (hasAny(['id', 'key', 'specific']) || normalizedAction.includes('by id') || normalizedAction.includes('by key'));

  const wantsCollection = hasAny(['list', 'all', 'many', 'rows', 'items', 'records', 'messages', 'query', 'search']);
  const wantsSendMessage = hasAny(['send', 'publish', 'enqueue', 'push', 'submit']);
  const wantsReceiveMessage = hasAny(['receive', 'read', 'pull', 'consume', 'dequeue']);
  const wantsPeekMessage = hasAny(['peek', 'browse']);

  return {
    wantsSingleEntity,
    wantsCollection,
    wantsSendMessage,
    wantsReceiveMessage,
    wantsPeekMessage,
  };
}

function scoreConnectorIntent(operationText: string, actionName: string): number {
  const normalizedOperation = operationText.toLowerCase();
  const signals = getActionIntentSignals(actionName);
  let score = 0;

  const matchesSingleEntity = /(getitem|getrow|getrecord|getmessage|find.*id|byid|bykey|single)/.test(normalizedOperation);
  const matchesCollection = /(getitems|getrows|getrecords|getmessages|list|query|search|all)/.test(normalizedOperation);
  const matchesSend = /(send|publish|enqueue|postmessage|createmessage)/.test(normalizedOperation);
  const matchesReceive = /(receive|dequeue|consume|readmessage|getmessages|pull)/.test(normalizedOperation);
  const matchesPeek = /(peek|peeklock|browse)/.test(normalizedOperation);

  if (signals.wantsSingleEntity) {
    score += matchesSingleEntity ? 28 : 0;
    score -= matchesCollection ? 16 : 0;
  }

  if (signals.wantsCollection) {
    score += matchesCollection ? 24 : 0;
    score -= matchesSingleEntity ? 14 : 0;
  }

  if (signals.wantsSendMessage) {
    score += matchesSend ? 30 : 0;
    score -= matchesReceive ? 18 : 0;
  }

  if (signals.wantsReceiveMessage) {
    score += matchesReceive ? 28 : 0;
    score -= matchesSend ? 18 : 0;
  }

  if (signals.wantsPeekMessage) {
    score += matchesPeek ? 24 : 0;
    score -= matchesSend ? 12 : 0;
  }

  return score;
}

function scoreOperationForActionName(actionName: string, operation: ManagedApiOperation, hints?: Partial<ApiConnectionHints>): number {
  const operationSearchText = getOperationSearchText(operation).toLowerCase();
  const operationIdentifiers =
    `${operation.name ?? ''} ${operation.properties?.swaggerOperationId ?? ''} ${getOperationIdTail(operation.id)}`.toLowerCase();
  const actionTokens = tokenizeOperationText(actionName);

  let score = 0;

  const normalizedActionName = normalizeOperationHintValue(actionName);
  const normalizedOperationName = normalizeOperationHintValue(operation.name ?? '');
  const normalizedSwaggerOperationId = normalizeOperationHintValue(operation.properties?.swaggerOperationId ?? '');

  if (normalizedActionName && (normalizedActionName === normalizedOperationName || normalizedActionName === normalizedSwaggerOperationId)) {
    score += 140;
  }

  for (const token of actionTokens) {
    if (operationIdentifiers.includes(token)) {
      score += 14;
    } else if (operationSearchText.includes(token)) {
      score += 6;
    }
  }

  if (hints?.operationId) {
    score += scoreOperationHintMatch(operation, hints.operationId);
  }

  const actionIntentMethods = getActionIntentMethods(actionName);
  const swaggerOperationId = operation.properties?.swaggerOperationId?.toLowerCase() ?? '';
  if (actionIntentMethods.has('post') && /(create|add|insert|send|publish|enqueue|post)/.test(swaggerOperationId)) {
    score += 18;
  }
  if (actionIntentMethods.has('get') && /(get|list|read|query|find)/.test(swaggerOperationId)) {
    score += 18;
  }
  if (actionIntentMethods.has('delete') && /(delete|remove)/.test(swaggerOperationId)) {
    score += 18;
  }
  if ((actionIntentMethods.has('patch') || actionIntentMethods.has('put')) && /(update|modify|replace|set)/.test(swaggerOperationId)) {
    score += 18;
  }

  score += scoreConnectorIntent(`${operationIdentifiers} ${operationSearchText}`, actionName);

  return score;
}

function listSwaggerOperationCandidates(swagger: Record<string, unknown>): SwaggerOperationCandidate[] {
  const paths = typeof swagger.paths === 'object' && swagger.paths !== null ? (swagger.paths as Record<string, unknown>) : undefined;
  if (!paths) {
    return [];
  }

  const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
  const candidates: SwaggerOperationCandidate[] = [];

  for (const [pathValue, pathItem] of Object.entries(paths)) {
    if (typeof pathItem !== 'object' || pathItem === null) {
      continue;
    }

    const pathItemRecord = pathItem as Record<string, unknown>;
    for (const method of httpMethods) {
      const operation = pathItemRecord[method];
      if (typeof operation !== 'object' || operation === null) {
        continue;
      }

      const operationRecord = operation as Record<string, unknown>;
      const operationId =
        typeof operationRecord.operationId === 'string' && operationRecord.operationId.trim()
          ? operationRecord.operationId
          : `${method}:${pathValue}`;

      candidates.push({
        method,
        path: pathValue,
        operationId,
        summary: typeof operationRecord.summary === 'string' ? operationRecord.summary : undefined,
        description: typeof operationRecord.description === 'string' ? operationRecord.description : undefined,
      });
    }
  }

  return candidates;
}

function scoreSwaggerOperationCandidate(
  candidate: SwaggerOperationCandidate,
  actionName: string,
  operationHints: string[],
  hints: ApiConnectionHints
): number {
  const candidateOperationId = normalizeOperationHintValue(candidate.operationId);
  const candidatePath = normalizeOperationHintValue(candidate.path);
  const candidateMethod = candidate.method.toLowerCase();
  const candidateSearchText =
    `${candidate.operationId} ${candidate.summary ?? ''} ${candidate.description ?? ''} ${candidate.path}`.toLowerCase();
  const actionTokens = tokenizeOperationText(actionName);

  let score = 0;

  if (hints.method && candidateMethod === hints.method.toLowerCase().trim()) {
    score += 120;
  }

  if (hints.path) {
    const normalizedHintPath = normalizeOperationHintValue(hints.path);
    if (normalizedHintPath) {
      if (candidatePath === normalizedHintPath) {
        score += 140;
      } else if (candidatePath.includes(normalizedHintPath) || normalizedHintPath.includes(candidatePath)) {
        score += 70;
      }
    }
  }

  for (let i = 0; i < operationHints.length; i++) {
    const normalizedHint = normalizeOperationHintValue(operationHints[i]);
    if (!normalizedHint) {
      continue;
    }

    const weight = Math.max(140 - i * 20, 40);
    if (candidateOperationId === normalizedHint) {
      score += weight;
      continue;
    }

    if (candidateOperationId.startsWith(normalizedHint) || normalizedHint.startsWith(candidateOperationId)) {
      score += Math.floor(weight * 0.7);
      continue;
    }

    if (candidateOperationId.includes(normalizedHint) || normalizedHint.includes(candidateOperationId)) {
      score += Math.floor(weight * 0.45);
    }
  }

  for (const token of actionTokens) {
    if (candidateOperationId.includes(token)) {
      score += 10;
    } else if (candidateSearchText.includes(token)) {
      score += 4;
    }
  }

  const actionIntentMethods = getActionIntentMethods(actionName);
  if (actionIntentMethods.has(candidateMethod)) {
    score += 20;
  }

  if (/\b(when|trigger|onnew|onupdated|oncreated)\b/.test(candidate.operationId.toLowerCase())) {
    score -= 25;
  }

  score += scoreConnectorIntent(
    `${candidate.operationId} ${candidate.summary ?? ''} ${candidate.description ?? ''} ${candidate.path}`,
    actionName
  );

  return score;
}

function selectSwaggerOperationCandidate(
  candidates: SwaggerOperationCandidate[],
  actionName: string,
  operationHints: string[],
  hints: ApiConnectionHints
): SwaggerOperationCandidate | undefined {
  if (candidates.length === 0) {
    return undefined;
  }

  const hintedMethod = typeof hints.method === 'string' ? hints.method.trim().toLowerCase() : '';
  const hintedPath = typeof hints.path === 'string' ? normalizeOperationHintValue(hints.path) : '';

  const strictMethodAndPathCandidates =
    hintedMethod && hintedPath
      ? candidates.filter(
          (candidate) => candidate.method.toLowerCase() === hintedMethod && normalizeOperationHintValue(candidate.path) === hintedPath
        )
      : [];

  const strictMethodCandidates =
    hintedMethod && !hintedPath ? candidates.filter((candidate) => candidate.method.toLowerCase() === hintedMethod) : [];

  const strictPathCandidates =
    hintedPath && !hintedMethod ? candidates.filter((candidate) => normalizeOperationHintValue(candidate.path) === hintedPath) : [];

  const rankingCandidates =
    strictMethodAndPathCandidates.length > 0
      ? strictMethodAndPathCandidates
      : strictMethodCandidates.length > 0
        ? strictMethodCandidates
        : strictPathCandidates.length > 0
          ? strictPathCandidates
          : candidates;

  let bestScore = Number.NEGATIVE_INFINITY;
  let bestCandidate: SwaggerOperationCandidate | undefined;

  for (const candidate of rankingCandidates) {
    const score = scoreSwaggerOperationCandidate(candidate, actionName, operationHints, hints);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestScore > 0 ? bestCandidate : undefined;
}

export function selectOperationByActionName(
  actionName: string,
  operations: ManagedApiOperation[],
  hints?: Partial<ApiConnectionHints>
): ManagedApiOperation | undefined {
  if (operations.length === 0) {
    return undefined;
  }

  let bestScore = 0;
  let bestMatch: ManagedApiOperation | undefined;

  for (const operation of operations) {
    if (operation.properties?.trigger) {
      continue;
    }

    const score = scoreOperationForActionName(actionName, operation, hints);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = operation;
    }
  }

  return bestScore > 0 ? bestMatch : undefined;
}

export function resolveSwaggerOperation(
  swagger: Record<string, unknown>,
  actionName: string,
  operationHints: string[],
  hints: ApiConnectionHints
): SwaggerOperationResolution | undefined {
  const candidates = listSwaggerOperationCandidates(swagger);
  if (candidates.length === 0) {
    return undefined;
  }

  const selectedCandidate = selectSwaggerOperationCandidate(candidates, actionName, operationHints, hints);
  if (!selectedCandidate) {
    return undefined;
  }

  return {
    method: selectedCandidate.method,
    path: selectedCandidate.path,
    operationId: selectedCandidate.operationId,
  };
}
function tokenizeOperationText(value: string): string[] {
  const stopWords = new Set(['a', 'an', 'the', 'to', 'from', 'for', 'and', 'or', 'api', 'action', 'connector', 'connection']);
  const normalized = value.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const baseTokens = normalized
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !stopWords.has(token));

  const expandedTokens = new Set<string>();
  for (const token of baseTokens) {
    expandedTokens.add(token);

    if (token.endsWith('ies') && token.length > 4) {
      expandedTokens.add(`${token.slice(0, -3)}y`);
    } else if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) {
      expandedTokens.add(token.slice(0, -1));
    }
  }

  return Array.from(expandedTokens);
}

function getOperationSearchText(operation: ManagedApiOperation): string {
  return `${operation.name ?? ''} ${operation.properties?.summary ?? ''} ${operation.properties?.description ?? ''} ${
    operation.properties?.swaggerOperationId ?? ''
  }`;
}

async function listManagedApiOperations(connectorId: string, client: HttpClient): Promise<ManagedApiOperation[]> {
  try {
    const response = await client.get<{ value?: ManagedApiOperation[] } | ManagedApiOperation[]>({
      uri: `${connectorId}/apiOperations`,
      queryParameters: {
        'api-version': '2018-07-01-preview',
        $filter: 'properties/trigger eq null',
      },
    });

    if (Array.isArray(response)) {
      return response;
    }

    return Array.isArray(response.value) ? response.value : [];
  } catch {
    return [];
  }
}

async function fetchConnectorSwagger(connectorId: string, client: HttpClient): Promise<Record<string, unknown> | undefined> {
  try {
    const swagger = await client.get<Record<string, unknown>>({
      uri: connectorId,
      queryParameters: {
        'api-version': '2018-07-01-preview',
        export: 'true',
      },
    });

    return swagger;
  } catch {
    return undefined;
  }
}

async function resolveManagedApiOperationFromSwagger(
  connectorId: string,
  actionName: string,
  hints: ApiConnectionHints,
  projectConnections: ProjectConnectionsInfo
): Promise<{ method: string; path: string; operationId?: string } | undefined> {
  const client = await createArmHttpClient(projectConnections);
  if (!client) {
    return undefined;
  }

  const operations = await listManagedApiOperations(connectorId, client);

  const operationFromHint = hints.operationId ? selectOperationByHint(hints.operationId, operations) : undefined;
  const operationFromActionName = operationFromHint ? undefined : selectOperationByActionName(actionName, operations, hints);
  const selectedOperation = operationFromHint ?? operationFromActionName;

  const operationHints = [
    selectedOperation?.properties?.swaggerOperationId,
    selectedOperation?.name,
    getOperationIdTail(selectedOperation?.id),
    hints.operationId,
  ].filter((value): value is string => Boolean(value && value.trim()));
  const uniqueOperationHints = Array.from(new Set(operationHints));

  const swagger = await fetchConnectorSwagger(connectorId, client);
  if (!swagger) {
    return undefined;
  }

  const resolved = resolveSwaggerOperation(swagger, actionName, uniqueOperationHints, hints);
  if (!resolved) {
    return undefined;
  }

  return {
    method: resolved.method,
    path: resolved.path,
    operationId: selectedOperation?.name ?? resolved.operationId ?? hints.operationId,
  };
}

async function resolveGenericApiConnectionAction(
  actionType: string,
  actionName: string,
  configuration: Record<string, unknown> | undefined,
  projectConnections: ProjectConnectionsInfo,
  overrideHints?: Partial<ApiConnectionHints>
): Promise<{ action?: Record<string, unknown>; completionSuffix?: string; error?: string }> {
  const normalizedType = normalizeTypeToken(actionType);
  if (normalizedType !== 'http' && normalizedType !== 'apiconnection') {
    return {};
  }

  const hints = extractApiConnectionHints(configuration, overrideHints);

  const resolvedReferenceFromName = resolveManagedApiReferenceName(
    hints.connectorReference,
    projectConnections.managedApiReferencesWithApiId
  );
  const resolvedReferenceFromConnectorId = resolveManagedApiReferenceByConnectorId(
    hints.connectorId,
    projectConnections.managedApiIdByReference
  );
  const resolvedReference = resolvedReferenceFromName ?? resolvedReferenceFromConnectorId;

  let method = typeof hints.method === 'string' ? hints.method.trim() : '';
  let pathValue = typeof hints.path === 'string' ? hints.path.trim() : '';
  let operationId = hints.operationId;

  if ((hints.connectorReference || hints.connectorId) && !resolvedReference) {
    const refsHint =
      projectConnections.managedApiReferencesWithApiId.length > 0
        ? ` Available managed connection references with api.id: ${projectConnections.managedApiReferencesWithApiId.join(', ')}.`
        : ' No managed connection references with api.id were found in connections.json.';

    const unresolvedHint = hints.connectorReference || hints.connectorId;
    return {
      error: `Managed connector hint "${unresolvedHint}" could not be resolved to a connection reference in connections.json.${refsHint}`,
    };
  }

  if (!resolvedReference) {
    return {};
  }

  const resolvedConnectorId =
    projectConnections.managedApiIdByReference[resolvedReference] ??
    (typeof hints.connectorId === 'string' && hints.connectorId.startsWith('/subscriptions/') ? hints.connectorId : undefined);

  const shouldAttemptSwaggerResolution =
    Boolean(resolvedConnectorId) && (!method || !pathValue || !operationId || normalizedType === 'apiconnection');

  if (shouldAttemptSwaggerResolution && resolvedConnectorId) {
    const swaggerResolution = await resolveManagedApiOperationFromSwagger(resolvedConnectorId, actionName, hints, projectConnections);

    if (swaggerResolution) {
      method = swaggerResolution.method;
      pathValue = swaggerResolution.path;
      operationId = operationId ?? swaggerResolution.operationId;
    }
  }

  if (!method || !pathValue) {
    if (normalizedType === 'apiconnection') {
      return {
        error:
          'ApiConnection action requires method and path. Unable to resolve operation details from connector metadata/swagger. Provide operationId or explicit method/path in configuration.',
      };
    }

    return {};
  }

  const action = buildManagedApiConnectionAction(resolvedReference, method, pathValue, configuration);
  if (operationId) {
    action.operationId = operationId;
  }

  const completionSuffix = ` Resolved managed connector reference "${resolvedReference}" for action "${actionName}".`;

  return {
    action,
    completionSuffix,
  };
}

function validateApiConnectionConfiguration(configuration?: Record<string, unknown>): string | undefined {
  const inputs = configuration ?? {};
  const referenceName = getApiConnectionReferenceName(inputs);

  if (!referenceName) {
    return 'ApiConnection action requires a connection reference (inputs.host.connection.referenceName, inputs.host.connection.name, or inputs.host.connection string).';
  }

  if (typeof inputs.method !== 'string' || !inputs.method.trim()) {
    return 'ApiConnection action requires inputs.method.';
  }

  if (typeof inputs.path !== 'string' || !inputs.path.trim()) {
    return 'ApiConnection action requires inputs.path.';
  }

  return undefined;
}

function validateServiceProviderConfiguration(configuration?: Record<string, unknown>): string | undefined {
  const inputs = configuration ?? {};

  const serviceProviderConfiguration =
    typeof inputs.serviceProviderConfiguration === 'object' && inputs.serviceProviderConfiguration !== null
      ? (inputs.serviceProviderConfiguration as Record<string, unknown>)
      : undefined;

  if (!serviceProviderConfiguration) {
    return 'ServiceProvider action requires inputs.serviceProviderConfiguration.';
  }

  if (typeof serviceProviderConfiguration.connectionName !== 'string' || !serviceProviderConfiguration.connectionName.trim()) {
    return 'ServiceProvider action requires serviceProviderConfiguration.connectionName.';
  }

  if (typeof serviceProviderConfiguration.operationId !== 'string' || !serviceProviderConfiguration.operationId.trim()) {
    return 'ServiceProvider action requires serviceProviderConfiguration.operationId.';
  }

  if (typeof serviceProviderConfiguration.serviceProviderId !== 'string' || !serviceProviderConfiguration.serviceProviderId.trim()) {
    return 'ServiceProvider action requires serviceProviderConfiguration.serviceProviderId.';
  }

  return undefined;
}

async function getProjectConnectionsInfo(projectPath: string): Promise<ProjectConnectionsInfo> {
  const connectionsPath = path.join(projectPath, connectionsFileName);
  const localSettingsPath = path.join(projectPath, localSettingsFileName);

  let workflowManagementBaseUri: string | undefined;
  let workflowTenantId: string | undefined;

  try {
    if (await fse.pathExists(localSettingsPath)) {
      const localSettingsData = (await fse.readJson(localSettingsPath)) as Record<string, unknown>;
      const values =
        typeof localSettingsData.Values === 'object' && localSettingsData.Values !== null
          ? (localSettingsData.Values as Record<string, unknown>)
          : undefined;

      workflowManagementBaseUri =
        typeof values?.[workflowManagementBaseURIKey] === 'string' ? (values[workflowManagementBaseURIKey] as string) : undefined;
      workflowTenantId = typeof values?.[workflowTenantIdKey] === 'string' ? (values[workflowTenantIdKey] as string) : undefined;
    }
  } catch {
    // Ignore local settings read errors and continue with connection-only metadata
  }

  if (!(await fse.pathExists(connectionsPath))) {
    return {
      managedApiReferences: [],
      managedApiReferencesWithApiId: [],
      managedApiIdByReference: {},
      workflowManagementBaseUri,
      workflowTenantId,
    };
  }

  try {
    const connectionsData = (await fse.readJson(connectionsPath)) as Record<string, unknown>;
    const managedApiConnections = getManagedApiConnections(connectionsData);
    const managedApiReferences = Object.keys(managedApiConnections);
    const managedApiIdByReference = managedApiReferences.reduce<Record<string, string>>((result, referenceName) => {
      const apiId = getManagedApiId(managedApiConnections[referenceName]);
      if (apiId) {
        result[referenceName] = apiId;
      }
      return result;
    }, {});
    const managedApiReferencesWithApiId = Object.keys(managedApiIdByReference);

    return {
      managedApiReferences,
      managedApiReferencesWithApiId,
      managedApiIdByReference,
      workflowManagementBaseUri,
      workflowTenantId,
      weatherManagedReference: detectWeatherManagedApiReference(connectionsData),
    };
  } catch {
    return {
      managedApiReferences: [],
      managedApiReferencesWithApiId: [],
      managedApiIdByReference: {},
      workflowManagementBaseUri,
      workflowTenantId,
    };
  }
}

/**
 * Register workflow-related language model tools
 */
export function registerWorkflowTools(context: vscode.ExtensionContext): void {
  // Register create workflow tool
  context.subscriptions.push(vscode.lm.registerTool(ToolName.createWorkflow, new CreateWorkflowTool()));

  // Register list workflows tool
  context.subscriptions.push(vscode.lm.registerTool(ToolName.listWorkflows, new ListWorkflowsTool()));

  // Register get workflow definition tool
  context.subscriptions.push(vscode.lm.registerTool(ToolName.getWorkflowDefinition, new GetWorkflowDefinitionTool()));

  // Register add action tool
  context.subscriptions.push(vscode.lm.registerTool(ToolName.addAction, new AddActionTool()));

  // Register modify action tool
  context.subscriptions.push(vscode.lm.registerTool(ToolName.modifyAction, new ModifyActionTool()));
}

/**
 * Tool for creating a new workflow
 */
class CreateWorkflowTool implements vscode.LanguageModelTool<CreateWorkflowParams> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<CreateWorkflowParams>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { name } = options.input;

    try {
      // Validate workflow name
      if (!name || !isValidWorkflowName(name)) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Invalid workflow name "${name}". Workflow name must start with a letter and can only contain letters, digits, "_" and "-".`
          ),
        ]);
      }

      // Get workspace folder
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart('No workspace folder found. Please open a Logic App workspace first.'),
        ]);
      }

      // Execute the create workflow command - this opens the workflow creation wizard
      await vscode.commands.executeCommand(extensionCommand.createWorkflow);

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Opened the workflow creation wizard. Please enter "${name}" as the workflow name and complete the wizard to create your workflow.`
        ),
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Failed to create workflow: ${errorMessage}`)]);
    }
  }
}

/**
 * Tool for listing workflows in the current project
 */
class ListWorkflowsTool implements vscode.LanguageModelTool<Record<string, never>> {
  async invoke(
    _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    try {
      const workspaceSearchRoots = getWorkspaceSearchRoots();
      if (workspaceSearchRoots.length === 0) {
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('No workspace folder found.')]);
      }

      const projectPaths = await findLogicAppProjectsInWorkspace(workspaceSearchRoots);
      if (projectPaths.length === 0) {
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('No Logic App project found in the workspace.')]);
      }

      const workflowsByProject = await Promise.all(
        projectPaths.map(async (projectPath) => ({
          projectPath,
          workflows: await listWorkflowsInProject(projectPath),
        }))
      );

      const workflows = workflowsByProject.flatMap((entry) =>
        entry.workflows.map((workflow) => ({
          projectName: path.basename(entry.projectPath),
          ...workflow,
        }))
      );

      if (workflows.length === 0) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart('No workflows found in the project. Use /createWorkflow to create one.'),
        ]);
      }

      const workflowList = workflows.map((w) => `- ${w.projectName}/${w.name} (${w.type})`).join('\n');
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Found ${workflows.length} workflow(s) across ${workflowsByProject.length} project(s):\n${workflowList}`
        ),
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Failed to list workflows: ${errorMessage}`)]);
    }
  }
}

/**
 * Tool for getting workflow definition
 */
class GetWorkflowDefinitionTool implements vscode.LanguageModelTool<{ workflowName: string; projectName?: string }> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<{ workflowName: string; projectName?: string }>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { workflowName, projectName } = options.input;

    try {
      const workspaceSearchRoots = getWorkspaceSearchRoots();
      if (workspaceSearchRoots.length === 0) {
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('No workspace folder found.')]);
      }

      const workflowResolution = await resolveWorkflowPath(workspaceSearchRoots, workflowName, projectName);
      if (workflowResolution.status === 'noProject') {
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('No Logic App project found in the workspace.')]);
      }

      if (workflowResolution.status === 'notFound') {
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Workflow "${workflowName}" not found.`)]);
      }

      if (workflowResolution.status === 'projectNotFound') {
        const projects = workflowResolution.availableProjects.map((name) => `- ${name}`).join('\n');
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Project "${workflowResolution.requestedProjectName}" was not found. Please specify one of these project names:\n${projects}`
          ),
        ]);
      }

      if (workflowResolution.status === 'ambiguous') {
        const projects = workflowResolution.matches.map((m) => `- ${m.projectName}`).join('\n');
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Workflow "${workflowName}" exists in multiple projects. Please specify projectName.\n${projects}`
          ),
        ]);
      }

      const workflowPath = workflowResolution.match.workflowPath;

      const definition = await fse.readJson(workflowPath);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Workflow definition for "${workflowName}":\n\`\`\`json\n${JSON.stringify(definition, null, 2)}\n\`\`\``
        ),
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Failed to get workflow definition: ${errorMessage}`)]);
    }
  }
}

/**
 * Tool for adding an action to a workflow
 */
class AddActionTool implements vscode.LanguageModelTool<AddActionParams> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<AddActionParams>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const {
      workflowName,
      projectName,
      actionType,
      actionName,
      configuration,
      connectorReference,
      connectorId,
      operationId,
      method,
      path: operationPath,
    } = options.input;

    try {
      const workspaceSearchRoots = getWorkspaceSearchRoots();
      if (workspaceSearchRoots.length === 0) {
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('No workspace folder found.')]);
      }

      const workflowResolution = await resolveWorkflowPath(workspaceSearchRoots, workflowName, projectName);
      if (workflowResolution.status === 'noProject') {
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('No Logic App project found in the workspace.')]);
      }

      if (workflowResolution.status === 'notFound') {
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Workflow "${workflowName}" not found.`)]);
      }

      if (workflowResolution.status === 'projectNotFound') {
        const projects = workflowResolution.availableProjects.map((name) => `- ${name}`).join('\n');
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Project "${workflowResolution.requestedProjectName}" was not found. Please specify one of these project names:\n${projects}`
          ),
        ]);
      }

      if (workflowResolution.status === 'ambiguous') {
        const projects = workflowResolution.matches.map((m) => `- ${m.projectName}`).join('\n');
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Workflow "${workflowName}" exists in multiple projects. Please specify projectName.\n${projects}`
          ),
        ]);
      }

      const workflowPath = workflowResolution.match.workflowPath;

      const definition = await fse.readJson(workflowPath);
      const projectConnections = await getProjectConnectionsInfo(workflowResolution.match.projectPath);

      const isTrigger = isTriggerType(actionType);
      let nodeToWrite: Record<string, unknown>;
      const operationLabel = isTrigger ? 'trigger' : 'action';
      let operationTypeName = actionType;
      let completionSuffix = '';

      if (isTrigger) {
        if (!definition.definition.triggers) {
          definition.definition.triggers = {};
        }

        nodeToWrite = buildTriggerDefinition(actionType, configuration);
        definition.definition.triggers[actionName] = nodeToWrite;
      } else {
        const normalizedType = normalizeTypeToken(actionType);

        const genericResolvedAction = await resolveGenericApiConnectionAction(actionType, actionName, configuration, projectConnections, {
          connectorReference,
          connectorId,
          operationId,
          method,
          path: operationPath,
        });
        if (genericResolvedAction.error) {
          return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(genericResolvedAction.error)]);
        }

        if (genericResolvedAction.action) {
          nodeToWrite = genericResolvedAction.action;
          operationTypeName = 'ApiConnection';
          completionSuffix = genericResolvedAction.completionSuffix ?? '';
        } else if (shouldAutoUseWeatherConnector(actionType, actionName, configuration)) {
          if (!projectConnections.weatherManagedReference) {
            const refsHint =
              projectConnections.managedApiReferences.length > 0
                ? ` Available managed connection references: ${projectConnections.managedApiReferences.join(', ')}.`
                : ' No managed connection references found in connections.json.';

            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                `Weather action requested but no weather managed API connection was found in connections.json.${refsHint}`
              ),
            ]);
          }

          nodeToWrite = buildSeattleWeatherConnectorAction(projectConnections.weatherManagedReference);
          operationTypeName = 'ApiConnection';
          completionSuffix = ` Used connector reference "${projectConnections.weatherManagedReference}" from connections.json for a Logic Apps weather action.`;
        } else {
          if (normalizedType === 'apiconnection') {
            const validationError = validateApiConnectionConfiguration(extractActionInputs(configuration));
            if (validationError) {
              const refs = projectConnections.managedApiReferences;
              const refsHint =
                refs.length > 0
                  ? ` Available managed connection references: ${refs.join(', ')}.`
                  : ' No managed connection references found in connections.json.';

              return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`${validationError}${refsHint}`)]);
            }

            const referenceValidationError = validateApiConnectionReferenceExists(
              extractActionInputs(configuration),
              projectConnections.managedApiReferencesWithApiId
            );
            if (referenceValidationError) {
              return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(referenceValidationError)]);
            }
          }

          if (normalizedType === 'serviceprovider') {
            const validationError = validateServiceProviderConfiguration(extractActionInputs(configuration));
            if (validationError) {
              return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(validationError)]);
            }
          }

          nodeToWrite = buildActionDefinition(actionType, configuration);
        }

        if (!definition.definition.actions) {
          definition.definition.actions = {};
        }

        definition.definition.actions[actionName] = nodeToWrite;
      }

      await fse.writeJson(workflowPath, definition, { spaces: 2 });

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Successfully added ${operationLabel} "${actionName}" of type "${operationTypeName}" to workflow "${workflowName}". Open the designer to configure additional settings.${completionSuffix}`
        ),
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Failed to add action: ${errorMessage}`)]);
    }
  }
}

/**
 * Tool for modifying an action in a workflow
 */
class ModifyActionTool implements vscode.LanguageModelTool<ModifyActionParams> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ModifyActionParams>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { workflowName, actionName, modification, projectName } = options.input;

    try {
      const workspaceSearchRoots = getWorkspaceSearchRoots();
      if (workspaceSearchRoots.length === 0) {
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('No workspace folder found.')]);
      }

      const workflowResolution = await resolveWorkflowPath(workspaceSearchRoots, workflowName, projectName);
      if (workflowResolution.status === 'noProject') {
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('No Logic App project found in the workspace.')]);
      }

      if (workflowResolution.status === 'notFound') {
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Workflow "${workflowName}" not found.`)]);
      }

      if (workflowResolution.status === 'projectNotFound') {
        const projects = workflowResolution.availableProjects.map((name) => `- ${name}`).join('\n');
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Project "${workflowResolution.requestedProjectName}" was not found. Please specify one of these project names:\n${projects}`
          ),
        ]);
      }

      if (workflowResolution.status === 'ambiguous') {
        const projects = workflowResolution.matches.map((m) => `- ${m.projectName}`).join('\n');
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Workflow "${workflowName}" exists in multiple projects. Please specify projectName.\n${projects}`
          ),
        ]);
      }

      const workflowPath = workflowResolution.match.workflowPath;

      const definition = await fse.readJson(workflowPath);
      const projectConnections = await getProjectConnectionsInfo(workflowResolution.match.projectPath);

      const actionExists = !!definition.definition.actions?.[actionName];
      const triggerExists = !!definition.definition.triggers?.[actionName];

      if (!actionExists && !triggerExists) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(`Action or trigger "${actionName}" not found in workflow "${workflowName}".`),
        ]);
      }

      // Parse and apply the modification
      try {
        const modificationObj = JSON.parse(modification);

        if (actionExists) {
          const existingAction = definition.definition.actions[actionName] as Record<string, unknown>;
          const mergedAction = {
            ...existingAction,
            ...modificationObj,
          } as Record<string, unknown>;
          const mergedType = typeof mergedAction.type === 'string' ? mergedAction.type : String(existingAction.type ?? 'Http');
          const normalizedMergedType = normalizeTypeToken(mergedType);

          const genericResolvedAction = await resolveGenericApiConnectionAction(mergedType, actionName, mergedAction, projectConnections);
          if (genericResolvedAction.error) {
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(genericResolvedAction.error)]);
          }

          if (genericResolvedAction.action) {
            definition.definition.actions[actionName] = genericResolvedAction.action;
          } else if (shouldAutoUseWeatherConnector(mergedType, actionName, mergedAction)) {
            if (!projectConnections.weatherManagedReference) {
              const refsHint =
                projectConnections.managedApiReferences.length > 0
                  ? ` Available managed connection references: ${projectConnections.managedApiReferences.join(', ')}.`
                  : ' No managed connection references found in connections.json.';

              return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(
                  `Weather action requested but no weather managed API connection was found in connections.json.${refsHint}`
                ),
              ]);
            }

            definition.definition.actions[actionName] = buildSeattleWeatherConnectorAction(projectConnections.weatherManagedReference);
          } else {
            if (normalizedMergedType === 'apiconnection') {
              const validationError = validateApiConnectionConfiguration(extractActionInputs(mergedAction));
              if (validationError) {
                const refs = projectConnections.managedApiReferences;
                const refsHint =
                  refs.length > 0
                    ? ` Available managed connection references: ${refs.join(', ')}.`
                    : ' No managed connection references found in connections.json.';

                return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`${validationError}${refsHint}`)]);
              }

              const referenceValidationError = validateApiConnectionReferenceExists(
                extractActionInputs(mergedAction),
                projectConnections.managedApiReferencesWithApiId
              );
              if (referenceValidationError) {
                return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(referenceValidationError)]);
              }
            }

            if (normalizedMergedType === 'serviceprovider') {
              const validationError = validateServiceProviderConfiguration(extractActionInputs(mergedAction));
              if (validationError) {
                return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(validationError)]);
              }
            }

            definition.definition.actions[actionName] = buildActionDefinition(mergedType, mergedAction);
          }
        } else if (triggerExists) {
          definition.definition.triggers[actionName] = {
            ...definition.definition.triggers[actionName],
            ...modificationObj,
          };
        }
      } catch {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            'Invalid modification format. Please provide a valid JSON object with the properties to modify.'
          ),
        ]);
      }

      await fse.writeJson(workflowPath, definition, { spaces: 2 });

      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(`Successfully modified action "${actionName}" in workflow "${workflowName}".`),
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Failed to modify action: ${errorMessage}`)]);
    }
  }
}

/**
 * Validate workflow name
 * @internal Exported for testing
 */
export function isValidWorkflowName(name: string): boolean {
  const workflowNameValidation = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
  return workflowNameValidation.test(name);
}

function getWorkspaceSearchRoots(): string[] {
  return vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) ?? [];
}

async function findLogicAppProjectsInWorkspace(workspaceSearchRoots: string[]): Promise<string[]> {
  const allProjects = await Promise.all(workspaceSearchRoots.map((root) => findLogicAppProjects(root)));
  const deduped = new Set(allProjects.flat());
  return Array.from(deduped);
}

async function findLogicAppProjects(workspacePath: string): Promise<string[]> {
  const projectPaths: string[] = [];

  if (await isLogicAppProjectPath(workspacePath)) {
    projectPaths.push(workspacePath);
  }

  const entries = await fse.readdir(workspacePath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const subPath = path.join(workspacePath, entry.name);
      if (await isLogicAppProjectPath(subPath)) {
        projectPaths.push(subPath);
      }
    }
  }

  return projectPaths;
}

async function isLogicAppProjectPath(projectPath: string): Promise<boolean> {
  const hostJsonPath = path.join(projectPath, 'host.json');
  if (!(await fse.pathExists(hostJsonPath))) {
    return false;
  }

  try {
    const hostJson = await fse.readJson(hostJsonPath);
    return hostJson.extensionBundle?.id === 'Microsoft.Azure.Functions.ExtensionBundle.Workflows';
  } catch {
    return false;
  }
}

type WorkflowResolution =
  | { status: 'noProject' }
  | { status: 'notFound' }
  | { status: 'projectNotFound'; requestedProjectName: string; availableProjects: string[] }
  | { status: 'ambiguous'; matches: Array<{ projectPath: string; projectName: string; workflowPath: string }> }
  | { status: 'found'; match: { projectPath: string; projectName: string; workflowPath: string } };

async function resolveWorkflowPath(
  workspaceSearchRoots: string[],
  workflowName: string,
  projectName?: string
): Promise<WorkflowResolution> {
  const projectPaths = await findLogicAppProjectsInWorkspace(workspaceSearchRoots);
  if (projectPaths.length === 0) {
    return { status: 'noProject' };
  }

  const filteredProjectPaths = resolveProjectPathCandidates(projectPaths, projectName);

  if (projectName && filteredProjectPaths.length === 0) {
    return {
      status: 'projectNotFound',
      requestedProjectName: projectName,
      availableProjects: projectPaths.map((projectPath) => path.basename(projectPath)),
    };
  }

  const matches: Array<{ projectPath: string; projectName: string; workflowPath: string }> = [];
  for (const projectPath of filteredProjectPaths) {
    const workflowPath = path.join(projectPath, workflowName, workflowFileName);
    if (await fse.pathExists(workflowPath)) {
      matches.push({
        projectPath,
        projectName: path.basename(projectPath),
        workflowPath,
      });
    }
  }

  if (matches.length === 0) {
    return { status: 'notFound' };
  }

  if (matches.length > 1) {
    return { status: 'ambiguous', matches };
  }

  return { status: 'found', match: matches[0] };
}

function normalizeProjectName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Resolve project path candidates from user-provided project name.
 * Performs tolerant matching so values like "TonyProject," or
 * "TonyProject, Workflow1" can still resolve correctly.
 * @internal Exported for testing
 */
export function resolveProjectPathCandidates(projectPaths: string[], projectName?: string): string[] {
  if (!projectName) {
    return projectPaths;
  }

  const trimmedInput = projectName.trim().replace(/^["'`]+|["'`]+$/g, '');
  if (!trimmedInput) {
    return projectPaths;
  }

  const exactMatches = projectPaths.filter((projectPath) => path.basename(projectPath).toLowerCase() === trimmedInput.toLowerCase());
  if (exactMatches.length > 0) {
    return exactMatches;
  }

  const normalizedInput = normalizeProjectName(trimmedInput);
  if (!normalizedInput) {
    return [];
  }

  const normalizedExactMatches = projectPaths.filter((projectPath) => normalizeProjectName(path.basename(projectPath)) === normalizedInput);
  if (normalizedExactMatches.length > 0) {
    return normalizedExactMatches;
  }

  return projectPaths.filter((projectPath) => {
    const normalizedProject = normalizeProjectName(path.basename(projectPath));
    return normalizedInput.includes(normalizedProject) || normalizedProject.includes(normalizedInput);
  });
}

/**
 * List workflows in a Logic App project
 */
async function listWorkflowsInProject(projectPath: string): Promise<Array<{ name: string; type: string }>> {
  const workflows: Array<{ name: string; type: string }> = [];

  const entries = await fse.readdir(projectPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_')) {
      const workflowJsonPath = path.join(projectPath, entry.name, workflowFileName);
      if (await fse.pathExists(workflowJsonPath)) {
        try {
          const definition = await fse.readJson(workflowJsonPath);
          const kind = definition.kind || 'Stateful';
          workflows.push({ name: entry.name, type: kind });
        } catch {
          workflows.push({ name: entry.name, type: 'Unknown' });
        }
      }
    }
  }

  return workflows;
}

/**
 * Create a workflow definition based on type
 * @internal Exported for testing
 */
export function createWorkflowDefinition(type: WorkflowTypeOption, description?: string): Record<string, unknown> {
  const kindMap: Record<WorkflowTypeOption, string> = {
    stateful: 'Stateful',
    stateless: 'Stateless',
    agentic: 'Stateful',
    agent: 'Stateful',
  };

  const baseDefinition = {
    definition: {
      $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
      contentVersion: '1.0.0.0',
      triggers: {},
      actions: {},
      outputs: {},
    },
    kind: kindMap[type],
  };

  // Add description as a comment if provided
  if (description) {
    (baseDefinition.definition as Record<string, unknown>).description = description;
  }

  // Add type-specific configurations
  if (type === 'agentic' || type === 'agent') {
    // Add AI-related metadata for agentic workflows
    (baseDefinition as Record<string, unknown>).metadata = {
      workflowType: type,
      aiEnabled: true,
    };
  }

  return baseDefinition;
}
