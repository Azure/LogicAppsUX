/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import axios from 'axios';

/**
 * Fetches migration options from the design-time API for legacy action types.
 */
export function getMigrationOptions(baseUrl: string): Promise<Record<string, any>> {
  const flatFileEncodingPromise = axios.get(
    `${baseUrl}/operationGroups/flatFileOperations/operations/flatFileEncoding?api-version=2019-10-01-edge-preview&$expand=properties/manifest`
  );
  const liquidJsonToJsonPromise = axios.get(
    `${baseUrl}/operationGroups/liquidOperations/operations/liquidJsonToJson?api-version=2019-10-01-edge-preview&$expand=properties/manifest`
  );
  const xmlValidationPromise = axios.get(
    `${baseUrl}/operationGroups/xmlOperations/operations/xmlValidation?api-version=2019-10-01-edge-preview&$expand=properties/manifest`
  );
  const xsltPromise = axios.get(
    `${baseUrl}/operationGroups/xmlOperations/operations/xmlTransform?api-version=2019-10-01-edge-preview&$expand=properties/manifest`
  );

  return Promise.all([flatFileEncodingPromise, liquidJsonToJsonPromise, xmlValidationPromise, xsltPromise]).then(
    ([ff, liquid, xmlvalidation, xslt]) => {
      return {
        flatFileEncoding: ff.data.properties.manifest,
        liquidJsonToJson: liquid.data.properties.manifest,
        xmlValidation: xmlvalidation.data.properties.manifest,
        xslt: xslt.data.properties.manifest,
      };
    }
  );
}

/**
 * Migrates a workflow definition by adding missing `source` properties to legacy action types.
 */
export function migrateWorkflow(workflow: any, migrationOptions: Record<string, any>): void {
  traverseActions(workflow.definition?.actions, migrationOptions);
}

function traverseActions(actions: any, migrationOptions: Record<string, any>): void {
  if (actions) {
    for (const actionName of Object.keys(actions)) {
      traverseAction(actions[actionName], migrationOptions);
    }
  }
}

function traverseAction(action: any, migrationOptions: Record<string, any>): void {
  const type = action?.type;
  switch ((type || '').toLowerCase()) {
    case 'liquid': {
      if (migrationOptions['liquidJsonToJson']?.inputs?.properties?.map?.properties?.source) {
        const map = action?.inputs?.map;
        if (map && map.source === undefined) {
          map.source = 'LogicApp';
        }
      }
      break;
    }
    case 'xmlvalidation': {
      if (migrationOptions['xmlValidation']?.inputs?.properties?.schema?.properties?.source) {
        const schema = action?.inputs?.schema;
        if (schema && schema.source === undefined) {
          schema.source = 'LogicApp';
        }
      }
      break;
    }
    case 'xslt': {
      if (migrationOptions['xslt']?.inputs?.properties?.map?.properties?.source) {
        const map = action?.inputs?.map;
        if (map && map.source === undefined) {
          map.source = 'LogicApp';
        }
      }
      break;
    }
    case 'flatfileencoding':
    case 'flatfiledecoding': {
      if (migrationOptions['flatFileEncoding']?.inputs?.properties?.schema?.properties?.source) {
        const schema = action?.inputs?.schema;
        if (schema && schema.source === undefined) {
          schema.source = 'LogicApp';
        }
      }
      break;
    }
    case 'if': {
      traverseActions(action.else?.actions, migrationOptions);
      break;
    }
    case 'scope':
    case 'foreach':
    case 'changeset':
    case 'until': {
      traverseActions(action.actions, migrationOptions);
      break;
    }
    case 'switch': {
      for (const caseKey of Object.keys(action.cases || {})) {
        traverseActions(action.cases[caseKey]?.actions, migrationOptions);
      }
      traverseActions(action.default?.actions, migrationOptions);
      break;
    }
  }
}
