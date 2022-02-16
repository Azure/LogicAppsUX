import {
  IconButton,
  MessageBar,
  MessageBarType,
  Pivot,
  PivotItem,
  TextField,
  type IIconProps,
  type ITextFieldStyles,
} from '@fluentui/react';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { OverviewCommandBar } from './overviewcommandbar';
import { OverviewProperties, type OverviewPropertiesProps } from './overviewproperties';
import { RunHistory } from './runhistory';
import type { Run, RunDisplayItem, RunError } from './types';
import { isRunError, mapToRunItem } from './utils';

export interface OverviewProps {
  corsNotice?: string;
  errorMessage?: string;
  hasMoreRuns?: boolean;
  loading?: boolean;
  runItems: RunDisplayItem[];
  workflowProperties: OverviewPropertiesProps;
  onLoadMoreRuns(): void;
  onLoadRuns(): void;
  onOpenRun(run: RunDisplayItem): void;
  onRunTrigger(): void;
  onVerifyRunId(runId: string): Promise<Run | RunError>;
}

const filterTextFieldStyles: Pick<ITextFieldStyles, 'root'> = {
  root: {
    flex: 1,
  },
};

const navigateForwardIconProps: IIconProps = { iconName: 'NavigateForward' };

export const Overview: React.FC<OverviewProps> = ({
  corsNotice,
  errorMessage,
  loading = false,
  hasMoreRuns = false,
  runItems,
  workflowProperties,
  onLoadMoreRuns,
  onLoadRuns,
  onOpenRun,
  onRunTrigger,
  onVerifyRunId,
}: OverviewProps) => {
  const intl = useIntl();
  const [navigateDisabled, setNavigateDisabled] = useState(true);
  const [runItem, setRunItem] = useState<RunDisplayItem>();

  const Resources = {
    LOAD_MORE: intl.formatMessage({
      defaultMessage: 'Load more',
      description: 'Button text for loading more runs',
    }),
    RUN_HISTORY: intl.formatMessage({
      defaultMessage: 'Run History',
      description: 'Pivot item header text for run history',
    }),
    SUMMARY: intl.formatMessage({
      defaultMessage: 'Summary',
      description: 'Header text for summary',
    }),
    WORKFLOW_OVERVIEW_FILTER_TEXT: intl.formatMessage({
      defaultMessage: 'Enter the run identifier to open the run',
      description: 'Placeholder text for workflow overview filter input',
    }),
    WORKFLOW_OVERVIEW_NAVIGATE_EMPTY: intl.formatMessage({
      defaultMessage: 'The provided workflow run name is not valid.',
      description: 'Message text for an invalid run ID',
    }),
  };

  const handleChange = () => {
    setRunItem(undefined);
    setNavigateDisabled(true);
  };

  const handleNavigateClick = () => {
    if (runItem) {
      onOpenRun(runItem);
    }
  };

  const handleVerifyRunId = async (value: string) => {
    if (!value) {
      return Resources.WORKFLOW_OVERVIEW_NAVIGATE_EMPTY;
    }

    const response = await onVerifyRunId(value);
    if (isRunError(response)) {
      return response.error.message;
    } else {
      setRunItem(mapToRunItem(response));
      setNavigateDisabled(false);
      return '';
    }
  };

  return (
    <div>
      <OverviewCommandBar callbackInfo={workflowProperties.callbackInfo} onRefresh={onLoadRuns} onRunTrigger={onRunTrigger} />
      <OverviewProperties {...workflowProperties} />
      <Pivot>
        <PivotItem headerText={Resources.RUN_HISTORY}>
          <div className="msla-run-history-filter">
            <TextField
              className="msla-run-history-filter-input"
              deferredValidationTime={1000}
              placeholder={Resources.WORKFLOW_OVERVIEW_FILTER_TEXT}
              styles={filterTextFieldStyles}
              validateOnLoad={false}
              onChange={handleChange}
              onGetErrorMessage={handleVerifyRunId}
            />
            <IconButton
              aria-label={Resources.WORKFLOW_OVERVIEW_FILTER_TEXT}
              className="msla-run-history-filter-button"
              disabled={navigateDisabled}
              iconProps={navigateForwardIconProps}
              title={Resources.WORKFLOW_OVERVIEW_FILTER_TEXT}
              onClick={handleNavigateClick}
            />
          </div>
          <RunHistory items={runItems} loading={loading} onOpenRun={onOpenRun} />
          {errorMessage ? (
            <MessageBar className="msla-overview-error-message" isMultiline={false} messageBarType={MessageBarType.error}>
              {errorMessage}
            </MessageBar>
          ) : null}
          {hasMoreRuns ? (
            <button className="msla-button msla-overview-load-more" onClick={onLoadMoreRuns}>
              {Resources.LOAD_MORE}
            </button>
          ) : null}
        </PivotItem>
      </Pivot>
      {corsNotice ? (
        <MessageBar className="msla-overview-cors-notice" messageBarType={MessageBarType.info}>
          {corsNotice}
        </MessageBar>
      ) : null}
    </div>
  );
};
