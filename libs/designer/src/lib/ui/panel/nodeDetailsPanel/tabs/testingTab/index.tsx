import constants from '../../../../../common/constants';
import type { AppDispatch } from '../../../../../core';
import { StaticResultOption } from '../../../../../core/actions/bjsworkflow/staticresults';
import { deleteStaticResult, updateStaticResults } from '../../../../../core/state/operation/operationMetadataSlice';
import { useParameterStaticResult } from '../../../../../core/state/operation/operationSelector';
import { setPinnedPanelActiveTab, setSelectedPanelActiveTab } from '../../../../../core/state/panel/panelSlice';
import { useOperationInfo } from '../../../../../core/state/selectors/actionMetadataSelector';
import { useStaticResultProperties, useStaticResultSchema } from '../../../../../core/state/staticresultschema/staitcresultsSelector';
import {
  deinitializeStaticResultProperty,
  updateStaticResultProperties,
} from '../../../../../core/state/staticresultschema/staticresultsSlice';
import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import { StaticResultContainer } from '@microsoft/designer-ui';
import { isNullOrUndefined, type OpenAPIV2 } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

export const TestingPanel: React.FC<PanelTabProps> = (props) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isPanelPinned, nodeId: selectedNode } = props;
  const operationInfo = useOperationInfo(selectedNode);
  const { connectorId, operationId } = operationInfo;
  const staticResultSchema = useStaticResultSchema(connectorId, operationId);
  const parameterStaticResult = useParameterStaticResult(selectedNode);
  const name = selectedNode + 0;
  const staticResultOptions = parameterStaticResult?.staticResultOptions;
  const properties = useStaticResultProperties(name);

  const selectPanelTabFn = isPanelPinned ? setPinnedPanelActiveTab : setSelectedPanelActiveTab;

  const savePropertiesCallback = useCallback(
    (properties: OpenAPIV2.SchemaObject | null, updatedStaticResultOptions: StaticResultOption) => {
      if (isNullOrUndefined(properties)) {
        dispatch(deinitializeStaticResultProperty({ id: name }));
        dispatch(deleteStaticResult({ id: selectedNode }));
      } else {
        dispatch(updateStaticResults({ id: selectedNode, staticResults: { name, staticResultOptions: updatedStaticResultOptions } }));
        dispatch(updateStaticResultProperties({ name, properties }));
      }
      dispatch(selectPanelTabFn(constants.PANEL_TAB_NAMES.PARAMETERS));
    },
    [dispatch, name, selectPanelTabFn, selectedNode]
  );

  const cancelPropertiesCallback = useCallback(() => {
    dispatch(selectPanelTabFn(constants.PANEL_TAB_NAMES.PARAMETERS));
  }, [dispatch, selectPanelTabFn]);

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

export const testingTab: PanelTabFn = (intl, props) => ({
  id: constants.PANEL_TAB_NAMES.TESTING,
  title: intl.formatMessage({
    defaultMessage: 'Testing',
    id: '8zkvmc',
    description: 'The tab label for the testing tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Testing tab',
    id: 'BXb3CB',
    description: 'An accessibility label that describes the testing tab',
  }),
  visible: true,
  content: <TestingPanel {...props} />,
  order: 5,
  icon: 'Info',
});
