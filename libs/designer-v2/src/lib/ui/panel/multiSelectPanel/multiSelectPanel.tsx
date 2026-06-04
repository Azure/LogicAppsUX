import { useCallback, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { Button, Menu, MenuButton, MenuItem, MenuList, MenuPopover, MenuTrigger, Tag, TagGroup, Tooltip } from '@fluentui/react-components';
import type { TagDismissData } from '@fluentui/react-components';
import { Copy24Regular, Cut24Regular, Delete24Regular, Group24Regular } from '@fluentui/react-icons';
import type { CommonPanelProps, PanelNodeData } from '@microsoft/designer-ui';
import { PanelContainer, PanelHeader, PanelLocation, PanelScope, PanelSize } from '@microsoft/designer-ui';
import type { AppDispatch } from '../../../core';
import { useNodeDisplayName } from '../../../core/state/workflow/workflowSelectors';
import { useOperationVisuals } from '../../../core/state/operation/operationSelector';
import { useCanWrapSelectedNodes, useOperationPanelSelectedNodeIds } from '../../../core/state/panel/panelSelectors';
import { clearPanel, setNodeSelection } from '../../../core/state/panel/panelSlice';
import { setShowMultiSelectDeleteModal } from '../../../core/state/designerView/designerViewSlice';
import { wrapSelectedNodesInScope } from '../../../core/actions/bjsworkflow/wrapInScope';
import { copyOperations, cutOperations } from '../../../core/actions/bjsworkflow/copypaste';
import { CopyTooltip } from '../../common/DesignerContextualMenu/CopyTooltip';
import { useMultiSelectPanelStyles } from './multiSelectPanel.styles';

const MultiSelectTag = ({ nodeId }: { nodeId: string }): JSX.Element => {
  const styles = useMultiSelectPanelStyles();
  const displayName = useNodeDisplayName(nodeId);
  const { iconUri } = useOperationVisuals(nodeId);

  return (
    <Tag
      shape="rounded"
      media={iconUri ? <img className={styles.tagIcon} src={iconUri} alt="" aria-hidden="true" /> : undefined}
      value={nodeId}
      dismissible
      dismissIcon={{ 'aria-label': 'remove' }}
      appearance="brand"
    >
      {displayName}
    </Tag>
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

  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const [showCopyCallout, setShowCopyCallout] = useState(false);

  const showCopiedTooltip = useCallback(() => {
    setShowCopyCallout(true);
    setTimeout(() => setShowCopyCallout(false), 1500);
  }, []);

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
      cutLabel: intl.formatMessage({
        defaultMessage: 'Cut',
        id: '86z4Hs',
        description: 'Label for the button that cuts selected actions',
      }),
      copyLabel: intl.formatMessage({
        defaultMessage: 'Copy',
        id: 'B9mTVF',
        description: 'Label for the button that copies selected actions',
      }),
      groupLabel: intl.formatMessage({
        defaultMessage: 'Group',
        id: 'lMW1iR',
        description: 'Label for the button that groups selected actions',
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
      wrapForEach: intl.formatMessage({
        defaultMessage: 'For each',
        id: 'Ruw/go',
        description: 'Label for wrapping selected actions in a for-each loop',
      }),
      wrapUntil: intl.formatMessage({
        defaultMessage: 'Do until',
        id: 'suBFWf',
        description: 'Label for wrapping selected actions in a do-until loop',
      }),
      wrapSwitch: intl.formatMessage({
        defaultMessage: 'Switch',
        id: 'h3t4It',
        description: 'Label for wrapping selected actions in a switch',
      }),
      groupDisabledTooltip: intl.formatMessage({
        defaultMessage: 'Select actions that form a contiguous block to group them',
        id: '0HHGtU',
        description: 'Tooltip shown when the group button is disabled because the selected actions cannot be grouped',
      }),
    }),
    [intl, selectedNodeIds.length]
  );

  const onDelete = useCallback(() => {
    dispatch(setShowMultiSelectDeleteModal(true));
  }, [dispatch]);

  const onCut = useCallback(() => {
    dispatch(cutOperations({ nodeIds: selectedNodeIds }));
    showCopiedTooltip();
  }, [dispatch, selectedNodeIds, showCopiedTooltip]);

  const onCopy = useCallback(() => {
    dispatch(copyOperations({ nodeIds: selectedNodeIds }));
    showCopiedTooltip();
  }, [dispatch, selectedNodeIds, showCopiedTooltip]);

  const onWrapInScope = useCallback(() => {
    dispatch(wrapSelectedNodesInScope({ nodeIds: selectedNodeIds, scopeType: 'Scope' }));
  }, [dispatch, selectedNodeIds]);

  const onWrapInCondition = useCallback(() => {
    dispatch(wrapSelectedNodesInScope({ nodeIds: selectedNodeIds, scopeType: 'If' }));
  }, [dispatch, selectedNodeIds]);

  const onWrapInForEach = useCallback(() => {
    dispatch(wrapSelectedNodesInScope({ nodeIds: selectedNodeIds, scopeType: 'ForEach' }));
  }, [dispatch, selectedNodeIds]);

  const onWrapInUntil = useCallback(() => {
    dispatch(wrapSelectedNodesInScope({ nodeIds: selectedNodeIds, scopeType: 'Until' }));
  }, [dispatch, selectedNodeIds]);

  const onWrapInSwitch = useCallback(() => {
    dispatch(wrapSelectedNodesInScope({ nodeIds: selectedNodeIds, scopeType: 'Switch' }));
  }, [dispatch, selectedNodeIds]);

  const onDismissTag = useCallback(
    (_e: unknown, data: TagDismissData) => {
      dispatch(setNodeSelection(selectedNodeIds.filter((id) => id !== data.value)));
    },
    [dispatch, selectedNodeIds]
  );

  const headerNodeData: PanelNodeData = useMemo(
    () => ({
      comment: undefined,
      displayName: intlText.title,
      errorMessage: undefined,
      iconUri: '',
      isError: false,
      isLoading: false,
      nodeId: 'multi-select',
      onSelectTab: () => undefined,
      runData: undefined,
      selectedTab: undefined,
      subgraphType: undefined,
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
    <div className={`msla-panel-container-nested msla-panel-container-nested-${panelLocation.toLowerCase()}`}>
      <div className="msla-panel-layout msla-panel-border-selected">
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
          onTitleChange={() => ({ valid: true, message: '' })}
          handleTitleUpdate={() => undefined}
        />
        <div className="msla-panel-contents">
          <div className={styles.root}>
            <TagGroup className={styles.tagList} onDismiss={onDismissTag}>
              {selectedNodeIds.map((nodeId) => (
                <MultiSelectTag key={nodeId} nodeId={nodeId} />
              ))}
            </TagGroup>
            <div className={styles.actionButtons}>
              <Button icon={<Cut24Regular />} onClick={onCut}>
                {intlText.cutLabel}
              </Button>
              <Button ref={copyButtonRef} icon={<Copy24Regular />} onClick={onCopy}>
                {intlText.copyLabel}
              </Button>
              {canWrap ? (
                <Menu>
                  <MenuTrigger disableButtonEnhancement>
                    <MenuButton icon={<Group24Regular />}>{intlText.groupLabel}</MenuButton>
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      <MenuItem
                        icon={
                          <img
                            className={styles.menuItemIcon}
                            src="https://logicappsv2resources.blob.core.windows.net/icons/scope.svg"
                            alt=""
                            aria-hidden="true"
                          />
                        }
                        onClick={onWrapInScope}
                      >
                        {intlText.wrapScope}
                      </MenuItem>
                      <MenuItem
                        icon={
                          <img
                            className={styles.menuItemIcon}
                            src="https://logicappsv2resources.blob.core.windows.net/icons/condition.svg"
                            alt=""
                            aria-hidden="true"
                          />
                        }
                        onClick={onWrapInCondition}
                      >
                        {intlText.wrapCondition}
                      </MenuItem>
                      <MenuItem
                        icon={
                          <img
                            className={styles.menuItemIcon}
                            src="https://logicappsv2resources.blob.core.windows.net/icons/foreach.svg"
                            alt=""
                            aria-hidden="true"
                          />
                        }
                        onClick={onWrapInForEach}
                      >
                        {intlText.wrapForEach}
                      </MenuItem>
                      <MenuItem
                        icon={
                          <img
                            className={styles.menuItemIcon}
                            src="https://logicappsv2resources.blob.core.windows.net/icons/until.svg"
                            alt=""
                            aria-hidden="true"
                          />
                        }
                        onClick={onWrapInUntil}
                      >
                        {intlText.wrapUntil}
                      </MenuItem>
                      <MenuItem
                        icon={
                          <img
                            className={styles.menuItemIcon}
                            src="https://logicappsv2resources.blob.core.windows.net/icons/switch.svg"
                            alt=""
                            aria-hidden="true"
                          />
                        }
                        onClick={onWrapInSwitch}
                      >
                        {intlText.wrapSwitch}
                      </MenuItem>
                    </MenuList>
                  </MenuPopover>
                </Menu>
              ) : (
                <Tooltip content={intlText.groupDisabledTooltip} relationship="label">
                  <MenuButton icon={<Group24Regular />} disabled>
                    {intlText.groupLabel}
                  </MenuButton>
                </Tooltip>
              )}
              <Button icon={<Delete24Regular />} onClick={onDelete}>
                {intlText.deleteLabel}
              </Button>
            </div>
            {showCopyCallout ? (
              <CopyTooltip targetRef={copyButtonRef} hideTooltip={() => setShowCopyCallout(false)} id="multi-select-copy" />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MultiSelectPanel = (props: CommonPanelProps): JSX.Element => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

  const [overrideWidth, setOverrideWidth] = useState<string | undefined>(PanelSize.DualView);

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
      onTitleChange={() => ({ valid: true, message: '' })}
      handleTitleUpdate={() => undefined}
      overrideWidth={overrideWidth}
      setOverrideWidth={setOverrideWidth}
      customContent={<MultiSelectPanelBody panelLocation={props.panelLocation ?? PanelLocation.Right} onClose={onClose} />}
      customAriaLabel={ariaLabel}
    />
  );
};
