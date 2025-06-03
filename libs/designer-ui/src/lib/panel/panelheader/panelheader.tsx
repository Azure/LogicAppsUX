import { PanelLocation, PanelScope } from '../panelUtil';
import type { PanelNodeData } from '../types';
import { PanelHeaderComment } from './panelheadercomment';
import type { TitleChangeHandler } from './panelheadertitle';
import { PanelHeaderTitle } from './panelheadertitle';
import { usePanelStyles, getPanelClasses } from '../styles';
import {
  Button,
  Menu,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  Spinner,
  Tooltip,
  useRestoreFocusTarget,
  mergeClasses,
} from '@fluentui/react-components';
import {
  bundleIcon,
  ChevronDoubleRightFilled,
  ChevronDoubleRightRegular,
  MoreVertical24Filled,
  MoreVertical24Regular,
  PinOffRegular,
} from '@fluentui/react-icons';
import { Icon } from '@fluentui/react/lib/Icon';
import { useTheme } from '@fluentui/react';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { useEffect, useMemo, useRef } from 'react';
import { useIntl } from 'react-intl';

export const handleOnEscapeDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
  if (e.key === 'Escape') {
    e.preventDefault();
  }
};

export interface PanelHeaderProps {
  nodeData: PanelNodeData;
  isCollapsed: boolean;
  isOutermostPanel?: boolean;
  headerItems: JSX.Element[];
  headerLocation: PanelLocation;
  noNodeSelected?: boolean;
  panelScope: PanelScope;
  suppressDefaultNodeSelectFunctionality?: boolean;
  readOnlyMode?: boolean;
  renameTitleDisabled?: boolean;
  canResubmit?: boolean;
  resubmitOperation?: () => void;
  onUnpinAction?: () => void;
  commentChange(newValue?: string): void;
  onRenderWarningMessage?(): JSX.Element;
  toggleCollapse: () => void;
  onTitleChange: TitleChangeHandler;
  handleTitleUpdate: (originalId: string, newId: string) => void;
  canShowLogicAppRun?: boolean;
  showLogicAppRun?: () => void;
  showTriggerInfo?: boolean;
  isTrigger?: boolean;
}

const DismissIcon = bundleIcon(ChevronDoubleRightFilled, ChevronDoubleRightRegular);
const OverflowIcon = bundleIcon(MoreVertical24Filled, MoreVertical24Regular);

const CollapseButton = (props: PanelHeaderProps & { isRight: boolean; nodeId: string; classes: any }): JSX.Element => {
  const { isCollapsed, isOutermostPanel, isRight, nodeId, toggleCollapse, classes } = props;

  const intl = useIntl();

  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const panelCollapseTitle = intl.formatMessage({
    defaultMessage: 'Collapse',
    id: 'lX30/R',
    description: 'Text of Tooltip to collapse',
  });
  const panelExpandTitle = intl.formatMessage({
    defaultMessage: 'Expand',
    id: 'oZMhX/',
    description: 'Text of Tooltip to expand',
  });
  const buttonText = isCollapsed ? panelExpandTitle : panelCollapseTitle;

  const className = mergeClasses(
    classes.collapseToggle,
    isRight
      ? isCollapsed
        ? classes.collapseToggleRightCollapsed
        : classes.collapseToggleRight
      : isCollapsed
        ? classes.collapseToggleLeftCollapsed
        : classes.collapseToggleLeft
  );

  useEffect(() => {
    if (isCollapsed || !isOutermostPanel || !nodeId) {
      return;
    }

    menuButtonRef.current?.focus();
  }, [isCollapsed, isOutermostPanel, nodeId]);

  return (
    <Tooltip relationship="label" positioning={'before'} content={buttonText}>
      <Button
        id="msla-panel-header-collapse-nav"
        ref={menuButtonRef}
        appearance="subtle"
        icon={<DismissIcon />}
        className={className}
        aria-label={buttonText}
        onClick={toggleCollapse}
        data-automation-id="msla-panel-header-collapse-nav"
      />
    </Tooltip>
  );
};

const OverflowButton = (props: PanelHeaderProps): JSX.Element => {
  const { headerItems } = props;
  const restoreFocusTargetAttribute = useRestoreFocusTarget();
  const intl = useIntl();

  const panelHeaderMenuCommands = intl.formatMessage({
    defaultMessage: 'More commands',
    id: '0y5eia',
    description: 'Label for commands in panel header',
  });

  return (
    <Menu>
      <MenuTrigger>
        <Tooltip relationship={'label'} positioning={'before'} content={panelHeaderMenuCommands}>
          <Button
            {...restoreFocusTargetAttribute}
            appearance="subtle"
            icon={<OverflowIcon />}
            aria-label={panelHeaderMenuCommands}
            data-automation-id="msla-panel-header-more-options"
          />
        </Tooltip>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>{headerItems}</MenuList>
      </MenuPopover>
    </Menu>
  );
};

