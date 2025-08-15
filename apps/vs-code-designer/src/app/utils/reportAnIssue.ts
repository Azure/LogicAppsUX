/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { IErrorHandlerContext, IParsedError } from '@microsoft/vscode-azext-utils';
import { openUrl } from '@microsoft/vscode-azext-utils';
import * as os from 'os';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { createSettingsDetails } from './vsCodeConfig/settings';

// Some browsers don't have very long URLs. 2000 is a conservative threshold.
// Ref: https://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers
export const maxUrlLength = 2000;

// Internal truncation limits to keep URL size manageable while still useful.
const MAX_INLINE_STACK_CHARS = 4000;
const MAX_INLINE_MESSAGE_CHARS = 1000;
const MAX_ISSUE_BODY_CHARS = 4000;

// Whitelisted extension configuration settings
const SETTINGS_WHITELIST: string[] = [
  'dataMapperVersion',
  'validateFuncCoreTools',
  'autoRuntimeDependenciesPath',
  'autoRuntimeDependenciesValidationAndInstallation',
  'parameterizeConnectionsInProjectLoad',
];

/**
 * Generates a "Report an Issue" link from the provided error context and opens it in the user's browser.
 * @param errorContext - Contextual information about where and how the error occurred.
 * @param issue - The parsed error details to include in the report.
 * @param correlationId - An identifier used to correlate this issue with related logs or telemetry.
 * @returns A promise that resolves when the issue reporting link has been opened.
 */
export async function reportAnIssue(errorContext: IErrorHandlerContext, issue: IParsedError, correlationId: string): Promise<void> {
  const link = await getReportAnIssueLink(errorContext, issue, correlationId);
  await openUrl(link);
}

/**
 * Creates a pre-filled issue creation link for the given error data.
 * Falls back to copying the full body to the clipboard (or truncating) if the URL would exceed the maximum length.
 * @param errorContext - Contextual information about the environment and operation when the error occurred.
 * @param issue - Parsed error details to embed in the issue body.
 * @param correlationId - Identifier used to correlate this issue with logs/telemetry.
 * @returns A URL to open a new issue with either the full, copied, or truncated body content.
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
    return createNewIssueLinkFromBody(
      localize('copiedTextToClipboard', 'The issue text was copied to the clipboard. Please paste it into this window.')
    );
  } catch {
    const truncated = `${body.slice(0, MAX_ISSUE_BODY_CHARS)}\n...[truncated]`;
    return createNewIssueLinkFromBody(truncated);
  }
}

/**
 * Builds a pre-filled issue report body string containing a repro template, error metadata,
 * environment details (extension, OS, VS Code), timestamp, optional stack trace, and any
 * additional issue properties supplied in the error handling context.
 * @param errorContext - Context for the error, including callback/action identifiers and optional issue properties.
 * @param issue - The parsed error object whose message, type, and stack (if present) are incorporated.
 * @param correlationId - Correlates this error instance with backend or telemetry events.
 * @returns A formatted multi-line string ready to be used as the body of a bug report.
 */
function buildIssueBody(errorContext: IErrorHandlerContext, issue: IParsedError, correlationId: string): string {
  const header = `<!-- ${localize('removePrivateInfoText', 'IMPORTANT: Please be sure to remove any private information before submitting.')} -->`;
  const repro = `${localize('stepsHeader', 'Does this occur consistently? <!-- TODO: Type Yes or No -->')}\nRepro steps:\n<!-- ${localize('stepsText', 'TODO: Share the steps needed to reliably reproduce the problem. Please include actual and expected results.')} -->\n\n1.\n2.`;
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

  body += createBodyDetail('Settings', JSON.stringify(createSettingsDetails(SETTINGS_WHITELIST), null, 2));

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

/**
 * Builds a pre-filled GitHub “New Issue” URL for the LogicAppsUX repo using the bug report template.
 * The provided issue body is URL-encoded and placed in the description query parameter.
 * @param issueBody - Raw markdown/text content to seed the issue description.
 * @returns A complete URL that opens the GitHub new issue page with the description pre-populated.
 */
function createNewIssueLinkFromBody(issueBody: string): string {
  return `https://github.com/Azure/LogicAppsUX/issues/new?template=bug_report.yml&description=${encodeURIComponent(issueBody)}`;
}

/**
 * Creates a GitHub-flavored Markdown <details> section wrapping the provided text in a fenced code block.
 * @param detailName - The text to show in the <summary> (collapsible header).
 * @param detail - The content placed inside the code fence.
 * @returns A formatted string (prefixed with two newlines) containing the details block.
 */
function createBodyDetail(detailName: string, detail: string): string {
  return `\n\n<details>\n<summary>${detailName}</summary>\n\n\`\`\`\n${detail}\n\`\`\`\n\n</details>\n`;
}

/**
 * Truncates a string to the specified maximum length, appending a newline and
 * a truncation notice if it exceeds that length. Returns an empty string for
 * undefined inputs.
 * @param value - The string to evaluate.
 * @param max - The maximum allowed character count.
 * @returns The original string if within limit; otherwise the truncated portion
 * followed by a notice: "\n...[truncated to {max} characters]".
 */
function truncateIfNeeded(value: string | undefined, max: number): string {
  if (!value) {
    return '';
  }
  return value.length > max ? `${value.slice(0, max)}\n...[truncated to ${max} characters]` : value;
}
