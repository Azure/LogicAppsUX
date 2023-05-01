import constants from '../../../../common/constants';
import type { AppDispatch } from '../../../../core';
import { StaticResultOption } from '../../../../core/actions/bjsworkflow/staticresults';
import { updateStaticResults } from '../../../../core/state/operation/operationMetadataSlice';
import { useParameterStaticResult } from '../../../../core/state/operation/operationSelector';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { selectPanelTab } from '../../../../core/state/panel/panelSlice';
import { useOperationInfo } from '../../../../core/state/selectors/actionMetadataSelector';
import { useStaticResultProperties, useStaticResultSchema } from '../../../../core/state/staticresultschema/staitcresultsSelector';
import { updateStaticResultProperties } from '../../../../core/state/staticresultschema/staticresultsSlice';
import type { PanelTab } from '@microsoft/designer-ui';
import { StaticResultContainer } from '@microsoft/designer-ui';
import type { OpenAPIV2 } from '@microsoft/utils-logic-apps';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

export const TestingPanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const selectedNode = useSelectedNodeId();
  const operationInfo = useOperationInfo(selectedNode);
  const { connectorId, operationId } = operationInfo;
  const staticResultSchema = useStaticResultSchema(connectorId, operationId);
  const parameterStaticResult = useParameterStaticResult(selectedNode) ?? {};

  const { name = selectedNode + 0, staticResultOptions } = parameterStaticResult;
  const properties = useStaticResultProperties(name);

  const saveProperties = useCallback(
    (properties: OpenAPIV2.SchemaObject, updatedStaticResultOptions: StaticResultOption) => {
      dispatch(updateStaticResults({ id: selectedNode, staticResults: { name, staticResultOptions: updatedStaticResultOptions } }));
      dispatch(updateStaticResultProperties({ name, properties }));
      dispatch(selectPanelTab(constants.PANEL_TAB_NAMES.PARAMETERS));
    },
    [dispatch, name, selectedNode]
  );

  return staticResultSchema ? (
    <StaticResultContainer
      key={`${name}`}
      properties={(properties ?? {}) as OpenAPIV2.SchemaObject}
      staticResultSchema={staticResultSchema}
      enabled={staticResultOptions === StaticResultOption.ENABLED ?? false}
      savePropertiesCallback={(newPropertyState: OpenAPIV2.SchemaObject, staticResultOption: StaticResultOption) =>
        saveProperties(newPropertyState, staticResultOption)
      }
      cancelPropertiesCallback={() => dispatch(selectPanelTab(constants.PANEL_TAB_NAMES.PARAMETERS))}
    />
  ) : null;
};

export const testingTab: PanelTab = {
  title: 'Testing',
  name: constants.PANEL_TAB_NAMES.TESTING,
  description: 'Static Testing Tab',
  visible: true,
  content: <TestingPanel />,
  order: 0,
  icon: 'Info',
};
