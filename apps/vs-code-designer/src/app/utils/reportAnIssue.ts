// /*---------------------------------------------------------------------------------------------
//  *  Copyright (c) Microsoft Corporation. All rights reserved.
//  *  Licensed under the MIT License. See License.txt in the project root for license information.
//  *--------------------------------------------------------------------------------------------*/

// import type { ExtensionContext } from 'vscode';
// import type { IParsedError} from '@microsoft/vscode-azext-utils';
// import { openUrl } from '@microsoft/vscode-azext-utils';

// /**
//  * Used to open the browser to the "New Issue" page on GitHub with relevant context pre-filled in the issue body
//  */
// export function reportAnIssue(actionId: string, parsedError: IParsedError, extensionContext?: ExtensionContext): void {
//     let packageJson: IPackageJson | undefined;
//     if (extensionContext) {
//         try {
//             // tslint:disable-next-line:non-literal-require
//             packageJson = require(extensionContext.asAbsolutePath('package.json')) as IPackageJson;
//         } catch (_error) {
//             // ignore errors
//         }
//     }

//     // tslint:disable-next-line:strict-boolean-expressions
//     // tslint:disable-next-line:strict-boolean-expressions
//     const extensionVersion: string = (packageJson && packageJson.version) || 'Unknown';

//     const body: string = `
// Repro steps:
// <Enter steps to reproduce issue>

// Action: ${actionId}
// Error type: ${parsedError.errorType}
// Error Message: ${parsedError.message}

// Version: ${extensionVersion}
// OS: ${process.platform}
// `;

//     //
//     // tslint:disable-next-line:no-unsafe-any
//     openUrl(`https://github.com/Azure/LogicAppsUX/issues/new?template=bug_report.yml&description=${encodeURIComponent(body)}`);
// }

// interface IPackageJson {
//     version?: string;
//     name?: string;
// }

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { IErrorHandlerContext, IParsedError } from '@microsoft/vscode-azext-utils';
import { openUrl } from '@microsoft/vscode-azext-utils';
import * as os from 'os';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';

// Some browsers don't have very long URLs
// 2000 seems a reasonable number for most browsers,
// see https://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers
export const maxUrlLength: number = 2000;

export interface IReportableIssue {
  callbackId: string;
  error: IParsedError;
  issueProperties: { [key: string]: string | undefined };
  time: number;
}

/**
 * Used to open the browser to the "New Issue" page on GitHub with relevant context pre-filled in the issue body
 */
export async function reportAnIssue(errorContext: IErrorHandlerContext, issue: IParsedError | undefined): Promise<void> {
  const link: string = await getReportAnIssueLink(errorContext, issue);
  await openUrl(link);
}

export async function getReportAnIssueLink(errorContext: IErrorHandlerContext, issue: IParsedError | undefined): Promise<string> {
  const stack: string = (issue?.stack || '').replace(/\r\n/g, '\n');

  let body = `
<!-- ${vscode.l10n.t('IMPORTANT: Please be sure to remove any private information before submitting.')} -->

${vscode.l10n.t('Does this occur consistently? <!-- TODO: Type Yes or No -->')}
Repro steps:
<!-- ${vscode.l10n.t('TODO: Share the steps needed to reliably reproduce the problem. Please include actual and expected results.')} -->

1.
2.`;

  if (issue) {
    body += `

Action: ${errorContext.callbackId}
Error type: ${issue.errorType}
Error Message: ${issue.message}
`;
  }

  body += `

Version: ${ext.extensionVersion}
OS: ${process.platform}
OS Arch: ${os.arch()}
OS Release: ${os.release()}
Product: ${vscode.env.appName}
Product Version: ${vscode.version}
Language: ${vscode.env.language}
UTC time: ${new Date().toUTCString()}`;

  // Add stack and any custom issue properties as individual details
  const details: { [key: string]: string | undefined } = Object.assign(
    {},
    stack ? { 'Call Stack': stack } : {},
    errorContext.errorHandling?.issueProperties
  ); // Don't localize call stack
  for (const propName of Object.getOwnPropertyNames(details)) {
    const value: string | undefined = details[propName];
    body += createBodyDetail(propName, String(value));
  }

  const simpleLink: string = createNewIssueLinkFromBody(body);
  if (simpleLink.length <= maxUrlLength) {
    return simpleLink;
  }

  // If it's too long, paste it to the clipboard
  await vscode.env.clipboard.writeText(body);
  return createNewIssueLinkFromBody(vscode.l10n.t('The issue text was copied to the clipboard.  Please paste it into this window.'));
}

function createNewIssueLinkFromBody(issueBody: string): string {
  const baseUrl: string = `https://github.com/Azure/LogicAppsUX/issues/new?template=bug_report.yml&description=${encodeURIComponent(issueBody)}`;
  return baseUrl;
}

function createBodyDetail(detailName: string, detail: string): string {
  return `

<details>
<summary>${detailName}</summary>

\`\`\`
${detail}
\`\`\`

</details>
`;
}
