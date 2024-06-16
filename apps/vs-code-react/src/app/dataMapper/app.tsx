import type { RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import type { MessageToVsix } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useCallback, useContext, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { DataMapperAppV1 } from './appV1';
import { DataMapperAppV2 } from './appV2';

export const DataMapperApp = () => {
  const vscode = useContext(VSCodeContext);
  const dataMapperVersion = useSelector((state: RootState) => state.project.dataMapperVersion);

  const sendMsgToVsix = useCallback(
    (msg: MessageToVsix) => {
      vscode.postMessage(msg);
    },
    [vscode]
  );

  useEffect(() => {
    sendMsgToVsix({
      command: ExtensionCommand.getDataMapperVersion,
    });
  }, [sendMsgToVsix]);

  return <DataMapperAppV2 />; // DO NOT MERGE INTO MAIN
};
