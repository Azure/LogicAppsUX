import type React from 'react';
import { useEffect } from 'react';
import { OverviewApp } from '../../../../vs-code-react/src/app/overview/app';
import { useDispatch } from 'react-redux';
import { initializeWorkflow } from '../../../../vs-code-react/src/state/WorkflowSlice';
import type { AppDispatch } from '../../../../vs-code-react/src/state/store';
import { VSCodeContextProvider } from '../providers/VSCodeContextProvider';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer';
import { IntlProvider } from 'react-intl';
import '../utils/mockVSCodeApi';

const mockInitialData = {
  apiVersion: '2018-07-01-preview',
  baseUrl: 'https://management.azure.com',
  accessToken: 'mock-access-token',
  workflowProperties: {
    name: 'test-workflow',
    stateType: 'Stateful',
  },
  hostVersion: '4.0.0',
  isLocal: true,
};

export const VSCodeOverviewWrapper: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(initializeWorkflow(mockInitialData));
  }, [dispatch]);

  return (
    <IntlProvider
      defaultLocale="en"
      locale="en-US"
      onError={(err) => {
        if (err.code === 'MISSING_TRANSLATION') {
          return;
        }
        console.warn('Intl error:', err);
      }}
    >
      <ReactQueryProvider>
        <VSCodeContextProvider>
          <OverviewApp />
        </VSCodeContextProvider>
      </ReactQueryProvider>
    </IntlProvider>
  );
};
