import { FluentProvider } from '@fluentui/react-components';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React from 'react';
import type { MapEditorVsCodeApi } from '../../src/protocol/mapEditorProtocol';
import { MapperApp, type MapperAppHandle } from './components/MapperApp';
import { getVsCodeFluentTheme } from './fluentTheme';

interface ReactMapperRootProps {
  vscode: MapEditorVsCodeApi;
  onAppReady(app: MapperAppHandle | null): void;
}

export function ReactMapperRoot({ vscode, onAppReady }: ReactMapperRootProps): React.ReactElement {
  return (
    <FluentProvider data-fluent-version="9" data-ui-framework="react" style={{ display: 'contents' }} theme={getVsCodeFluentTheme()}>
      <MapperApp vscode={vscode} onReady={onAppReady} />
    </FluentProvider>
  );
}
