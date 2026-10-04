import React, { useLayoutEffect, useRef } from 'react';
import type { HostToWebviewMessage, MapEditorVsCodeApi } from '../../../src/protocol/mapEditorProtocol';
import './CopilotPanel';
import './EmptySchemaPlaceholder';
import './FunctoidConfigDialog';
import './FunctoidPalette';
import './MapperBottomPanel';
import './MapperContextMenu';
import './MapperNotification';
import './MapperPageBar';
import './MapperStatusBar';
import './MapperToolbar';
import './MappingCanvas';
import './SchemaNodePropertiesDialog';
import './SchemaTreeRenderer';
import './ScriptingConfigDialog';
import { type MapperAppElements, MapperAppController } from './MapperAppController';
import type { FunctoidPalette } from './FunctoidPalette';
import type { FunctoidConfigDialog } from './FunctoidConfigDialog';
import type { EmptySchemaPlaceholder } from './EmptySchemaPlaceholder';
import type { CopilotPanel } from './CopilotPanel';
import type { MapperBottomPanel } from './MapperBottomPanel';
import type { MapperContextMenu } from './MapperContextMenu';
import type { MapperNotification } from './MapperNotification';
import type { MapperPageBar } from './MapperPageBar';
import type { MapperStatusBar } from './MapperStatusBar';
import type { MapperToolbar } from './MapperToolbar';
import type { MappingCanvas } from './MappingCanvas';
import type { SchemaTreeRenderer } from './SchemaTreeRenderer';
import type { SchemaNodePropertiesDialog } from './SchemaNodePropertiesDialog';
import type { ScriptingConfigDialog } from './ScriptingConfigDialog';
import './MapperApp.css';

export interface MapperAppHandle {
  handleMessage(message: HostToWebviewMessage): void;
}

interface MapperAppProps {
  vscode: MapEditorVsCodeApi;
  onReady(app: MapperAppHandle | null): void;
}

interface MapperAppElementRefs {
  container: React.RefObject<HTMLDivElement>;
  copilot: React.RefObject<CopilotPanel>;
  toolbar: React.RefObject<MapperToolbar>;
  palette: React.RefObject<FunctoidPalette>;
  mappingArea: React.RefObject<HTMLDivElement>;
  sourceTree: React.RefObject<SchemaTreeRenderer>;
  sourceEmpty: React.RefObject<EmptySchemaPlaceholder>;
  canvas: React.RefObject<MappingCanvas>;
  pageBar: React.RefObject<MapperPageBar>;
  targetTree: React.RefObject<SchemaTreeRenderer>;
  targetEmpty: React.RefObject<EmptySchemaPlaceholder>;
  bottomPanel: React.RefObject<MapperBottomPanel>;
  statusBar: React.RefObject<MapperStatusBar>;
  schemaDialog: React.RefObject<SchemaNodePropertiesDialog>;
  scriptingDialog: React.RefObject<ScriptingConfigDialog>;
  functoidDialog: React.RefObject<FunctoidConfigDialog>;
  contextMenu: React.RefObject<MapperContextMenu>;
  notification: React.RefObject<MapperNotification>;
}

function useMapperAppController(
  vscode: MapEditorVsCodeApi,
  onReady: (app: MapperAppHandle | null) => void,
  refs: MapperAppElementRefs
): void {
  useLayoutEffect(() => {
    const {
      container,
      copilot,
      toolbar,
      palette,
      mappingArea,
      sourceTree,
      sourceEmpty,
      canvas,
      pageBar,
      targetTree,
      targetEmpty,
      bottomPanel,
      statusBar,
      schemaDialog,
      scriptingDialog,
      functoidDialog,
      contextMenu,
      notification,
    } = refs;
    if (
      !container.current ||
      !copilot.current ||
      !toolbar.current ||
      !palette.current ||
      !mappingArea.current ||
      !sourceTree.current ||
      !sourceEmpty.current ||
      !canvas.current ||
      !pageBar.current ||
      !targetTree.current ||
      !targetEmpty.current ||
      !bottomPanel.current ||
      !statusBar.current ||
      !schemaDialog.current ||
      !scriptingDialog.current ||
      !functoidDialog.current ||
      !contextMenu.current ||
      !notification.current
    ) {
      return;
    }

    const elements: MapperAppElements = {
      container: container.current,
      copilot: copilot.current,
      toolbar: toolbar.current,
      palette: palette.current,
      mappingArea: mappingArea.current,
      sourceTree: sourceTree.current,
      sourceEmpty: sourceEmpty.current,
      canvas: canvas.current,
      pageBar: pageBar.current,
      targetTree: targetTree.current,
      targetEmpty: targetEmpty.current,
      bottomPanel: bottomPanel.current,
      statusBar: statusBar.current,
      schemaDialog: schemaDialog.current,
      scriptingDialog: scriptingDialog.current,
      functoidDialog: functoidDialog.current,
      contextMenu: contextMenu.current,
      notification: notification.current,
    };

    const controller = new MapperAppController(elements, vscode);
    controller.mount();
    onReady({
      handleMessage(message): void {
        controller.handleMessage(message);
      },
    });

    return () => {
      onReady(null);
      controller.dispose();
    };
  }, [onReady, refs, vscode]);
}

