import React from 'react';
import { RetryPanel } from './../../monitoring/retrypanel';

export const RetryPanelTab = () => {
  // Validation and some way to fetch the data...
  // Fow now I'll just hard code it
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
