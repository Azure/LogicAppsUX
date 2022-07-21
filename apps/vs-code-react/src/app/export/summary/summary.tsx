import { QueryKeys } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import type { RootState } from '../../../state/store';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { VSCodeContext } from '../../../webviewCommunication';
import { getListColumns, getSummaryData } from './helper';
import { PrimaryButton, SelectionMode, ShimmeredDetailsList, Text, TextField } from '@fluentui/react';
import { ExtensionCommand } from '@microsoft-logic-apps/utils';
import { useContext, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

export const Summary: React.FC = () => {
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { baseUrl, accessToken, exportData } = vscodeState as InitializedVscodeState;
  const { selectedWorkflows, location, selectedSubscription, targetDirectory } = exportData;

  const intlText = {
    COMPLETE_EXPORT_TITLE: intl.formatMessage({
      defaultMessage: 'Finish export',
      description: 'Finish export title',
    }),
    SELECT_LOCATION: intl.formatMessage({
      defaultMessage: 'Select a destination to export your logic apps',
      description: 'Select a location description',
    }),
    OPEN_FILE_EXPLORER: intl.formatMessage({
      defaultMessage: 'Browse',
      description: 'Browse with file explorer text',
    }),
    EXPORT_LOCATION: intl.formatMessage({
      defaultMessage: 'Export location',
      description: 'Export location text',
    }),
    NO_DETAILS: intl.formatMessage({
      defaultMessage: 'No more details',
      description: 'No more details text',
    }),
  };

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
    });
  }, [accessToken, baseUrl]);

  const exportWorkflows = () => {
    return apiService.exportWorkflows(selectedWorkflows, selectedSubscription, location);
  };

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery<any>(
    [QueryKeys.summary, { selectedWorkflows: selectedWorkflows }],
    exportWorkflows,
    {
      refetchOnWindowFocus: false,
    }
  );

  const { exportDetails = [] } = isSummaryLoading || !summaryData ? {} : getSummaryData(summaryData);

  const onOpenExplorer = () => {
    vscode.postMessage({
      command: ExtensionCommand.select_folder,
    });
  };

  const locationText = useMemo(() => {
    return (
      <TextField
        label={intlText.EXPORT_LOCATION}
        placeholder={targetDirectory.path}
        disabled
        className="msla-export-summary-file-location-text"
      />
    );
  }, [targetDirectory, intlText.EXPORT_LOCATION]);

  const detailsList = useMemo(() => {
    const emptyText = (
      <Text variant="large" nowrap block className="msla-export-summary-detail-list-empty">
        {intlText.NO_DETAILS}
      </Text>
    );
    const noDetails = exportDetails === [] && !isSummaryLoading ? emptyText : null;

    return (
      <div className="msla-export-summary-detail-list">
        <ShimmeredDetailsList
          items={exportDetails}
          columns={getListColumns()}
          setKey="set"
          enableShimmer={isSummaryLoading}
          selectionMode={SelectionMode.none}
        />
        {noDetails}
      </div>
    );
  }, [exportDetails, isSummaryLoading, intlText.NO_DETAILS]);

  return (
    <div className="msla-export-summary">
      <Text variant="xLarge" nowrap block>
        {intlText.COMPLETE_EXPORT_TITLE}
      </Text>
      <Text variant="large" nowrap block>
        {intlText.SELECT_LOCATION}
      </Text>
      <div className="msla-export-summary-file-location">
        {locationText}
        <PrimaryButton
          className="msla-export-summary-file-location-button"
          text={intlText.OPEN_FILE_EXPLORER}
          ariaLabel={intlText.OPEN_FILE_EXPLORER}
          onClick={onOpenExplorer}
        />
      </div>
      {detailsList}
    </div>
  );
};