export function MapperApp({ vscode, onReady }: MapperAppProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const copilotRef = useRef<CopilotPanel>(null);
  const toolbarRef = useRef<MapperToolbar>(null);
  const paletteRef = useRef<FunctoidPalette>(null);
  const mappingAreaRef = useRef<HTMLDivElement>(null);
  const sourceTreeRef = useRef<SchemaTreeRenderer>(null);
  const sourceEmptyRef = useRef<EmptySchemaPlaceholder>(null);
  const canvasRef = useRef<MappingCanvas>(null);
  const pageBarRef = useRef<MapperPageBar>(null);
  const targetTreeRef = useRef<SchemaTreeRenderer>(null);
  const targetEmptyRef = useRef<EmptySchemaPlaceholder>(null);
  const bottomPanelRef = useRef<MapperBottomPanel>(null);
  const statusBarRef = useRef<MapperStatusBar>(null);
  const schemaDialogRef = useRef<SchemaNodePropertiesDialog>(null);
  const scriptingDialogRef = useRef<ScriptingConfigDialog>(null);
  const functoidDialogRef = useRef<FunctoidConfigDialog>(null);
  const contextMenuRef = useRef<MapperContextMenu>(null);
  const notificationRef = useRef<MapperNotification>(null);
  const refs = useRef<MapperAppElementRefs>({
    container: containerRef,
    copilot: copilotRef,
    toolbar: toolbarRef,
    palette: paletteRef,
    mappingArea: mappingAreaRef,
    sourceTree: sourceTreeRef,
    sourceEmpty: sourceEmptyRef,
    canvas: canvasRef,
    pageBar: pageBarRef,
    targetTree: targetTreeRef,
    targetEmpty: targetEmptyRef,
    bottomPanel: bottomPanelRef,
    statusBar: statusBarRef,
    schemaDialog: schemaDialogRef,
    scriptingDialog: scriptingDialogRef,
    functoidDialog: functoidDialogRef,
    contextMenu: contextMenuRef,
    notification: notificationRef,
  }).current;

  useMapperAppController(vscode, onReady, refs);

  return (
    <div ref={containerRef} className="mapper-container" data-component="mapper-app">
      {React.createElement('biztalk-mapper-toolbar', { ref: toolbarRef })}
      {React.createElement('biztalk-copilot-panel', { ref: copilotRef, hidden: true })}
      <div className="mapper-content">
        {React.createElement('biztalk-functoid-palette', { ref: paletteRef, class: 'functoid-palette-container' })}
        <div className="mapping-workspace">
          <div ref={mappingAreaRef} className="mapping-area">
            <div className="schema-tree-container source-tree">
              {React.createElement('biztalk-schema-tree', {
                ref: sourceTreeRef,
                class: 'source-tree',
                hidden: true,
              })}
              {React.createElement('biztalk-empty-schema', {
                ref: sourceEmptyRef,
                class: 'source-tree',
              })}
            </div>
            <div className="canvas-workspace">
              {React.createElement('biztalk-mapping-canvas', { ref: canvasRef, class: 'canvas-container' })}
              {React.createElement('biztalk-mapper-page-bar', { ref: pageBarRef, class: 'page-sheet-bar' })}
            </div>
            <div className="schema-tree-container target-tree">
              {React.createElement('biztalk-schema-tree', {
                ref: targetTreeRef,
                class: 'target-tree',
                hidden: true,
              })}
              {React.createElement('biztalk-empty-schema', {
                ref: targetEmptyRef,
                class: 'target-tree',
              })}
            </div>
          </div>
        </div>
      </div>
      {React.createElement('biztalk-mapper-bottom-panel', { ref: bottomPanelRef })}
      {React.createElement('biztalk-mapper-statusbar', { ref: statusBarRef })}
      {React.createElement('biztalk-schema-node-properties-dialog', { ref: schemaDialogRef, hidden: true })}
      {React.createElement('biztalk-scripting-config-dialog', { ref: scriptingDialogRef, hidden: true })}
      {React.createElement('biztalk-functoid-config-dialog', { ref: functoidDialogRef, hidden: true })}
      {React.createElement('biztalk-mapper-context-menu', { ref: contextMenuRef, class: 'context-menu', hidden: true })}
      {React.createElement('biztalk-mapper-notification', { ref: notificationRef, hidden: true })}
    </div>
  );
}
