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

// Mock data for testing
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

export const VSCodeExportWrapper: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Initialize with mock data for standalone development
    dispatch(initializeWorkflow(mockInitialData));

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
  }, [dispatch]);

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
          </VSCodeContextProvider>
        </ReactQueryProvider>
      </IntlProvider>
    </ThemeProvider>
  );
};
