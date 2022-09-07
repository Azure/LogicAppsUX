import { QueryKeys } from '../../../run-service';
import type { ISummaryData } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import type { AppDispatch, RootState } from '../../../state/store';
import { updatePackageUrl } from '../../../state/vscodeSlice';
import type { InitializedVscodeState } from '../../../state/vscodeSlice';
import { VSCodeContext } from '../../../webviewCommunication';
import { getListColumns, getSummaryData } from './helper';
import { ManagedConnections } from './managedConnections';
import { MessageBar, MessageBarType, PrimaryButton, SelectionMode, ShimmeredDetailsList, Text, TextField } from '@fluentui/react';
import { ExtensionCommand } from '@microsoft-logic-apps/utils';
import { useContext, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export const Summary: React.FC = () => {
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const dispatch: AppDispatch = useDispatch();
  const vscodeState = useSelector((state: RootState) => state.vscode);
  const { baseUrl, accessToken, exportData } = vscodeState as InitializedVscodeState;
  const { selectedWorkflows, location, selectedSubscription, targetDirectory, packageUrl, selectedAdvanceOptions } = exportData;

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
    AFTER_EXPORT: intl.formatMessage({
      defaultMessage: 'After export steps',
      description: 'After export steps title',
    }),
    ADDITIONAL_STEPS: intl.formatMessage({
      defaultMessage:
        "After export, the following workflows require more steps to reestablish connections. You can find these steps in the following list or by reviewing the README file that's exported with the package.",
      description: 'Post export required steps text',
    }),
    PACKAGE_WARNING: intl.formatMessage({
      defaultMessage: 'The export package URL experienced an unknown problem.',
      description: 'Package warning text',
    }),
  };

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
    });
  }, [accessToken, baseUrl]);

  const exportWorkflows = () => {
    return apiService.exportWorkflows(selectedWorkflows, selectedSubscription, location, selectedAdvanceOptions);
  };

  const onSummarySuccess = (summaryData: ISummaryData) => {
    const exportSchema: Record<string, any> = summaryData?.properties ?? {};
    const packageLink: string = exportSchema?.packageLink?.uri;

    dispatch(
      updatePackageUrl({
        packageUrl: packageLink,
      })
    );
  };

  const { data: summaryData, isLoading: isSummaryLoading } = useQuery<any>(
    [QueryKeys.summary, { selectedWorkflows: selectedWorkflows }],
    exportWorkflows,
    {
      refetchOnWindowFocus: false,
      onSuccess: onSummarySuccess,
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
      <Text variant="large" block className="msla-export-summary-detail-list-empty">
        {intlText.NO_DETAILS}
      </Text>
    );
    const noDetails = exportDetails.length === 0 && !isSummaryLoading ? emptyText : null;

    return (
      <>
        <Text variant="xLarge" block>
          {intlText.AFTER_EXPORT}
        </Text>
        <Text variant="large" block>
          {intlText.ADDITIONAL_STEPS}
        </Text>
        <div className="msla-export-summary-detail-list">
          <ShimmeredDetailsList
            items={exportDetails}
            columns={getListColumns()}
            setKey="set"
            enableShimmer={isSummaryLoading}
            selectionMode={SelectionMode.none}
            compact={true}
          />
          {noDetails}
        </div>
      </>
    );
  }, [exportDetails, isSummaryLoading, intlText.NO_DETAILS, intlText.ADDITIONAL_STEPS, intlText.AFTER_EXPORT]);

  const packageWarning = useMemo(() => {
    return !isSummaryLoading && !packageUrl ? (
      <MessageBar className="msla-export-summary-package-warning" messageBarType={MessageBarType.error} isMultiline={true}>
        {intlText.PACKAGE_WARNING}
      </MessageBar>
    ) : null;
  }, [isSummaryLoading, packageUrl, intlText.PACKAGE_WARNING]);

  return (
    <div className="msla-export-summary">
      <Text variant="xLarge" block>
        {intlText.COMPLETE_EXPORT_TITLE}
      </Text>
      <Text variant="large" block>
        {intlText.SELECT_LOCATION}
      </Text>
      {packageWarning}
      <div className="msla-export-summary-file-location">
        {locationText}
        <PrimaryButton
          className="msla-export-summary-file-location-button"
          text={intlText.OPEN_FILE_EXPLORER}
          ariaLabel={intlText.OPEN_FILE_EXPLORER}
          onClick={onOpenExplorer}
        />
      </div>
      <ManagedConnections />
      {detailsList}
    </div>
  );
};
