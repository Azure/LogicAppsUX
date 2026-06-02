import { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { Button, Text } from '@fluentui/react-components';
import { Delete24Regular } from '@fluentui/react-icons';
import type { CommonPanelProps, PanelNodeData } from '@microsoft/designer-ui';
import { PanelContainer, PanelHeader, PanelLocation, PanelScope } from '@microsoft/designer-ui';
import type { AppDispatch } from '../../../core';
import { useNodeDisplayName } from '../../../core/state/workflow/workflowSelectors';
import { useOperationVisuals } from '../../../core/state/operation/operationSelector';
import { useCanWrapSelectedNodes, useOperationPanelSelectedNodeIds } from '../../../core/state/panel/panelSelectors';
import { clearPanel, setNodeSelection } from '../../../core/state/panel/panelSlice';
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

interface MultiSelectPanelBodyProps {
  panelLocation: PanelLocation;
  onClose: () => void;
}

const MultiSelectPanelBody = ({ panelLocation, onClose }: MultiSelectPanelBodyProps): JSX.Element => {
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
      deleteLabel: intl.formatMessage({
        defaultMessage: 'Delete',
        id: 'GxU+Zs',
        description: 'Label for the button that deletes all selected actions',
      }),
      countAriaLabel: intl.formatMessage(
        {
          defaultMessage: '{count} actions selected',
          id: 'CBKu4V',
          description: 'Accessible label for the badge showing the number of selected actions',
        },
        { count: selectedNodeIds.length }
      ),
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
    }),
    [intl, selectedNodeIds.length]
  );

  const onDelete = useCallback(() => {
    dispatch(setShowMultiSelectDeleteModal(true));
  }, [dispatch]);

  const onWrapInScope = useCallback(() => {
    dispatch(wrapSelectedNodesInScope({ nodeIds: selectedNodeIds, scopeType: 'Scope' }));
  }, [dispatch, selectedNodeIds]);

  const onWrapInCondition = useCallback(() => {
    dispatch(wrapSelectedNodesInScope({ nodeIds: selectedNodeIds, scopeType: 'If' }));
  }, [dispatch, selectedNodeIds]);

  const headerNodeData: PanelNodeData = useMemo(
    () => ({
      comment: undefined,
      displayName: intlText.title,
      errorMessage: undefined,
      iconUri: undefined,
      isError: false,
      isLoading: false,
      nodeId: 'multi-select',
      onSelectTab: () => undefined,
      selectedTab: undefined,
      tabs: [],
    }),
    [intlText.title]
  );

  const countBadge = (
    <div className={styles.countBadge} aria-label={intlText.countAriaLabel}>
      {selectedNodeIds.length}
    </div>
  );

  return (
    <div className="msla-panel-layout">
      <PanelHeader
        nodeData={headerNodeData}
        headerItems={[]}
        headerLocation={panelLocation}
        panelScope={PanelScope.CardLevel}
        readOnlyMode={true}
        renameTitleDisabled={true}
        hideComment={true}
        customIcon={countBadge}
        commentChange={() => undefined}
        onClose={onClose}
        onTitleChange={() => ({ valid: true })}
        handleTitleUpdate={() => undefined}
      />
      <div className="msla-panel-contents">
        <div className={styles.root}>
          <div className={styles.list}>
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
      </div>
    </div>
  );
};

export const MultiSelectPanel = (props: CommonPanelProps): JSX.Element => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

  const [overrideWidth, setOverrideWidth] = useState<string | undefined>(undefined);

  const ariaLabel = useMemo(
    () =>
      intl.formatMessage({
        defaultMessage: 'Multi-select panel',
        id: 'EcbMzH',
        description: 'Aria label for the panel shown when multiple workflow actions are selected',
      }),
    [intl]
  );

  const onClose = useCallback(() => {
    dispatch(setNodeSelection([]));
    dispatch(clearPanel());
    props.toggleCollapse();
  }, [dispatch, props]);

  return (
    <PanelContainer
      {...props}
      panelScope={PanelScope.CardLevel}
      node={undefined}
      nodeHeaderItems={[]}
      alternateSelectedNode={undefined}
      alternateSelectedNodeHeaderItems={[]}
      alternateSelectedNodePersistence={'selected'}
      onClose={onClose}
      trackEvent={() => undefined}
      onCommentChange={() => undefined}
      onTitleChange={() => ({ valid: true })}
      handleTitleUpdate={() => undefined}
      overrideWidth={overrideWidth}
      setOverrideWidth={setOverrideWidth}
      customContent={<MultiSelectPanelBody panelLocation={props.panelLocation ?? PanelLocation.Right} onClose={onClose} />}
      customAriaLabel={ariaLabel}
    />
  );
};
