import {
  Button,
  Divider,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  mergeClasses,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import { RunMenu } from './runMenu';
import { useRunHistoryPanelStyles } from './runHistoryPanel.styles';
import { RunHistoryEntryInfo } from './runHistoryEntryInfo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRun, useCancelRun, useResubmitRun, useRunsInfiniteQuery } from '../../../core/queries/runs';
import {
  bundleIcon,
  TextBulletListSquareFilled,
  TextBulletListSquareRegular,
  CopyFilled,
  CopyRegular,
  ArrowRedoFilled,
  ArrowRedoRegular,
  DismissCircleFilled,
  DismissCircleRegular,
} from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { equals, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { TeachingPopup } from '@microsoft/designer-ui';
import { useIsFirstDesignerV2Load } from '../../../core/state/designerOptions/designerOptionsSelectors';

const OpenRunIcon = bundleIcon(TextBulletListSquareFilled, TextBulletListSquareRegular);
const CopyIcon = bundleIcon(CopyFilled, CopyRegular);
const ResubmitIcon = bundleIcon(ArrowRedoFilled, ArrowRedoRegular);
const CancelIcon = bundleIcon(DismissCircleFilled, DismissCircleRegular);

let teachingBubbleDismissed = false;

const RunHistoryEntry = (props: {
  runId: string;
  isSelected: boolean;
  onRunSelected: (id: string) => void;
  onRunOpened: (id: string) => void;
  addFilterCallback: (filter: any) => void;
  showTeachingBubble?: boolean;
  size?: 'small' | 'medium';
}) => {
  const { runId, isSelected, onRunSelected, onRunOpened, addFilterCallback, showTeachingBubble, size = 'medium' } = props;

  const { data: run } = useRun(runId);

  const intl = useIntl();
  const styles = useRunHistoryPanelStyles();
  const [openRunButtonEl, setOpenRunButtonEl] = useState<HTMLButtonElement | null>(null);
  const isFirstV2Load = useIsFirstDesignerV2Load();
  const [shouldDisplayTeaching, setShouldDisplayTeaching] = useState(false);

  useEffect(() => {
    if (showTeachingBubble && isFirstV2Load && !teachingBubbleDismissed) {
      setShouldDisplayTeaching(true);
    }
  }, [showTeachingBubble, isFirstV2Load]);

  const openRunButtonRef = useCallback((el: HTMLButtonElement | null) => {
    setOpenRunButtonEl(el);
  }, []);

  const runsQuery = useRunsInfiniteQuery();
  const runQuery = useRun(runId);
  const { mutateAsync: resubmitRun } = useResubmitRun(run?.name ?? '', (run?.properties.trigger as any)?.name ?? '');
  const { mutateAsync: cancelRun } = useCancelRun(run?.id ?? '');

  const onCopy = useCallback(() => {
    const shortId = run?.id.split('/').at(-1) ?? '';
    navigator.clipboard.writeText(shortId);
  }, [run?.id]);

  const onResubmit = useCallback(async () => {
    await resubmitRun();
    runsQuery.refetch();
  }, [resubmitRun, runsQuery]);

  const onCancel = useCallback(async () => {
    await cancelRun();
    runQuery.refetch();
  }, [cancelRun, runQuery]);

  const indicatorColor = useMemo(() => {
    if (run?.properties.status === 'Succeeded') {
      return tokens.colorStatusSuccessForeground1;
    }
    if (run?.properties.status === 'Failed') {
      return tokens.colorStatusDangerForeground1;
    }
    return tokens.colorBrandForeground1;
  }, [run?.properties.status]);

  const ref = useRef<HTMLDivElement>(null);
  // Scroll into view when selected, this is to handle navigation from other components
  useEffect(() => {
    if (isSelected) {
      ref.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
    }
  }, [isSelected]);

  const handleOpenRunLogs = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      LoggerService().log({
        area: 'RunHistoryEntry:openRunLogs',
        level: LogEntryLevel.Verbose,
        message: 'Open run logs button clicked.',
      });
      onRunOpened(run?.name ?? '');
    },
    [onRunOpened, run?.name]
  );

  const dismissTeachingBubble = useCallback(() => {
    teachingBubbleDismissed = true;
    setShouldDisplayTeaching(false);
  }, []);

  if (!run) {
    return null;
  }

  const isDraftRun = equals((run.properties?.workflow as any)?.mode, 'Draft');

  const openRunAria = intl.formatMessage({
    defaultMessage: 'Open run logs',
    description: 'Aria label for button to open run logs',
    id: 'lo2IGQ',
  });

  const copyText = intl.formatMessage({
    defaultMessage: 'Copy run ID',
    description: 'Copy run identifier text',
    id: 'l9A4CM',
  });

  const resubmitText = intl.formatMessage({
    defaultMessage: 'Retry',
    description: 'Resubmit run text',
    id: 'DyiMWE',
  });

  const cancelText = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Cancel run text',
    id: '56TR3P',
  });

  const teachingTitle = intl.formatMessage({
    defaultMessage: 'View run logs',
    description: 'Teaching bubble title for the open run logs button',
    id: 'Pb7KmG',
  });

  const teachingMessage = intl.formatMessage({
    defaultMessage: 'Clicking this button will open the run log tree and agent activity log.',
    description: 'Teaching bubble message explaining the open run logs button',
    id: 'GzIQLR',
  });

  const contextMenu = (
    <MenuPopover>
      <MenuList>
        {run.properties.status === 'Running' && (
          <>
            <MenuItem icon={<CancelIcon />} onClick={onCancel}>
              {cancelText}
            </MenuItem>
            <MenuDivider />
          </>
        )}
        <MenuItem icon={<CopyIcon />} onClick={onCopy}>
          {copyText}
        </MenuItem>
        <MenuItem disabled={isDraftRun} icon={<ResubmitIcon />} onClick={onResubmit}>
          {resubmitText}
        </MenuItem>
        <MenuItem icon={<OpenRunIcon />} onClick={() => handleOpenRunLogs()}>
          {openRunAria}
        </MenuItem>
      </MenuList>
    </MenuPopover>
  );

  if (size === 'small') {
    return (
      <>
        <Menu openOnContext>
          <MenuTrigger disableButtonEnhancement>
            <div
              ref={ref}
              className={mergeClasses(styles.runEntry, styles.runEntrySmall, isSelected && styles.runEntrySelected)}
              onClick={() => onRunSelected(run?.name ?? '')}
            >
              {isSelected && <div className={styles.runEntrySelectedIndicator} style={{ backgroundColor: indicatorColor }} />}
              <RunHistoryEntryInfo run={run} size="small" />
              <Tooltip content={openRunAria} relationship="label">
                <Button
                  ref={openRunButtonRef}
                  appearance="transparent"
                  size="small"
                  icon={<OpenRunIcon />}
                  aria-label={openRunAria}
                  onClick={handleOpenRunLogs}
                />
              </Tooltip>
            </div>
          </MenuTrigger>
          {contextMenu}
        </Menu>
        {shouldDisplayTeaching && openRunButtonEl ? (
          <TeachingPopup
            targetElement={openRunButtonEl}
            title={teachingTitle}
            message={teachingMessage}
            withArrow={true}
            handlePopupPrimaryOnClick={dismissTeachingBubble}
          />
        ) : null}
        <Divider />
      </>
    );
  }

  return (
    <>
      <Menu openOnContext>
        <MenuTrigger disableButtonEnhancement>
          <div
            ref={ref}
            className={mergeClasses(styles.runEntry, isSelected && styles.runEntrySelected)}
            onClick={() => onRunSelected(run?.name ?? '')}
          >
            {isSelected && <div className={styles.runEntrySelectedIndicator} style={{ backgroundColor: indicatorColor }} />}
            <RunHistoryEntryInfo run={run} />
            <RunMenu run={run} addFilterCallback={addFilterCallback} />
            <Tooltip content={openRunAria} relationship="label">
              <Button
                ref={openRunButtonRef}
                appearance="transparent"
                size="small"
                icon={<OpenRunIcon />}
                aria-label={openRunAria}
                onClick={handleOpenRunLogs}
              />
            </Tooltip>
          </div>
        </MenuTrigger>
        {contextMenu}
      </Menu>
      {shouldDisplayTeaching && openRunButtonEl ? (
        <TeachingPopup
          targetElement={openRunButtonEl}
          title={teachingTitle}
          message={teachingMessage}
          withArrow={true}
          handlePopupPrimaryOnClick={dismissTeachingBubble}
        />
      ) : null}
      <Divider style={{ margin: '4px 0' }} />
    </>
  );
};

export default RunHistoryEntry;
