export const getListColumns = () => {
  return [
    { key: 'type', name: 'Type', fieldName: 'type', minWidth: 170, maxWidth: 250, isResizable: true },
    { key: 'message', name: 'Message', fieldName: 'message', minWidth: 170, maxWidth: 250, isResizable: true },
  ];
};

export const getExportDetails = (details: any[]) => {
  return details.map((detail) => {
    const { exportDetailCategory, exportDetailMessage } = detail;

    return { type: exportDetailCategory, message: exportDetailMessage };
  });
};

export const getSummaryData = (summaryData: any) => {
  console.log('test12312312');
  const exportSchema: Record<string, any> = summaryData?.properties ?? {};

  const packageLink = exportSchema?.packageLink?.uri;
  const exportDetails = getExportDetails(exportSchema?.details);

  return { packageLink, exportDetails };
};
