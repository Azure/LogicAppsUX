import {
  ConnectionParameterEditorService,
  InitConnectionParameterEditorService,
  type IConnectionParameterEditorService,
  type IConnectionParameterInfo,
  type IConnectionCredentialMappingInfo,
} from '../connectionParameterEditor';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('lib/designer-client-services/connectionParameterEditor', () => {
  beforeEach(() => {
    InitConnectionParameterEditorService(undefined);
  });

  afterEach(() => {
    InitConnectionParameterEditorService(undefined);
  });

  it('should call "getConnectionParameterEditor" with initialized service instance', () => {
    const service: IConnectionParameterEditorService = {
      getConnectionParameterEditor: vi.fn(),
    };

    expect(ConnectionParameterEditorService()).toBeUndefined();

    InitConnectionParameterEditorService(service);

    const parameter: IConnectionParameterInfo = {
      connectorId: 'connectorId',
      parameterKey: 'parameterKey',
    };
    ConnectionParameterEditorService()?.getConnectionParameterEditor(parameter);

    expect(service.getConnectionParameterEditor).toHaveBeenCalledWith(parameter);
  });

  it('should call "getCredentialMappingEditorOptions" with initialized service instance', () => {
    const service: IConnectionParameterEditorService = {
      getConnectionParameterEditor: vi.fn(),
      getCredentialMappingEditorOptions: vi.fn(),
    };

    expect(ConnectionParameterEditorService()).toBeUndefined();

    InitConnectionParameterEditorService(service);

    const mappingInfo: IConnectionCredentialMappingInfo = {
      connectorId: 'connectorId',
      mappingName: 'mappingName',
      parameters: {},
    };
    ConnectionParameterEditorService()?.getCredentialMappingEditorOptions?.(mappingInfo);

    expect(service.getCredentialMappingEditorOptions).toHaveBeenCalledWith(mappingInfo);
  });
});
