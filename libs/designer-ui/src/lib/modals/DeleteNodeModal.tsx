import { Modal } from '@fluentui/react';
import { Button, Spinner } from '@fluentui/react-components';
import type { WorkflowNodeType } from '@microsoft/logic-apps-shared';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

export interface DeleteNodeModalProps {
  nodeId: string;
  nodeName: string;
  nodeType?: WorkflowNodeType;
  isOpen: boolean;
  isLoading?: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
}

export const DeleteNodeModal = (props: DeleteNodeModalProps) => {
  const { nodeId, nodeName, nodeType, isOpen, onDismiss, onConfirm } = props;

  const intl = useIntl();

  const operationNodeTitle = intl.formatMessage({
    defaultMessage: 'Delete Workflow Action',
    description: 'Title for operation node',
  });

  const graphNodeTitle = intl.formatMessage({
    defaultMessage: 'Delete Workflow Graph',
    description: 'Title for graph node',
  });

  const switchCaseTitle = intl.formatMessage({
    defaultMessage: 'Delete Switch Case',
    description: 'Title for switch case',
  });

  const otherNodeTitle = intl.formatMessage({
    defaultMessage: 'Node',
    description: 'Title for other node',
  });

  const title =
    nodeType === WORKFLOW_NODE_TYPES['OPERATION_NODE']
      ? operationNodeTitle
      : nodeType === WORKFLOW_NODE_TYPES['GRAPH_NODE']
      ? graphNodeTitle
      : nodeType === WORKFLOW_NODE_TYPES['SUBGRAPH_NODE'] // This is only for switch cases
      ? switchCaseTitle
      : otherNodeTitle;

  const confirmText = intl.formatMessage({
    defaultMessage: 'OK',
    description: 'Confirmation text for delete button',
  });

  const cancelText = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Text for cancel button',
  });

  const bodyConfirmText = intl.formatMessage(
    {
      defaultMessage: 'Are you sure you want to delete {nodeId}?',
      description: 'Text for delete node modal body',
    },
    { nodeId: <b>{nodeName}</b> }
  );

  const operationBodyMessage = intl.formatMessage({
    defaultMessage: 'This step will be removed from the Logic App.',
    description: 'Text for delete node modal body',
  });

  const graphBodyMessage = intl.formatMessage({
    defaultMessage: 'This will also remove all child steps.',
    description: 'Text for delete node modal body',
  });

  const deleteLoadingMessage = intl.formatMessage({
    defaultMessage: 'Deleting...',
    description: 'Text for loading state of delete modal',
  });

  const bodyMessage = nodeType === WORKFLOW_NODE_TYPES['OPERATION_NODE'] ? operationBodyMessage : graphBodyMessage;

  return (
    <Modal titleAriaId={title} isOpen={isOpen} onDismiss={onDismiss}>
      <div className="msla-modal-container">
        {!nodeId ? (
          <Spinner label={deleteLoadingMessage} />
        ) : (
          <>
            <h2>{title}</h2>
            <p>{bodyConfirmText}</p>
            <p>{bodyMessage}</p>
            <div className="msla-modal-footer">
              <Button appearance="primary" onClick={onConfirm}>
                {confirmText}
              </Button>
              <Button onClick={onDismiss}>{cancelText}</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
