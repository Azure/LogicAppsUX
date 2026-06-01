import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Text,
} from '@fluentui/react-components';
import type { AppDispatch } from '../../../core';
import { storeStateToUndoRedoHistory } from '../../../core';
import { useNodeDisplayName } from '../../../core/state/workflow/workflowSelectors';
import { useOperationVisuals } from '../../../core/state/operation/operationSelector';
import { useOperationPanelSelectedNodeIds } from '../../../core/state/panel/panelSelectors';
import { setNodeSelection } from '../../../core/state/panel/panelSlice';
import { useShowMultiSelectDeleteModal } from '../../../core/state/designerView/designerViewSelectors';
import { setShowMultiSelectDeleteModal } from '../../../core/state/designerView/designerViewSlice';
import { deleteOperations } from '../../../core/actions/bjsworkflow/delete';
import { useMultiSelectDeleteModalStyles } from './MultiSelectDeleteModal.styles';

const MultiSelectDeleteRow = ({ nodeId }: { nodeId: string }): JSX.Element => {
  const styles = useMultiSelectDeleteModalStyles();
  const displayName = useNodeDisplayName(nodeId);
  const { iconUri } = useOperationVisuals(nodeId);

  return (
    <div className={styles.listItem}>
      {iconUri ? <img className={styles.listItemIcon} src={iconUri} alt="" aria-hidden={true} /> : null}
      <Text className={styles.listItemText} title={displayName}>
        {displayName}
      </Text>
    </div>
  );
};

export const MultiSelectDeleteModal = (): JSX.Element | null => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useMultiSelectDeleteModalStyles();

  const isOpen = useShowMultiSelectDeleteModal();
  const selectedNodeIds = useOperationPanelSelectedNodeIds();

  const intlText = useMemo(
    () => ({
      title: intl.formatMessage({
        defaultMessage: 'Delete workflow actions',
        id: 'Rk9QCh',
        description: 'Title for the dialog confirming deletion of multiple selected actions',
      }),
      body: intl.formatMessage(
        {
          defaultMessage: 'Are you sure you want to delete these {count} actions?',
          id: 'Lv/C+X',
          description: 'Body text confirming deletion of multiple selected actions',
        },
        { count: selectedNodeIds.length }
      ),
      detail: intl.formatMessage({
        defaultMessage: 'These steps will be removed from the Logic App, along with any of their child steps.',
        id: 'bHReZg',
        description: 'Additional detail text in the multi-delete confirmation dialog',
      }),
      deleteLabel: intl.formatMessage({
        defaultMessage: 'Delete',
        id: 'GxU+Zs',
        description: 'Label for the button that deletes all selected actions',
      }),
      cancelLabel: intl.formatMessage({
        defaultMessage: 'Cancel',
        id: '2istir',
        description: 'Label for the button that cancels the delete confirmation',
      }),
    }),
    [intl, selectedNodeIds.length]
  );

  const onClose = useMemo(() => () => dispatch(setShowMultiSelectDeleteModal(false)), [dispatch]);

  const onConfirm = useMemo(
    () => () => {
      dispatch(setShowMultiSelectDeleteModal(false));
      dispatch(storeStateToUndoRedoHistory({ type: deleteOperations.pending }));
      dispatch(deleteOperations({ nodeIds: selectedNodeIds }));
      dispatch(setNodeSelection([]));
    },
    [dispatch, selectedNodeIds]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(_event, data) => dispatch(setShowMultiSelectDeleteModal(data.open))} inertTrapFocus={true}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{intlText.title}</DialogTitle>
          <DialogContent>
            <p>{intlText.body}</p>
            <p>{intlText.detail}</p>
            <div className={styles.list}>
              {selectedNodeIds.map((nodeId) => (
                <MultiSelectDeleteRow key={nodeId} nodeId={nodeId} />
              ))}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={onConfirm}>
              {intlText.deleteLabel}
            </Button>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" onClick={onClose}>
                {intlText.cancelLabel}
              </Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default MultiSelectDeleteModal;
