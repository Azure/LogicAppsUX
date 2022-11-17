/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IWorkerRuntime {
  displayInfo: {
    displayName: string;
    description?: string;
    hidden: boolean;
  };
  sdk: {
    name: string;
  };
  targetFramework: string;
  itemTemplates: string;
  projectTemplates: string;
  projectTemplateId: {
    csharp: string;
  };
}
