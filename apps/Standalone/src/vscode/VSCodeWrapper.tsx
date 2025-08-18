import { Routes, Route, Navigate } from 'react-router-dom';
import { VSCodeExportWrapper } from './components/VSCodeExportWrapper';
import { VSCodeOverviewWrapper } from './components/VSCodeOverviewWrapper';
import { VSCodeNavigationWrapper } from './components/VSCodeNavigationWrapper';

export const VSCodeWrapper = () => {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <VSCodeNavigationWrapper />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/vscode/export" replace />} />
          <Route path="/export/*" element={<VSCodeExportWrapper />} />
          <Route path="/overview" element={<VSCodeOverviewWrapper />} />
          <Route path="*" element={<Navigate to="/vscode/export" replace />} />
        </Routes>
      </div>
    </div>
  );
};
