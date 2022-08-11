import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import type { RootState } from '../../../core/store';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationGroupDetailsPage } from '@microsoft/designer-ui';
import { useDispatch, useSelector } from 'react-redux';

type OperationGroupDetailViewProps = {
  selectedSearchedOperations: DiscoveryOperation<DiscoveryResultTypes>[];
};

export const OperationGroupDetailView = (props: OperationGroupDetailViewProps) => {
  const dispatch = useDispatch();

  const { selectedSearchedOperations } = props;

  const rootState = useSelector((state: RootState) => state);
  const { discoveryIds, selectedNode } = useSelector((state: RootState) => state.panel);

  const onOperationClick = (id: string) => {
    const operation = selectedSearchedOperations.find((o) => o.id === id);
    addOperation(operation, discoveryIds, selectedNode, dispatch, rootState);
  };

  const onClickBack = () => {
    dispatch(selectOperationGroupId(''));
  };

  const operationGroupActions: OperationActionData[] = selectedSearchedOperations.map((operation) => {
    return {
      id: operation.id,
      title: operation.name,
      description: operation.description ?? operation.properties.description,
      summary: operation.properties.summary,
      category: 'Built-in', // TODO - Look at category from operation properties [from backend]
      connectorName: operation.properties.api.displayName,
      brandColor: operation.properties.api.brandColor,
    };
  });

  return (
    <>
      {
        selectedSearchedOperations.length > 0 ? (
          <OperationGroupDetailsPage
            operationApi={selectedSearchedOperations[0].properties.api}
            operationActionsData={operationGroupActions}
            onClickOperation={onOperationClick}
            onClickBack={onClickBack}
          />
        ) : null // loading logic goes here
      }
    </>
  );
};
