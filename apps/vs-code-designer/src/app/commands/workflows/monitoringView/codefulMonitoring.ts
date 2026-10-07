/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { StandardRunService } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { HttpClient } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import type { Uri } from 'vscode';
import { localize } from '../../../../localize';

export interface CodefulWorkflowSnapshot extends Record<string, unknown> {
  properties: Record<string, unknown> & { definition: Record<string, unknown> };
}

export interface CodefulMonitoringContext {
  projectPath: string;
  sourceUri: Uri;
  workflowName: string;
  runId: string;
  runtimeBaseUrl: string;
  workflowSnapshot: CodefulWorkflowSnapshot;
  workflowContent: Record<string, unknown> & { definition: Record<string, unknown>; kind: string };
  definitionOrigin: { type: 'runtime-run'; workflowName: string; runId: string };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isWorkflowSnapshot(value: unknown): value is CodefulWorkflowSnapshot {
  return (
    isRecord(value) &&
    isRecord(value.properties) &&
    isRecord(value.properties.definition) &&
    isRecord(value.properties.definition.actions) &&
    isRecord(value.properties.definition.triggers)
  );
}

function pathKey(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function assertAuthoringSource(sourceUri: Uri, projectPath: string): void {
  const relativePath = path.relative(pathKey(projectPath), pathKey(sourceUri.fsPath));
  if (
    !projectPath ||
    sourceUri.scheme !== 'file' ||
    path.extname(sourceUri.fsPath).toLowerCase() !== '.cs' ||
    !relativePath ||
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(localize('codefulRunSourceMismatch', 'The codeful run source must belong to the selected authoring project.'));
  }
}

function assertResourceIdentity(value: unknown, workflowName: string, runId?: string): void {
  if (value === undefined) {
    return;
  }
  const match = typeof value === 'string' ? /(?:^|\/)workflows\/([^/]+)(?:\/|$)/i.exec(value) : null;
  const runMatch = typeof value === 'string' && runId ? /\/runs\/([^/]+)$/i.exec(value) : null;
  if (!match || decodeResourceName(match[1]) !== workflowName || (runId && (!runMatch || decodeResourceName(runMatch[1]) !== runId))) {
    throw new Error(localize('codefulRunIdentityMismatch', 'The runtime returned a snapshot for a different workflow or run.'));
  }
}

function decodeResourceName(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error(localize('codefulRunIdentityInvalid', 'The runtime returned an invalid workflow or run resource identity.'));
  }
}

function getRunName(runId: string): string {
  const segment = runId.split('/').at(-1) ?? '';
  return runId.includes('/') ? decodeResourceName(segment) : segment;
}

/** Preserve the versioned workflow envelope returned by the same run service used by V1. */
export function prepareCodefulRunSnapshot(run: unknown, workflowName: string, runId: string, workflowKind: string) {
  if (!isRecord(run) || run.name !== runId || !isRecord(run.properties)) {
    throw new Error(localize('codefulRunUnavailable', 'The runtime did not return the selected codeful run and its workflow snapshot.'));
  }
  assertResourceIdentity(run.id, workflowName, runId);
  const snapshot = run.properties.workflow;
  if (!isWorkflowSnapshot(snapshot)) {
    throw new Error(
      localize(
        'codefulRunDefinitionIncomplete',
        'The selected codeful run has no complete compiled workflow definition. Verify that its workflow version is retained; source text cannot substitute for it.'
      )
    );
  }
  assertResourceIdentity(snapshot.id, workflowName);
  const properties = snapshot.properties;
  const kind = properties.kind !== undefined ? properties.kind : snapshot.kind !== undefined ? snapshot.kind : workflowKind;
  if (typeof kind !== 'string' || !kind) {
    throw new Error(localize('codefulRunKindInvalid', 'The selected codeful run returned an invalid workflow kind.'));
  }
  return {
    workflowSnapshot: snapshot,
    workflowContent: { ...properties, definition: properties.definition, kind },
    definitionOrigin: { type: 'runtime-run' as const, workflowName, runId },
  };
}

export function assertCodefulMonitoringContext(monitoring: CodefulMonitoringContext, sourceUri: Uri, runId?: string): void {
  assertAuthoringSource(sourceUri, monitoring.projectPath);
  if (
    !runId ||
    monitoring.sourceUri.scheme !== 'file' ||
    pathKey(monitoring.sourceUri.fsPath) !== pathKey(sourceUri.fsPath) ||
    monitoring.runId !== getRunName(runId) ||
    monitoring.definitionOrigin.type !== 'runtime-run' ||
    monitoring.definitionOrigin.workflowName !== monitoring.workflowName ||
    monitoring.definitionOrigin.runId !== monitoring.runId ||
    !isWorkflowSnapshot(monitoring.workflowSnapshot) ||
    monitoring.workflowSnapshot.properties.definition !== monitoring.workflowContent.definition
  ) {
    throw new Error(
      localize('codefulRunContextMismatch', 'The compiled codeful monitoring context does not match the selected source, workflow and run.')
    );
  }
}

export async function getCodefulMonitoringContext(
  context: IActionContext,
  sourceUri: Uri,
  projectPath: string,
  workflowName: string,
  runId: string,
  runtimeBaseUrl: string,
  apiVersion: string,
  workflowKind: string
): Promise<CodefulMonitoringContext> {
  if (!workflowName || /[/\\?#\0]/.test(workflowName) || workflowName === '.' || workflowName === '..') {
    throw new Error(localize('codefulRunWorkflowInvalid', 'Select a named codeful workflow before opening its run.'));
  }
  const runName = getRunName(runId);
  if (!runName || /[/\\?#\0]/.test(runName) || runName === '.' || runName === '..') {
    throw new Error(localize('codefulRunIdInvalid', 'Select a valid run of the named codeful workflow.'));
  }
  if (runId.includes('/')) {
    assertResourceIdentity(runId, workflowName, runName);
  }
  assertAuthoringSource(sourceUri, projectPath);
  const client = new HttpClient({ baseUrl: runtimeBaseUrl });
  const service = new StandardRunService({
    baseUrl: runtimeBaseUrl,
    apiVersion,
    workflowName: encodeURIComponent(workflowName),
    httpClient: client,
  });
  let run: unknown;
  try {
    run = await service.getRun(encodeURIComponent(runName));
  } catch {
    throw new Error(
      localize(
        'codefulRunDefinitionUnavailable',
        'The compiled definition for the selected codeful run could not be loaded. Verify that the runtime is available and that the run version is retained.'
      )
    );
  } finally {
    client.dispose();
  }
  const prepared = prepareCodefulRunSnapshot(run, workflowName, runName, workflowKind);
  context.telemetry.properties.codefulMonitoringDefinitionOrigin = 'runtime-run';
  return { projectPath, sourceUri, workflowName, runId: runName, runtimeBaseUrl, ...prepared };
}
