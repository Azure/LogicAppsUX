import { Routes, Route, Navigate } from 'react-router-dom';
import { VSCodeExportWrapper } from './components/VSCodeExportWrapper';
import { VSCodeOverviewWrapper } from './components/VSCodeOverviewWrapper';
import { VSCodeNavigationWrapper } from './components/VSCodeNavigationWrapper';
import { VSCodeCreateLogicAppWrapper } from './components/VSCodeCreateLogicAppWrapper';
import { VSCodeCreateWorkspaceWrapper } from './components/VSCodeCreateWorkspaceWrapper';
import { VSCodeCreateWorkspaceStructureWrapper } from './components/VSCodeCreateWorkspaceStructureWrapper';
import { ThemeProvider } from '../../../vs-code-react/src/themeProvider';

export const VSCodeWrapper = () => {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ThemeProvider>
        <VSCodeNavigationWrapper />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/vscode/export" replace />} />
            <Route path="/export/*" element={<VSCodeExportWrapper />} />
            <Route path="/overview" element={<VSCodeOverviewWrapper />} />
            <Route path="/createWorkspace" element={<VSCodeCreateWorkspaceWrapper />} />
            <Route path="/createLogicApp" element={<VSCodeCreateLogicAppWrapper />} />
            <Route path="/createWorkspaceStructure" element={<VSCodeCreateWorkspaceStructureWrapper />} />
            <Route path="*" element={<Navigate to="/vscode/export" replace />} />
          </Routes>
        </div>
      </ThemeProvider>
    </div>
  );
};
