import constants from '../../../../../common/constants';
import type { AppDispatch } from '../../../../../core';
import { StaticResultOption } from '../../../../../core/actions/bjsworkflow/staticresults';
import { updateStaticResults } from '../../../../../core/state/operation/operationMetadataSlice';
import { useParameterStaticResult } from '../../../../../core/state/operation/operationSelector';
import { selectPanelTab } from '../../../../../core/state/panel/panelSlice';
import { useOperationInfo } from '../../../../../core/state/selectors/actionMetadataSelector';
import { useStaticResultProperties, useStaticResultSchema } from '../../../../../core/state/staticresultschema/staitcresultsSelector';
import { updateStaticResultProperties } from '../../../../../core/state/staticresultschema/staticresultsSlice';
import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import { StaticResultContainer } from '@microsoft/designer-ui';
import type { OpenAPIV2 } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

export const TestingPanel: React.FC<PanelTabProps> = (props) => {
  const dispatch = useDispatch<AppDispatch>();
  const { nodeId: selectedNode } = props;
  const operationInfo = useOperationInfo(selectedNode);
  const { connectorId, operationId } = operationInfo;
  const staticResultSchema = useStaticResultSchema(connectorId, operationId);
  const parameterStaticResult = useParameterStaticResult(selectedNode);
  const name = selectedNode + 0;
  const staticResultOptions = parameterStaticResult?.staticResultOptions;
  const properties = useStaticResultProperties(name);

  const savePropertiesCallback = useCallback(
    (properties: OpenAPIV2.SchemaObject, updatedStaticResultOptions: StaticResultOption) => {
      dispatch(updateStaticResults({ id: selectedNode, staticResults: { name, staticResultOptions: updatedStaticResultOptions } }));
      dispatch(updateStaticResultProperties({ name, properties }));
      dispatch(selectPanelTab(constants.PANEL_TAB_NAMES.PARAMETERS));
    },
    [dispatch, name, selectedNode]
  );

  const cancelPropertiesCallback = useCallback(() => {
    dispatch(selectPanelTab(constants.PANEL_TAB_NAMES.PARAMETERS));
  }, [dispatch]);

  return staticResultSchema ? (
    <StaticResultContainer
      key={`${name}`}
      properties={(properties ?? {}) as OpenAPIV2.SchemaObject}
      staticResultSchema={staticResultSchema}
      enabled={staticResultOptions === StaticResultOption.ENABLED}
      savePropertiesCallback={savePropertiesCallback}
      cancelPropertiesCallback={cancelPropertiesCallback}
    />
  ) : null;
};

export const testingTab: PanelTabFn = (intl, nodeId) => ({
  id: constants.PANEL_TAB_NAMES.TESTING,
  title: intl.formatMessage({
    defaultMessage: 'Testing',
    id: '8zkvmc',
    description: 'The tab label for the testing tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Testing Tab',
    id: 'sEqLTV',
    description: 'An accessability label that describes the testing tab',
  }),
  visible: true,
  content: <TestingPanel nodeId={nodeId} />,
  order: 5,
  icon: 'Info',
});
