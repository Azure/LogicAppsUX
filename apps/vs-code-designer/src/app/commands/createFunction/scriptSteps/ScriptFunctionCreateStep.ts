/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ProjectLanguage, LanguageScript } from '@microsoft-logic-apps/utils';

export function getScriptFileNameFromLanguage(language: string): string | undefined {
  switch (language) {
    case ProjectLanguage.CSharpScript:
      return LanguageScript.CSharpScript;
    case ProjectLanguage.FSharpScript:
      return LanguageScript.FSharpScript;
    case ProjectLanguage.JavaScript:
      return LanguageScript.JavaScript;
    case ProjectLanguage.PowerShell:
      return LanguageScript.PowerShell;
    case ProjectLanguage.TypeScript:
      return LanguageScript.TypeScript;
    default:
      return undefined;
  }
}
