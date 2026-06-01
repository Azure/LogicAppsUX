import { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { Panel, PanelType } from '@fluentui/react';
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
  mergeClasses,
} from '@fluentui/react-components';
import { Delete24Regular } from '@fluentui/react-icons';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { PanelLocation } from '@microsoft/designer-ui';
import type { AppDispatch } from '../../../core';
import { storeStateToUndoRedoHistory } from '../../../core';
import { useNodeDisplayName } from '../../../core/state/workflow/workflowSelectors';
import { useOperationVisuals } from '../../../core/state/operation/operationSelector';
import { useCanWrapSelectedNodes, useOperationPanelSelectedNodeIds } from '../../../core/state/panel/panelSelectors';
import { clearPanel, setNodeSelection } from '../../../core/state/panel/panelSlice';
import { deleteOperations } from '../../../core/actions/bjsworkflow/delete';
import { wrapSelectedNodesInScope } from '../../../core/actions/bjsworkflow/wrapInScope';
import { useMultiSelectPanelStyles } from './multiSelectPanel.styles';

interface MultiSelectNodeRowProps {
  nodeId: string;
}

const MultiSelectNodeRow = ({ nodeId }: MultiSelectNodeRowProps): JSX.Element => {
  const styles = useMultiSelectPanelStyles();
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

export const MultiSelectPanel = (props: CommonPanelProps): JSX.Element => {
  const { isCollapsed, panelLocation } = props;
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useMultiSelectPanelStyles();

  const selectedNodeIds = useOperationPanelSelectedNodeIds();
  const canWrap = useCanWrapSelectedNodes();

  const intlText = useMemo(
    () => ({
      title: intl.formatMessage({
        defaultMessage: 'Multiple actions selected',
        id: 'AaVRhS',
        description: 'Title for the panel shown when multiple workflow actions are selected',
      }),
      subtitle: intl.formatMessage(
        {
          defaultMessage: '{count} actions selected',
          id: '2PaVqw',
          description: 'Subtitle showing how many actions are currently selected',
        },
        { count: selectedNodeIds.length }
      ),
      deleteLabel: intl.formatMessage({
        defaultMessage: 'Delete',
        id: 'GxU+Zs',
        description: 'Label for the button that deletes all selected actions',
      }),
      deleteConfirmTitle: intl.formatMessage({
        defaultMessage: 'Delete workflow actions',
        id: 'Rk9QCh',
        description: 'Title for the dialog confirming deletion of multiple selected actions',
      }),
      deleteConfirmBody: intl.formatMessage(
        {
          defaultMessage: 'Are you sure you want to delete these {count} actions?',
          id: 'Lv/C+X',
          description: 'Body text confirming deletion of multiple selected actions',
        },
        { count: selectedNodeIds.length }
      ),
      deleteConfirmDetail: intl.formatMessage({
        defaultMessage: 'These steps will be removed from the Logic App, along with any of their child steps.',
        id: 'bHReZg',
        description: 'Additional detail text in the multi-delete confirmation dialog',
      }),
      cancelLabel: intl.formatMessage({
        defaultMessage: 'Cancel',
        id: '2istir',
        description: 'Label for the button that cancels the delete confirmation',
      }),
      wrapHeading: intl.formatMessage({
        defaultMessage: 'Wrap in',
        id: 'qDS8i+',
        description: 'Heading for the group of actions that wrap selected nodes in a scope',
      }),
      wrapScope: intl.formatMessage({
        defaultMessage: 'Scope',
        id: 'cx1uqu',
        description: 'Label for wrapping selected actions in a scope',
      }),
      wrapCondition: intl.formatMessage({
        defaultMessage: 'Condition',
        id: 'qbJ5A3',
        description: 'Label for wrapping selected actions in a condition',
      }),
      panelAriaLabel: intl.formatMessage({
        defaultMessage: 'Multiple selection panel',
        id: 'sZLBvN',
        description: 'Accessibility label for the multiple selection panel',
      }),
    }),
    [intl, selectedNodeIds.length]
  );

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const onDelete = useMemo(
    () => () => {
      setIsDeleteConfirmOpen(true);
    },
    []
  );

  const onConfirmDelete = useMemo(
    () => () => {
      setIsDeleteConfirmOpen(false);
      dispatch(storeStateToUndoRedoHistory({ type: deleteOperations.pending }));
      dispatch(deleteOperations({ nodeIds: selectedNodeIds }));
    },
    [dispatch, selectedNodeIds]
  );

  const onWrapInScope = useMemo(
    () => () => {
      dispatch(wrapSelectedNodesInScope({ nodeIds: selectedNodeIds, scopeType: 'Scope' }));
    },
    [dispatch, selectedNodeIds]
  );

  const onWrapInCondition = useMemo(
    () => () => {
      dispatch(wrapSelectedNodesInScope({ nodeIds: selectedNodeIds, scopeType: 'If' }));
    },
    [dispatch, selectedNodeIds]
  );

  const onDismiss = useMemo(
    () => () => {
      dispatch(setNodeSelection([]));
      dispatch(clearPanel());
    },
    [dispatch]
  );

  return (
    <Panel
      className={'msla-panel-root-MultiSelect'}
      isLightDismiss
      isBlocking={false}
      type={panelLocation === PanelLocation.Right ? PanelType.custom : PanelType.customNear}
      isOpen={!isCollapsed}
      onDismiss={onDismiss}
      hasCloseButton={false}
      customWidth={'400px'}
      layerProps={{ hostId: 'msla-layer-host', eventBubblingEnabled: true }}
      popupProps={{ ariaLabel: intlText.panelAriaLabel }}
    >
      <div className={styles.root}>
        <div className={styles.header}>
          <Text className={styles.title}>{intlText.title}</Text>
        </div>
        <Text className={styles.subtitle}>{intlText.subtitle}</Text>
        <div className={mergeClasses(styles.list)}>
          {selectedNodeIds.map((nodeId) => (
            <MultiSelectNodeRow key={nodeId} nodeId={nodeId} />
          ))}
        </div>
        {canWrap ? (
          <div className={styles.wrapSection}>
            <Text className={styles.wrapHeading}>{intlText.wrapHeading}</Text>
            <div className={styles.wrapButtons}>
              <Button appearance="secondary" onClick={onWrapInScope}>
                {intlText.wrapScope}
              </Button>
              <Button appearance="secondary" onClick={onWrapInCondition}>
                {intlText.wrapCondition}
              </Button>
            </div>
          </div>
        ) : null}
        <div className={styles.footer}>
          <Button appearance="primary" icon={<Delete24Regular />} onClick={onDelete}>
            {intlText.deleteLabel}
          </Button>
        </div>
      </div>
      <Dialog
        open={isDeleteConfirmOpen}
        onOpenChange={(_event, data) => setIsDeleteConfirmOpen(data.open)}
        inertTrapFocus={true}
        surfaceMotion={null}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{intlText.deleteConfirmTitle}</DialogTitle>
            <DialogContent>
              <p>{intlText.deleteConfirmBody}</p>
              <p>{intlText.deleteConfirmDetail}</p>
              <div className={styles.dialogList}>
                {selectedNodeIds.map((nodeId) => (
                  <MultiSelectNodeRow key={nodeId} nodeId={nodeId} />
                ))}
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={onConfirmDelete}>
                {intlText.deleteLabel}
              </Button>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">{intlText.cancelLabel}</Button>
              </DialogTrigger>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </Panel>
  );
};
