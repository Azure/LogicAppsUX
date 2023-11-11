import {
  ConnectionParameterEditorService,
  InitConnectionParameterEditorService,
  type IConnectionParameterInfo,
} from './connectionParameterEditor';

describe('lib/designer-client-services/connectionParameterEditor', () => {
  it('should call "getConnectionParameterEditor" with initialized service instance', () => {
    const service = {
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
});
