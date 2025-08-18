import type React from 'react';
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ExportApp } from '../../../../vs-code-react/src/app/export/export';
import { InstanceSelection } from '../../../../vs-code-react/src/app/export/instanceSelection/instanceSelection';
import { WorkflowsSelection } from '../../../../vs-code-react/src/app/export/workflowsSelection/workflowsSelection';
import { Validation } from '../../../../vs-code-react/src/app/export/validation/validation';
import { Summary } from '../../../../vs-code-react/src/app/export/summary/summary';
import { Status } from '../../../../vs-code-react/src/app/export/status/status';
import { useDispatch } from 'react-redux';
import { initializeWorkflow } from '../../../../vs-code-react/src/state/WorkflowSlice';
import type { AppDispatch } from '../../../../vs-code-react/src/state/store';
import { VSCodeContextProvider } from '../providers/VSCodeContextProvider';
import { ReactQueryProvider } from '@microsoft/logic-apps-designer';
import { IntlProvider } from 'react-intl';
import { ThemeProvider } from '../../../../vs-code-react/src/themeProvider';
import '../utils/mockVSCodeApi';
import { MockApiService } from '../services/MockApiService';
import { loadToken, environment } from '../../environments/environment';
import { useQuery } from '@tanstack/react-query';

// Mock data for testing
const mockInitialData = {
  apiVersion: '2018-07-01-preview',
  baseUrl: 'https://management.azure.com',
  accessToken: 'mock-access-token', // This will be replaced with the real token
  workflowProperties: {
    name: 'test-workflow',
    stateType: 'Stateful',
  },
  hostVersion: '4.0.0',
  isLocal: true,
};

const LoadWhenArmTokenIsLoaded = () => {
  const { isLoading, data: token } = useQuery(['armToken'], loadToken);

  if (isLoading) {
    return null;
  }

  // Pass the loaded token to ExportContent
  return <ExportContent token={token} />;
};

interface ExportContentProps {
  token?: string | null;
}

const ExportContent: React.FC<ExportContentProps> = ({ token }) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Initialize with data using the loaded token or fallback to mock
    const initialData = {
      ...mockInitialData,
      accessToken: `Bearer ${token || environment.armToken || mockInitialData.accessToken}`,
    };

    console.log('Initializing export with token:', token ? 'Real token from armToken.json' : 'Using mock token');
    dispatch(initializeWorkflow(initialData));

    // Set up global mock API service for standalone
    if (typeof window !== 'undefined') {
      (window as any).__mockApiService = new MockApiService();
    }

    // Add VS Code theme classes to body for proper theming
    document.body.classList.add('vscode-light'); // Default to light theme

    return () => {
      // Clean up on unmount
      document.body.classList.remove('vscode-light', 'vscode-dark');
    };
  }, [dispatch, token]);

  return (
    <Routes>
      <Route path="/" element={<ExportApp />}>
        <Route index element={<Navigate to="instance-selection" replace />} />
        <Route path="instance-selection" element={<InstanceSelection />} />
        <Route path="workflows-selection" element={<WorkflowsSelection />} />
        <Route path="validation" element={<Validation />} />
        <Route path="summary" element={<Summary />} />
        <Route path="status" element={<Status />} />
        <Route path="*" element={<Navigate to="instance-selection" replace />} />
      </Route>
    </Routes>
  );
};

export const VSCodeExportWrapper: React.FC = () => {
  return (
    <ThemeProvider>
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
            <LoadWhenArmTokenIsLoaded />
          </VSCodeContextProvider>
        </ReactQueryProvider>
      </IntlProvider>
    </ThemeProvider>
  );
};
