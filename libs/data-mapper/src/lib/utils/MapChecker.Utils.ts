import type { MapCheckerEntry } from '../components/mapChecker/MapCheckerItem';
import { MapCheckerItemSeverity } from '../components/mapChecker/MapCheckerItem';
import type { SchemaNodeDictionary } from '../models';
import { SchemaNodeProperty } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { nodeHasSourceNodeEventually } from './Connection.Utils';

export const collectErrorsForMapChecker = (connections: ConnectionDictionary, targetSchema: SchemaNodeDictionary): MapCheckerEntry[] => {
  const errors: MapCheckerEntry[] = [];

  // Required fields
  Object.entries(targetSchema).forEach(([reactFlowId, schemaValue]) => {
    if (schemaValue.nodeProperties.indexOf(SchemaNodeProperty.Optional) === -1) {
      const connection = connections[reactFlowId];
      if (!nodeHasSourceNodeEventually(connection, connections)) {
        errors.push({
          title: 'Required field missing',
          description: `${schemaValue.name} has an non-terminating connection chain`,
          severity: MapCheckerItemSeverity.Error,
          reactFlowId,
        });
      }
    }
  });

  return errors;
};

export const collectWarningsForMapChecker = (
  _connections: ConnectionDictionary,
  _targetSchema: SchemaNodeDictionary
): MapCheckerEntry[] => {
  const warnings: MapCheckerEntry[] = [];

  return warnings;
};

export const collectInfoForMapChecker = (_connections: ConnectionDictionary, _targetSchema: SchemaNodeDictionary): MapCheckerEntry[] => {
  const info: MapCheckerEntry[] = [];

  return info;
};

export const collectOtherForMapChecker = (_connections: ConnectionDictionary, _targetSchema: SchemaNodeDictionary): MapCheckerEntry[] => {
  const other: MapCheckerEntry[] = [];

  return other;
};
