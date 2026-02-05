import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Spinner,
} from '@fluentui/react-components';
import type { WorkflowNodeType } from '@microsoft/logic-apps-shared';
import { equals, SUBGRAPH_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { useModalStyles } from './styles';

export interface DeleteNodeModalProps {
  nodeId: string;
  nodeName: string;
  nodeType?: WorkflowNodeType;
  subgraphType?: string;
  operationType?: string;
  isOpen: boolean;
  isLoading?: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
}

export const DeleteNodeModal = (props: DeleteNodeModalProps) => {
  const { nodeId, nodeName, nodeType, subgraphType, operationType, isOpen, onDismiss, onConfirm } = props;
  const styles = useModalStyles();

  const intl = useIntl();

  const isAgentNode = equals(operationType, 'Agent');

  const deleteLoadingMessage = intl.formatMessage({
    defaultMessage: 'Deleting...',
    id: 'HX3Xmx',
    description: 'Text for loading state of delete modal',
  });

  const closingLoadingMessage = intl.formatMessage({
    defaultMessage: 'Closing...',
    id: 'KWeLBB',
    description: 'Text for loading state of closing modal',
  });

  const [spinnerText, setSpinnerText] = useState(deleteLoadingMessage);

  const operationNodeTitle = intl.formatMessage({
    defaultMessage: 'Delete workflow action',
    id: '/ye9Df',
    description: 'Title for operation node',
  });

  const graphNodeTitle = intl.formatMessage({
    defaultMessage: 'Delete workflow graph',
    id: '6rJ+Fj',
    description: 'Title for graph node',
  });

  const agentNodeTitle = intl.formatMessage({
    defaultMessage: 'Delete agent',
    id: 'EAAlZ9',
    description: 'Title for agent node',
  });

  const switchCaseTitle = intl.formatMessage({
    defaultMessage: 'Delete switch case',
    id: 'oPKLDZ',
    description: 'Title for switch case',
  });

  const agentToolTitle = intl.formatMessage({
    defaultMessage: 'Delete agent tool',
    id: 'blpdoG',
    description: 'Title for agent tool',
  });

  const otherNodeTitle = intl.formatMessage({
    defaultMessage: 'Node',
    id: 'DDIIAQ',
    description: 'Title for other node',
  });

  const title =
    nodeType === WORKFLOW_NODE_TYPES['OPERATION_NODE']
      ? operationNodeTitle
      : nodeType === WORKFLOW_NODE_TYPES['GRAPH_NODE']
        ? isAgentNode
          ? agentNodeTitle
          : graphNodeTitle
        : nodeType === WORKFLOW_NODE_TYPES['SUBGRAPH_NODE'] // This is only for switch cases
          ? subgraphType === SUBGRAPH_TYPES['AGENT_CONDITION']
            ? agentToolTitle
            : switchCaseTitle
          : otherNodeTitle;

  const confirmText = intl.formatMessage({
    defaultMessage: 'Delete',
    id: '+iPg27',
    description: 'Confirmation text for delete button',
  });

  const cancelText = intl.formatMessage({
    defaultMessage: 'Cancel',
    id: 'ti5TEd',
    description: 'Text for cancel button',
  });

  const bodyConfirmText = intl.formatMessage(
    {
      defaultMessage: 'Are you sure you want to delete {nodeId}?',
      id: 'iHVVTl',
      description: 'Text for delete node modal body',
    },
    { nodeId: <b>{nodeName}</b> }
  );

  const operationBodyMessage = intl.formatMessage({
    defaultMessage: 'This step will be removed from the Logic App.',
    id: '6lLsi+',
    description: 'Text for delete node modal body',
  });

  const graphBodyMessage = intl.formatMessage({
    defaultMessage: 'This will also remove all child steps.',
    id: 'z9kH+0',
    description: 'Text for delete node modal body',
  });

  const agentBodyMessage = intl.formatMessage({
    defaultMessage: "This will also delete the agent's tools and actions.",
    id: 'wK023m',
    description: 'Text for delete agent modal body',
  });

  const bodyMessage =
    nodeType === WORKFLOW_NODE_TYPES['OPERATION_NODE']
      ? operationBodyMessage
      : nodeType === WORKFLOW_NODE_TYPES['GRAPH_NODE']
        ? isAgentNode
          ? agentBodyMessage
          : graphBodyMessage
        : graphBodyMessage;

  const onClosing = useCallback(() => {
    setSpinnerText(closingLoadingMessage);
    onDismiss();
  }, [closingLoadingMessage, onDismiss]);

  return (
    <Dialog inertTrapFocus={true} open={isOpen} aria-labelledby={title} onOpenChange={onClosing} surfaceMotion={null}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{nodeId ? title : ''}</DialogTitle>
          <DialogContent className={styles.modalContainer}>
            {nodeId ? (
              <>
                <p>{bodyConfirmText}</p>
                <p>{bodyMessage}</p>
              </>
            ) : (
              <Spinner label={spinnerText} />
            )}
          </DialogContent>
          <DialogActions>
            <DialogTrigger>
              <Button appearance="primary" onClick={onConfirm}>
                {confirmText}
              </Button>
            </DialogTrigger>
            <DialogTrigger>
              <Button onClick={onClosing}>{cancelText}</Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
