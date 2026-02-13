/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { draftWorkflowFileName, draftConnectionsFileName, draftParametersFileName } from '../../../constants';
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import * as path from 'path';

export interface DraftData {
  definition: any;
  connectionReferences?: any;
  parameters?: any;
}

export interface LoadDraftResult {
  hasDraft: boolean;
  draftWorkflow?: any;
  draftConnections?: any;
  draftParameters?: any;
}

export function getDraftWorkflowPath(workflowFilePath: string): string {
  return path.join(path.dirname(workflowFilePath), draftWorkflowFileName);
}

export function getDraftConnectionsPath(workflowFilePath: string): string {
  return path.join(path.dirname(workflowFilePath), draftConnectionsFileName);
}

export function getDraftParametersPath(workflowFilePath: string): string {
  return path.join(path.dirname(workflowFilePath), draftParametersFileName);
}

export function hasDraft(workflowFilePath: string): boolean {
  return existsSync(getDraftWorkflowPath(workflowFilePath));
}

export function saveDraft(workflowFilePath: string, data: DraftData): void {
  const dir = path.dirname(workflowFilePath);
  mkdirSync(dir, { recursive: true });

  writeFileSync(getDraftWorkflowPath(workflowFilePath), JSON.stringify(data.definition, null, 4), 'utf8');

  if (data.connectionReferences) {
    writeFileSync(getDraftConnectionsPath(workflowFilePath), JSON.stringify(data.connectionReferences, null, 4), 'utf8');
  }

  if (data.parameters) {
    writeFileSync(getDraftParametersPath(workflowFilePath), JSON.stringify(data.parameters, null, 4), 'utf8');
  }
}

export function loadDraft(workflowFilePath: string): LoadDraftResult {
  const draftWorkflowPath = getDraftWorkflowPath(workflowFilePath);

  if (!existsSync(draftWorkflowPath)) {
    return { hasDraft: false };
  }

  const result: LoadDraftResult = {
    hasDraft: true,
    draftWorkflow: JSON.parse(readFileSync(draftWorkflowPath, 'utf8')),
  };

  const draftConnectionsPath = getDraftConnectionsPath(workflowFilePath);
  if (existsSync(draftConnectionsPath)) {
    result.draftConnections = JSON.parse(readFileSync(draftConnectionsPath, 'utf8'));
  }

  const draftParametersPath = getDraftParametersPath(workflowFilePath);
  if (existsSync(draftParametersPath)) {
    result.draftParameters = JSON.parse(readFileSync(draftParametersPath, 'utf8'));
  }

  return result;
}

export function discardDraft(workflowFilePath: string): void {
  const filesToDelete = [
    getDraftWorkflowPath(workflowFilePath),
    getDraftConnectionsPath(workflowFilePath),
    getDraftParametersPath(workflowFilePath),
  ];

  for (const filePath of filesToDelete) {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}