export const PanelHeader = (props: PanelHeaderProps): JSX.Element => {
  const {
    nodeData,
    isCollapsed,
    isOutermostPanel,
    headerLocation,
    noNodeSelected,
    panelScope,
    suppressDefaultNodeSelectFunctionality,
    readOnlyMode,
    renameTitleDisabled,
    canResubmit,
    resubmitOperation,
    onUnpinAction,
    commentChange,
    onRenderWarningMessage,
    onTitleChange,
    handleTitleUpdate,
    canShowLogicAppRun,
    showLogicAppRun,
    showTriggerInfo,
    isTrigger,
  } = props;

  const { comment, displayName: title, iconUri: cardIcon, isError, isLoading, nodeId } = nodeData;

  const intl = useIntl();
  const theme = useTheme();
  const styles = usePanelStyles();
  const classes = getPanelClasses(styles, theme.isInverted);

  const resubmitButtonText = intl.formatMessage({
    defaultMessage: 'Submit from this action',
    id: 'I+85NV',
    description: 'Button label for submitting a workflow to rerun from this action',
  });

  const unpinButtonText = intl.formatMessage({
    defaultMessage: 'Unpin action',
    id: 'iTz1lp',
    description: 'Text indicating a menu button to unpin a pinned action from the side panel',
  });

  const showLogicAppRunText = intl.formatMessage({
    defaultMessage: 'Show Logic App run details',
    id: 'y6aoMi',
    description: 'Show Logic App run details text',
  });

  const triggerInfoMessageBar = {
    text: intl.formatMessage({
      defaultMessage: 'Changing the trigger name updates the callback URL when you save the workflow.',
      id: 'Se0HAU',
      description: 'Trigger name update information message',
    }),
    ariaLabel: intl.formatMessage({
      defaultMessage: 'Trigger name update message information bar',
      id: 'u7pNIX',
      description: 'Accessible label for trigger name update information',
    }),
  };

  const isRight = headerLocation === PanelLocation.Right;
  const noNodeOnCardLevel = noNodeSelected && panelScope === PanelScope.CardLevel;
  const shouldHideCollapseButton = !isOutermostPanel || (isCollapsed && suppressDefaultNodeSelectFunctionality);
  const titleId = `${nodeId}-title`;

  // collapsed -> loading -> connector icon -> error -> backup loading
  const iconComponent = useMemo(
    () =>
      isCollapsed ? null : isLoading ? (
        <div className={classes.panelCardIcon}>
          <Spinner size={'tiny'} style={{ padding: '6px' }} />
        </div>
      ) : cardIcon ? (
        <img className={classes.panelCardIcon} src={cardIcon} alt="panel card icon" />
      ) : isError ? (
        <div className={classes.panelCardIcon}>
          <Icon iconName="PlugDisconnected" style={{ fontSize: '20px', textAlign: 'center', color: 'white' }} />
        </div>
      ) : (
        <Spinner className="msla-card-header-spinner" size={'tiny'} />
      ),
    [isLoading, cardIcon, isCollapsed, isError, classes.panelCardIcon]
  );

  return (
    <>
      <div className={classes.panelHeader} id={noNodeOnCardLevel ? titleId : title}>
        {shouldHideCollapseButton ? undefined : <CollapseButton {...props} isRight={isRight} nodeId={nodeId} classes={classes} />}
        {!noNodeOnCardLevel && !isCollapsed ? (
          <>
            <div className={classes.panelCardHeader}>
              {iconComponent}
              <div className={classes.panelCardTitleContainer}>
                <PanelHeaderTitle
                  key={nodeId}
                  titleId={titleId}
                  readOnlyMode={readOnlyMode}
                  renameTitleDisabled={renameTitleDisabled}
                  titleValue={title}
                  onChange={(newId) => onTitleChange(nodeId, newId)}
                  handleTitleUpdate={(newId) => handleTitleUpdate(nodeId, newId)}
                />
              </div>
              {onUnpinAction ? (
                <Tooltip content={unpinButtonText} relationship="label">
                  <Button appearance="subtle" icon={<PinOffRegular />} onClick={onUnpinAction} />
                </Tooltip>
              ) : null}
              <OverflowButton {...props} />
            </div>
            {onRenderWarningMessage ? onRenderWarningMessage() : null}
          </>
        ) : null}
      </div>
      {showTriggerInfo ? (
        <div className={classes.panelHeaderMessages}>
          <MessageBar
            aria-label={triggerInfoMessageBar.ariaLabel}
            layout="multiline"
            data-automation-id="msla-panel-header-trigger-info"
            data-testid="msla-panel-header-trigger-info"
          >
            <MessageBarBody>{triggerInfoMessageBar.text}</MessageBarBody>
          </MessageBar>
        </div>
      ) : null}
      {isTrigger || (!isNullOrUndefined(comment) && !noNodeOnCardLevel && !isCollapsed) ? (
        <PanelHeaderComment
          comment={comment}
          isCollapsed={isCollapsed}
          noNodeSelected={noNodeOnCardLevel}
          readOnlyMode={readOnlyMode}
          commentChange={commentChange}
          isTrigger={isTrigger}
        />
      ) : null}
      {canResubmit || canShowLogicAppRun ? (
        <div className={classes.panelHeaderButtons}>
          {canResubmit ? (
            <Button
              className={classes.panelHeaderButtonsButton}
              icon={<Icon iconName="PlaybackRate1x" />}
              onClick={() => resubmitOperation?.()}
            >
              {resubmitButtonText}
            </Button>
          ) : null}
          {canShowLogicAppRun ? (
            <Button
              iconPosition="after"
              className={classes.panelHeaderButtonsButton}
              icon={<Icon iconName="ChevronRight" />}
              onClick={() => showLogicAppRun?.()}
            >
              {showLogicAppRunText}
            </Button>
          ) : null}
        </div>
      ) : null}
    </>
  );
};
