/* eslint-disable @typescript-eslint/no-unused-vars */
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import { useContext } from 'react';

export const ConnectionsApp = () => {
  const dispatch = useDispatch<AppDispatch>();
  const vscode = useContext(VSCodeContext);

  console.log('ConnectionsApp');

  return (
    <div
      style={{
        height: 'inherit',
        backgroundColor: 'blue',
      }}
    >
      <div>Connections</div>
    </div>
  );
};
