import type React from 'react';
import { VSCodeContext } from '../../../../vs-code-react/src/webviewCommunication';
import { mockVSCodeApi } from '../utils/mockVSCodeApi';

// Create the VS Code context provider for standalone environment
export const VSCodeContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <VSCodeContext.Provider value={mockVSCodeApi}>{children}</VSCodeContext.Provider>;
};
