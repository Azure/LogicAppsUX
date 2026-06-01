import { useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { Panel, PanelType } from '@fluentui/react';
import { Button, Text, mergeClasses } from '@fluentui/react-components';
import { Delete24Regular } from '@fluentui/react-icons';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { PanelLocation } from '@microsoft/designer-ui';
import type { AppDispatch } from '../../../core';
import { useNodeDisplayName } from '../../../core/state/workflow/workflowSelectors';
import { useOperationVisuals } from '../../../core/state/operation/operationSelector';
import { useCanWrapSelectedNodes, useOperationPanelSelectedNodeIds } from '../../../core/state/panel/panelSelectors';
import { clearPanel, setNodeSelection } from '../../../core/state/panel/panelSlice';
import { useShowMultiSelectDeleteModal } from '../../../core/state/designerView/designerViewSelectors';
import { setShowMultiSelectDeleteModal } from '../../../core/state/designerView/designerViewSlice';
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

  // The delete confirmation dialog renders above this (light-dismiss) panel. Backing out of that
  // dialog (Escape / outside click) ends up triggering the panel's light-dismiss handler and would
  // otherwise clear the selection. Escape closes the dialog first and the panel's dismiss can fire
  // either in the same tick or a later one (e.g. focus restoration after the dialog unmounts), so we
  // guard with both the live open state and a short window after it closes.
  const isDeleteModalOpen = useShowMultiSelectDeleteModal();
  const isDeleteModalOpenRef = useRef(isDeleteModalOpen);
  const deleteModalClosedAtRef = useRef(0);
  useEffect(() => {
    if (isDeleteModalOpenRef.current && !isDeleteModalOpen) {
      deleteModalClosedAtRef.current = Date.now();
    }
    isDeleteModalOpenRef.current = isDeleteModalOpen;
  }, [isDeleteModalOpen]);

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

  const onDelete = useMemo(
    () => () => {
      dispatch(setShowMultiSelectDeleteModal(true));
    },
    [dispatch]
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
      // Don't clear the selection when the dismiss was triggered by backing out of the delete dialog.
      // The dialog may already be closed by the time this fires (Escape closes it first, then focus
      // restoration triggers this panel's light-dismiss), so also ignore dismissals that land in a
      // short window right after the dialog closed. Genuine click-away deselect is still handled by
      // the canvas `onPaneClick` -> `clearPanel`, so this guard doesn't break that path.
      if (isDeleteModalOpenRef.current || Date.now() - deleteModalClosedAtRef.current < 500) {
        return;
      }
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
    </Panel>
  );
};
