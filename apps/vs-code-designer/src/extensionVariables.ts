/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { ExtensionContext, WebviewPanel } from 'vscode';

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ext {
  export let context: ExtensionContext;

  export const openWebviewPanels: Record<string, Record<string, WebviewPanel>> = {
    designerLocal: {},
    monitoring: {},
    overview: {},
    designerAzure: {},
    export: {},
  };

  export enum webViewKey {
    designerLocal = 'designerLocal',
  }
}
