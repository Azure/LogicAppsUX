import { VSCodeContext, WebViewMsgHandler } from '../WebViewMsgHandler';
import { DataMapDataProvider, DataMapperDesigner, DataMapperDesignerProvider } from '@microsoft/logic-apps-data-mapper';
import { useContext } from 'react';

export const App = (): JSX.Element => {
  const vscode = useContext(VSCodeContext);

  const saveStateCall = () => {
    console.log('App called to save Data Map');
    vscode.postMessage({
      cmd: 'saveDataMap',
      msg: {},
    });
  };

  return (
    <WebViewMsgHandler>
      <DataMapperDesignerProvider locale="en-US" options={{}}>
        <DataMapDataProvider inputSchema={undefined} outputSchema={undefined}>
          <DataMapperDesigner saveStateCall={saveStateCall} />
        </DataMapDataProvider>
      </DataMapperDesignerProvider>
    </WebViewMsgHandler>
  );
};
