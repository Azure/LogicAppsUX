// requestpanel.stories.js|jsx|ts|tsx

import { DefaultButton, Panel, PanelType } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { RequestPanel, RequestPanelProps } from './index';

export default {
  component: RequestPanel,
  title: 'Components/Monitoring/RequestPanel',
} as ComponentMeta<typeof RequestPanel>;

export const Standard: ComponentStory<typeof RequestPanel> = (args: RequestPanelProps) => {
  const [isOpen, { setTrue: handleClick, setFalse: handleDismiss }] = useBoolean(false);

  return (
    <>
      <DefaultButton text="Open panel" onClick={handleClick} />
      <Panel isOpen={isOpen} type={PanelType.medium} onDismiss={handleDismiss}>
        <RequestPanel {...args} />
      </Panel>
    </>
  );
};

Standard.args = {
  requestHistory: [
    {
      properties: {
        startTime: '2018-06-05T07:13:22.8429012Z',
        endTime: '2018-06-05T07:13:23.3741802Z',
        error: {
          code: 'Unauthorized',
          message: 'The user is not authorized to perform the request.',
        },
        request: {
          headers: {
            'Accept-Language': 'en-US',
            'User-Agent': 'azure-logic-apps/1.0,(workflow 1e5956dac5b748818eccaf3dd665fb96; version 08586734240518566569)',
            'x-ms-execution-location': 'westus',
            'x-ms-workflow-id': '1e5956dac5b748818eccaf3dd665fb96',
            'x-ms-workflow-version': '08586734240518566569',
            'x-ms-workflow-name': 'http-webhook',
            'x-ms-workflow-system-id': '/locations/westus/scaleunits/prod-40/workflows/1e5956dac5b748818eccaf3dd665fb96',
            'x-ms-workflow-run-id': '08586734240477305429153721775CU46',
            'x-ms-workflow-run-tracking-id': '7dc5e1e6-6448-4b23-9fdc-a404c4ccc3b8',
            'x-ms-workflow-operation-name': 'HTTP_Webhook',
            'x-ms-workflow-subscription-id': 'f34b22a3-2202-4fb1-b040-1332bd928c84',
            'x-ms-workflow-resourcegroup-name': 'joechung-westus',
            'x-ms-workflow-subscription-capacity': 'Large',
            'x-ms-tracking-id': 'a356c50f-c02e-4f95-b347-d1f11bd5b1b9',
            'x-ms-correlation-id': 'a356c50f-c02e-4f95-b347-d1f11bd5b1b9',
            'x-ms-client-request-id': 'a356c50f-c02e-4f95-b347-d1f11bd5b1b9',
            'x-ms-client-tracking-id': '08586734240477305429153721775CU46',
            'x-ms-action-tracking-id': '36d9bbe9-d8b2-469c-baac-96bf7495c21f',
          },
          uri: '[REDACTED]',
          method: 'POST',
          bodyLink: {
            uri: '[REDACTED]',
            contentVersion: 'Y0kprXb2BuqE4oUGYgV/pA==',
            contentSize: 381,
            contentHash: {
              algorithm: 'md5',
              value: 'Y0kprXb2BuqE4oUGYgV/pA==',
            },
          },
        },
        response: {
          headers: {
            'Transfer-Encoding': 'chunked',
            Connection: 'keep-alive',
            'X-Request-Id': 'bfddbed3-b7ec-4a57-a1ba-38336f097e92',
            'X-Token-Id': '4d14b2f1-5ff5-4027-a97f-d205f69c93c3',
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '58',
            'Strict-Transport-Security': 'max-age=63072000; includeSubdomains',
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-cache',
            Date: 'Tue, 05 Jun 2018 07:13:23 GMT',
            Server: 'nginx/1.10.3',
          },
          statusCode: 401,
        },
      },
    },
    {
      properties: {
        startTime: '2018-06-05T07:13:57.8429012Z',
        endTime: '2018-06-05T07:13:58.3741802Z',
        request: {
          headers: {
            'Accept-Language': 'en-US',
            'User-Agent': 'azure-logic-apps/1.0,(workflow 1e5956dac5b748818eccaf3dd665fb96; version 08586734240518566569)',
            'x-ms-execution-location': 'westus',
            'x-ms-workflow-id': '1e5956dac5b748818eccaf3dd665fb96',
            'x-ms-workflow-version': '08586734240518566569',
            'x-ms-workflow-name': 'http-webhook',
            'x-ms-workflow-system-id': '/locations/westus/scaleunits/prod-40/workflows/1e5956dac5b748818eccaf3dd665fb96',
            'x-ms-workflow-run-id': '08586734240477305429153721775CU46',
            'x-ms-workflow-run-tracking-id': '7dc5e1e6-6448-4b23-9fdc-a404c4ccc3b8',
            'x-ms-workflow-operation-name': 'HTTP_Webhook',
            'x-ms-workflow-subscription-id': 'f34b22a3-2202-4fb1-b040-1332bd928c84',
            'x-ms-workflow-resourcegroup-name': 'joechung-westus',
            'x-ms-workflow-subscription-capacity': 'Large',
            'x-ms-tracking-id': 'a356c50f-c02e-4f95-b347-d1f11bd5b1b9',
            'x-ms-correlation-id': 'a356c50f-c02e-4f95-b347-d1f11bd5b1b9',
            'x-ms-client-request-id': 'a356c50f-c02e-4f95-b347-d1f11bd5b1b9',
            'x-ms-client-tracking-id': '08586734240477305429153721775CU46',
            'x-ms-action-tracking-id': '36d9bbe9-d8b2-469c-baac-96bf7495c21f',
          },
          uri: '[REDACTED]',
          method: 'POST',
          bodyLink: {
            uri: '[REDACTED]',
            contentVersion: 'Y0kprXb2BuqE4oUGYgV/pA==',
            contentSize: 381,
            contentHash: {
              algorithm: 'md5',
              value: 'Y0kprXb2BuqE4oUGYgV/pA==',
            },
          },
        },
        response: {
          headers: {
            'Transfer-Encoding': 'chunked',
            Connection: 'keep-alive',
            'X-Request-Id': 'bfddbed3-b7ec-4a57-a1ba-38336f097e92',
            'X-Token-Id': '4d14b2f1-5ff5-4027-a97f-d205f69c93c3',
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '58',
            'Strict-Transport-Security': 'max-age=63072000; includeSubdomains',
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-cache',
            Date: 'Tue, 05 Jun 2018 07:13:58 GMT',
            Server: 'nginx/1.10.3',
          },
          statusCode: 200,
        },
      },
    },
  ],
};
