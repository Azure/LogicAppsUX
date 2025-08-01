import { QueryKeys } from '../../../run-service';
import type { IExportDetailsList, ISummaryData } from '../../../run-service';
import { ApiService } from '../../../run-service/export';
import { updatePackageUrl } from '../../../state/WorkflowSlice';
import type { AppDispatch, RootState } from '../../../state/store';
import { VSCodeContext } from '../../../webviewCommunication';
import { getSummaryData, listColumns } from './helper';
import { ManagedConnections } from './managedConnections';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useContext, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { LargeText, XLargeText } from '@microsoft/designer-ui';
import { useExportStyles } from '../exportStyles';
import {
  Button,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Input,
  Label,
  MessageBar,
  useId,
} from '@fluentui/react-components';

export const Summary: React.FC = () => {
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const dispatch: AppDispatch = useDispatch();
  const styles = useExportStyles();
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { baseUrl, accessToken, exportData, cloudHost } = workflowState;
  const { selectedWorkflows, location, selectedSubscription, targetDirectory, packageUrl, selectedAdvanceOptions } = exportData;
  const exportFileLocationId = useId('export-summary-file-location-input');

  const intlText = {
    COMPLETE_EXPORT_TITLE: intl.formatMessage({
      defaultMessage: 'Finish export',
      id: 'K7KJ+a',
      description: 'Finish export title',
    }),
    SELECT_LOCATION: intl.formatMessage({
      defaultMessage: 'Select a destination to export your logic apps',
      id: 'LzXRBP',
      description: 'Select a location description',
    }),
    OPEN_FILE_EXPLORER: intl.formatMessage({
      defaultMessage: 'Browse',
      id: 'GIoHnS',
      description: 'Browse with file explorer text',
    }),
    EXPORT_LOCATION: intl.formatMessage({
      defaultMessage: 'Export location',
      id: 'POHdG+',
      description: 'Export location text',
    }),
    NO_DETAILS: intl.formatMessage({
      defaultMessage: 'No more details',
      id: 'eSQI+e',
      description: 'No more details text',
    }),
    AFTER_EXPORT: intl.formatMessage({
      defaultMessage: 'After export steps',
      id: 'uWEWvx',
      description: 'After export steps title',
    }),
    ADDITIONAL_STEPS: intl.formatMessage({
      defaultMessage: `After export, the following workflows require more steps to reestablish connections. You can find these steps in the following list or by reviewing the README file that's exported with the package.`,
      id: 'AlO/m6',
      description: 'Post export required steps text',
    }),
    PACKAGE_WARNING: intl.formatMessage({
      defaultMessage: 'The export package URL experienced an unknown problem.',
      id: 'YvBfGx',
      description: 'Package warning text',
    }),
  };

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
      cloudHost,
      vscodeContext: vscode,
    });
  }, [accessToken, baseUrl, cloudHost, vscode]);

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

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError,
    error: summaryError,
  } = useQuery<any>([QueryKeys.summary, { selectedWorkflows: selectedWorkflows }], exportWorkflows, {
    refetchOnWindowFocus: false,
    onSuccess: onSummarySuccess,
  });

  const { exportDetails = [] } = isSummaryLoading || !summaryData ? {} : getSummaryData(summaryData);

  const onOpenExplorer = () => {
    vscode.postMessage({
      command: ExtensionCommand.select_folder,
    });
  };

  const locationText = useMemo(() => {
    return (
      <div className={styles.exportSummaryFileLocationText}>
        <Label htmlFor={exportFileLocationId}>{intlText.EXPORT_LOCATION}</Label>
        <Input disabled id={exportFileLocationId} placeholder={targetDirectory.path} />
      </div>
    );
  }, [styles.exportSummaryFileLocationText, exportFileLocationId, intlText.EXPORT_LOCATION, targetDirectory.path]);

  const detailsList = useMemo(() => {
    const emptyText = <LargeText text={intlText.NO_DETAILS} className={styles.exportSummaryDetailListEmpty} style={{ display: 'block' }} />;
    const noDetails = exportDetails.length === 0 && !isSummaryLoading ? emptyText : null;

    return (
      <>
        <XLargeText text={intlText.AFTER_EXPORT} style={{ display: 'block' }} />
        <LargeText text={intlText.ADDITIONAL_STEPS} style={{ display: 'block' }} />
        <div className={styles.exportSummaryDetailsList}>
          <DataGrid
            items={exportDetails}
            columns={listColumns}
            selectionMode={undefined}
            resizableColumns
            size="small"
            focusMode="composite"
          >
            <DataGridHeader>
              <DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow>
            </DataGridHeader>
            <DataGridBody<IExportDetailsList>>
              {({ item, rowId }) => (
                <DataGridRow<IExportDetailsList> key={rowId}>
                  {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
          {noDetails}
        </div>
      </>
    );
  }, [
    intlText.NO_DETAILS,
    intlText.AFTER_EXPORT,
    intlText.ADDITIONAL_STEPS,
    styles.exportSummaryDetailListEmpty,
    styles.exportSummaryDetailsList,
    exportDetails,
    isSummaryLoading,
  ]);

  const packageWarning = useMemo(() => {
    return isError && !packageUrl ? (
      <MessageBar className={styles.exportSummaryPackageWarning} intent="error" layout="multiline">
        {intlText.PACKAGE_WARNING}
        <br />
        {(summaryError as any)?.message ?? null}
      </MessageBar>
    ) : null;
  }, [isError, packageUrl, styles.exportSummaryPackageWarning, intlText.PACKAGE_WARNING, summaryError]);

  return (
    <div className={styles.exportSummaryContainer}>
      <XLargeText text={intlText.COMPLETE_EXPORT_TITLE} style={{ display: 'block' }} />
      <LargeText text={intlText.SELECT_LOCATION} style={{ display: 'block' }} />
      {packageWarning}
      <div className={styles.exportSummaryFileLocation}>
        {locationText}
        <Button
          appearance="primary"
          onClick={onOpenExplorer}
          aria-label={intlText.OPEN_FILE_EXPLORER}
          className={styles.exportSummaryFileLocationButton}
        >
          {intlText.OPEN_FILE_EXPLORER}
        </Button>
      </div>
      <ManagedConnections />
      {detailsList}
    </div>
  );
};
