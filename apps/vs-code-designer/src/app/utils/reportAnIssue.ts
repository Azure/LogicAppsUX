/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { IErrorHandlerContext, IParsedError } from '@microsoft/vscode-azext-utils';
import { openUrl } from '@microsoft/vscode-azext-utils';
import * as os from 'os';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';

// Some browsers don't have very long URLs. 2000 is a conservative threshold.
// Ref: https://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers
export const maxUrlLength = 2000;

// Internal truncation limits to keep URL size manageable while still useful.
const MAX_INLINE_STACK_CHARS = 4000;
const MAX_INLINE_MESSAGE_CHARS = 1000;

// Whitelisted extension configuration settings (Addition A)
const SETTINGS_WHITELIST: readonly string[] = [
  'dataMapperVersion',
  'validateFuncCoreTools',
  'autoRuntimeDependenciesPath',
  'autoRuntimeDependenciesValidationAndInstallation',
  'parameterizeConnectionsInProjectLoad',
];

/**
 * Open the browser to the GitHub new issue page with pre-filled body content.
 */
export async function reportAnIssue(errorContext: IErrorHandlerContext, issue: IParsedError, correlationId: string): Promise<void> {
  const link = await getReportAnIssueLink(errorContext, issue, correlationId);
  await openUrl(link);
}

/**
 * Build the new issue link. If final URL exceeds max size, copy full body to clipboard
 * and provide a shortened message in the link instead.
 */
export async function getReportAnIssueLink(
  errorContext: IErrorHandlerContext,
  issue: IParsedError,
  correlationId: string
): Promise<string> {
  const body = buildIssueBody(errorContext, issue, correlationId);
  const link = createNewIssueLinkFromBody(body);
  if (link.length <= maxUrlLength) {
    return link;
  }
  try {
    await vscode.env.clipboard.writeText(body);
    return createNewIssueLinkFromBody(vscode.l10n.t('The issue text was copied to the clipboard. Please paste it into this window.'));
  } catch {
    const truncated = `${body.slice(0, 4000)}\n...[truncated]`;
    return createNewIssueLinkFromBody(truncated);
  }
}

function buildIssueBody(errorContext: IErrorHandlerContext, issue: IParsedError, correlationId: string): string {
  const header = `<!-- ${vscode.l10n.t('IMPORTANT: Please be sure to remove any private information before submitting.')} -->`;
  const repro = `${vscode.l10n.t('Does this occur consistently? <!-- TODO: Type Yes or No -->')}\nRepro steps:\n<!-- ${vscode.l10n.t('TODO: Share the steps needed to reliably reproduce the problem. Please include actual and expected results.')} -->\n\n1.\n2.`;
  const stack = truncateIfNeeded((issue?.stack || '').replace(/\r\n/g, '\n'), MAX_INLINE_STACK_CHARS);
  const message = truncateIfNeeded(issue?.message, MAX_INLINE_MESSAGE_CHARS);

  let body = `\n${header}\n\n${repro}`;
  if (issue) {
    body += `\n\nAction: ${errorContext.callbackId}`;
    body += `\nError type: ${issue.errorType}`;
    body += `\nError message: ${message}`;
    body += `\nCorrelation Id: ${correlationId}`;
    body += `\nSession id: ${vscode.env.sessionId}`;
  }
  body += `\nExtension version: ${ext.extensionVersion ?? 'unknown'}`;
  body += `\nExtension bundle version: ${ext.latestBundleVersion ?? 'unknown'}`;
  body += `\nOS: ${process.platform} (${os.type()} ${os.release()})`;
  body += `\nOS arch: ${os.arch()}`;
  body += `\nProduct: ${vscode.env.appName}`;
  body += `\nProduct version: ${vscode.version}`;
  body += `\nUTC time: ${new Date().toUTCString()}`;

  body += createSettingsDetail();

  const details: { [key: string]: string | undefined } = Object.assign(
    {},
    stack ? { 'Call Stack': stack } : {},
    errorContext.errorHandling?.issueProperties
  );
  for (const name of Object.getOwnPropertyNames(details)) {
    body += createBodyDetail(name, String(details[name]));
  }
  return body;
}

function createSettingsDetail(): string {
  try {
    const extensionConfiguration = vscode.workspace.getConfiguration(ext.prefix);
    const settings: Record<string, unknown> = {};
    for (const key of SETTINGS_WHITELIST) {
      settings[key] = extensionConfiguration.get(key);
    }
    return createBodyDetail('Settings', JSON.stringify(settings, null, 2));
  } catch {
    return '';
  }
}

function createNewIssueLinkFromBody(issueBody: string): string {
  return `https://github.com/Azure/LogicAppsUX/issues/new?template=bug_report.yml&description=${encodeURIComponent(issueBody)}`;
}

function createBodyDetail(detailName: string, detail: string): string {
  return `\n\n<details>\n<summary>${detailName}</summary>\n\n\`\`\`\n${detail}\n\`\`\`\n\n</details>\n`;
}

function truncateIfNeeded(value: string | undefined, max: number): string {
  if (!value) {
    return '';
  }
  return value.length > max ? `${value.slice(0, max)}\n...[truncated to ${max} characters]` : value;
}
