import constants from '../../../common/constants';
import type { PanelTab } from '@microsoft/designer-ui';
import { RetryPanel } from '@microsoft/designer-ui';

export const RetryPanelTab = () => {
  // TODO: Retrieve logic from a redux store?
  const histories = [
    {
      clientRequestId: 'a0b2b0fe-1be6-4640-8948-ab0ed223436a',
      code: 'Failed',
      endTime: '2017-10-06T22:51:00Z',
      error: {
        code: 'GatewayTimeout',
        message: 'Your server did not receive a timely response from another server upstream.',
      },
      serviceRequestId: 'd0c70b52-023f-4104-8865-3ce991addf3f',
      startTime: '2017-10-06T22:46:00Z',
    },
    {
      clientRequestId: '9bd6fec3-a1ad-428d-a198-391d0117dc20',
      code: 'Succeeded',
      endTime: '2017-10-06T22:52:00Z',
      serviceRequestId: 'd273e6f9-a10c-48f1-a91d-0b69f9705ce9',
      startTime: '2017-10-06T22:51:01Z',
    },
  ];
  return <RetryPanel retryHistories={histories} />;
};

export const monitorRetryTab: PanelTab = {
  title: 'Retry',
  name: constants.PANEL_TAB_NAMES.RETRY_HISTORY,
  description: 'Retry History',
  visible: true,
  content: <RetryPanelTab />,
  order: 0,
  icon: 'Rerun',
};
