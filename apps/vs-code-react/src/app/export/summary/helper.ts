import type { IExportData, IExportDetails, IExportDetailsList } from '../../../run-service';

export const getListColumns = () => {
  return [
    { key: 'type', name: 'Type', fieldName: 'type', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'message', name: 'Message', fieldName: 'message', minWidth: 170, maxWidth: 250, isResizable: true },
  ];
};

export const getExportDetails = (details: Array<IExportDetails>): Array<IExportDetailsList> => {
  return details.map((detail) => {
    const { exportDetailCategory, exportDetailMessage } = detail;

    return { type: exportDetailCategory, message: exportDetailMessage };
  });
};

export const getSummaryData = (summaryData: IExportData) => {
  const exportSchema: Record<string, any> = summaryData?.properties ?? {};

  const packageLink: string = exportSchema?.packageLink?.uri;
  const exportDetails = getExportDetails(exportSchema?.details);

  return { packageLink, exportDetails };
};
