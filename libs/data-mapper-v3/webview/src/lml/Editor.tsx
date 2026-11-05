import { useCallback, useEffect, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import { ActionCreators } from 'redux-undo';
import {
  DataMapDataProvider,
  DataMapperDesigner,
  DataMapperDesignerProvider,
  DataMapperWrappedContext,
  getFileNameAndPath,
  getFunctions,
  getSelectedSchema,
  InitDataMapperFileService,
  InitOtherDMService,
  type DataMapDataProviderProps,
} from '@microsoft/logic-apps-data-mapper-v2';
import { DevLogger, InitLoggerService, type MapMetadataV2, Theme } from '@microsoft/logic-apps-shared';
import { setXsltContent } from '../../../../data-mapper-v2/src/core/state/DataMapSlice';
import { toggleTestPanel } from '../../../../data-mapper-v2/src/core/state/PanelSlice';
import { convertToMapDefinition } from '../../../../data-mapper-v2/src/mapHandling/MapDefinitionSerializer';
import { generateMapMetadata } from '../../../../data-mapper-v2/src/mapHandling/MapMetadataSerializer';
import type {
  LmlDocumentSaved,
  LmlSaveRequested,
  LmlEditorCommand,
  LmlEditorDocumentChange,
  LmlEditorInitialState,
} from '../../../src/lml/editorProtocol';
import { loadMap } from './loadMap';
import { cancelPending, request, resetRevision, sendSaveSnapshot, write } from './rpc';
import { apiService, createFileService, fileItems } from './services';
import { acknowledgeSave, createEditorStore, type SaveOperation } from './store';

type Session = {
  data: DataMapDataProviderProps;
  store: ReturnType<typeof createEditorStore>;
  active: boolean;
  ready: boolean;
  hasUserEdits: boolean;
};

const wrappedContext = { scroll: { setScroll: () => undefined } };

async function bootstrap(): Promise<Session> {
  const initial = await request<LmlEditorInitialState>('initialize');
  resetRevision(initial.revision);
  const mapDefinition = loadMap(initial.mapText);
  const dataMapMetadata = initial.metadataText?.trim() ? (JSON.parse(initial.metadataText) as MapMetadataV2) : undefined;
  const schema = async (header: string) => {
    const schemaPath = mapDefinition[header];
    if (schemaPath === undefined) {
      return undefined;
    }
    if (typeof schemaPath !== 'string' || !schemaPath.trim()) {
      throw new Error(`Invalid LML schema header: ${header}`);
    }
    const [schemaName, schemaFilePath] = getFileNameAndPath(schemaPath);
    return getSelectedSchema(schemaName, schemaFilePath);
  };
  const fetchedFunctions = await getFunctions();
  if (typeof fetchedFunctions === 'string') {
    throw new Error(`Failed to load the functions manifest: ${fetchedFunctions}`);
  }
  const sourceSchema = await schema('$sourceSchema');
  const targetSchema = await schema('$targetSchema');
  const schemaPaths = [...initial.schemaPaths];
  for (const header of ['$sourceSchema', '$targetSchema']) {
    const schemaPath = mapDefinition[header];
    if (typeof schemaPath === 'string' && !schemaPaths.includes(schemaPath)) {
      schemaPaths.push(schemaPath);
    }
  }
  return {
    active: true,
    ready: false,
    hasUserEdits: false,
    store: createEditorStore(),
    data: {
      mapDefinition,
      dataMapMetadata,
      fetchedFunctions,
      sourceSchema,
      targetSchema,
      availableSchemas: fileItems(schemaPaths),
      customXsltPaths: fileItems(initial.customXsltPaths),
      xsltFilename: initial.xsltFilename,
      xsltContent: initial.xsltContent,
      isTestDisabledForOS: initial.isTestDisabledForOS,
      theme: initial.isDark ? Theme.Dark : Theme.Light,
    },
  };
}

function EditorSession({ session, onError }: { session: Session; onError(error: unknown): void }) {
  const [data, setData] = useState(session.data);
  const draftTimer = useRef<ReturnType<typeof setTimeout>>();
  const [fileService] = useState(() => {
    const service = createFileService(
      (update) => {
        if (session.active) {
          setData((current) => ({ ...current, ...update }));
        }
      },
      (error) => {
        if (session.active) {
          onError(error);
        }
      },
      (definition, metadata) => {
        const operation = { ...session.store.getState().dataMap.present.curDataMapOperation, dataMapLML: definition };
        const parsed = JSON.parse(metadata) as MapMetadataV2;
        return () => {
          if (session.active) {
            session.store.dispatch(acknowledgeSave({ operation, metadata: parsed }));
          }
        };
      }
    );
    const saveDraft = service.saveDraftStateCall;
    const saveMap = service.saveMapDefinitionCall;
    const saveXslt = service.saveXsltCall;
    service.saveMapDefinitionCall = (definition, metadata) => {
      clearTimeout(draftTimer.current);
      if (session.active && session.ready) {
        saveMap(definition, metadata);
      }
    };
    service.saveXsltCall = (xslt) => {
      if (session.active && session.ready) {
        saveXslt(xslt);
      }
    };
    service.saveDraftStateCall = (dataMapDefinition) => {
      const state = session.store.getState().dataMap.present;
      if (session.active && session.ready && session.hasUserEdits && state.curDataMapOperation.dataMapLML === dataMapDefinition) {
        saveDraft(dataMapDefinition);
      }
    };
    return service;
  });
  InitDataMapperFileService(fileService);

  useEffect(() => {
    let previousDefinition = '';
    const unsubscribe = session.store.subscribe(() => {
      const state = session.store.getState().dataMap.present;
      const definition = state.curDataMapOperation.dataMapLML;
      if (session.ready && state.isDirty) {
        session.hasUserEdits = true;
      }
      if (!session.ready || !session.hasUserEdits || state.sourceInEditState || state.targetInEditState || !definition) {
        clearTimeout(draftTimer.current);
        return;
      }
      if (definition === previousDefinition) {
        return;
      }
      previousDefinition = definition;
      clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => fileService.saveDraftStateCall(definition), 350);
    });
    queueMicrotask(() => {
      if (session.active) {
        session.store.dispatch(ActionCreators.clearHistory());
        previousDefinition = session.store.getState().dataMap.present.curDataMapOperation.dataMapLML;
        session.ready = true;
      }
    });
    return () => {
      session.active = false;
      session.ready = false;
      clearTimeout(draftTimer.current);
      unsubscribe();
    };
  }, [session, fileService]);

  useEffect(() => {
    const snapshots = new Map<string, { operation: SaveOperation; metadata?: MapMetadataV2 }>();
    const onSave = ({ data: message }: MessageEvent<LmlSaveRequested | LmlDocumentSaved>) => {
      if (!session.active || !session.ready) {
        return;
      }
      if (message?.type === 'lmlDocumentSaved') {
        const snapshot = snapshots.get(message.id);
        snapshots.delete(message.id);
        if (snapshot) {
          resetRevision(message.revision);
          session.store.dispatch(acknowledgeSave(snapshot));
          if (session.store.getState().dataMap.present.isDirty) {
            clearTimeout(draftTimer.current);
            draftTimer.current = setTimeout(() => {
              fileService.saveDraftStateCall(session.store.getState().dataMap.present.curDataMapOperation.dataMapLML);
            }, 350);
          }
        }
        return;
      }
      if (message?.type !== 'lmlSaveRequested') {
        return;
      }
      clearTimeout(draftTimer.current);
      snapshots.clear();
      try {
        const present = session.store.getState().dataMap.present;
        const operation = present.curDataMapOperation;
        let definition = message.mapText;
        let metadata: MapMetadataV2 | undefined;
        if (session.hasUserEdits) {
          if (present.sourceInEditState || present.targetInEditState) {
            throw new Error('Finish selecting the source and target schemas before saving.');
          }
          const serialized = convertToMapDefinition(
            operation.dataMapConnections,
            operation.sourceSchema,
            operation.targetSchema,
            operation.targetSchemaOrdering
          );
          if (!serialized.isSuccess) {
            throw new Error('The map could not be serialized.');
          }
          const bounds = operation.loadedMapMetadata?.canvasRect;
          if (!bounds?.width || !bounds.height) {
            throw new Error('The mapping canvas is not ready to save layout metadata.');
          }
          definition = serialized.definition;
          metadata = generateMapMetadata(operation.functionNodes, operation.dataMapConnections, bounds);
        }
        snapshots.set(message.id, { operation: { ...operation, dataMapLML: definition }, metadata });
        sendSaveSnapshot({
          type: 'lmlSaveSnapshot',
          id: message.id,
          revision: message.revision,
          dataMapDefinition: definition,
          mapMetadata: metadata && JSON.stringify(metadata),
        });
      } catch (error) {
        onError(error);
        sendSaveSnapshot({
          type: 'lmlSaveSnapshot',
          id: message.id,
          revision: message.revision,
          dataMapDefinition: message.mapText,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    window.addEventListener('message', onSave);
    return () => window.removeEventListener('message', onSave);
  }, [session, fileService, onError]);

  useEffect(() => {
    let commands = Promise.resolve();
    const onCommand = ({ data: message }: MessageEvent<LmlEditorCommand>) => {
      if (message?.type !== 'lmlCommand') {
        return;
      }
      commands = commands
        .then(async () => {
          if (!session.active || !session.ready) {
            return;
          }
          const state = session.store.getState();
          const present = state.dataMap.present;
          const operation = present.curDataMapOperation;
          if (present.sourceInEditState || present.targetInEditState) {
            throw new Error('Finish selecting the source and target schemas first.');
          }
          if (message.command === 'test') {
            if (present.isTestDisabledForOS || !operation.xsltFilename) {
              throw new Error('Testing is unavailable. Compile the map first and check operating system support.');
            }
            if (!state.panel.testPanel.isOpen) {
              session.store.dispatch(toggleTestPanel());
            }
            return;
          }
          if (message.command !== 'compile') {
            return;
          }
          clearTimeout(draftTimer.current);
          const definition = convertToMapDefinition(
            operation.dataMapConnections,
            operation.sourceSchema,
            operation.targetSchema,
            operation.targetSchemaOrdering
          );
          if (!definition.isSuccess) {
            throw new Error('The map could not be serialized. Check the original map checker for invalid connections.');
          }
          const bounds = operation.loadedMapMetadata?.canvasRect;
          if (!bounds?.width || !bounds.height) {
            throw new Error('The mapping canvas is not ready to save layout metadata.');
          }
          const mapMetadata = JSON.stringify(generateMapMetadata(operation.functionNodes, operation.dataMapConnections, bounds));
          await write('saveMapDefinition', { dataMapDefinition: definition.definition, mapMetadata });
          if (session.active) {
            session.store.dispatch(
              acknowledgeSave({
                operation: { ...operation, dataMapLML: definition.definition },
                metadata: JSON.parse(mapMetadata) as MapMetadataV2,
              })
            );
          }
          const xslt = await apiService.generateDataMapXslt(definition.definition);
          if (!session.active) {
            return;
          }
          await write('saveXslt', { xslt });
          if (session.active) {
            session.store.dispatch(setXsltContent(xslt));
          }
        })
        .catch((error: unknown) => {
          if (session.active) {
            onError(error);
          }
        });
    };
    window.addEventListener('message', onCommand);
    return () => window.removeEventListener('message', onCommand);
  }, [session, fileService, onError]);

  return (
    <DataMapperDesignerProvider locale="en-US" theme={data.theme} options={{}}>
      <Provider store={session.store}>
        <DataMapperWrappedContext.Provider value={wrappedContext}>
          <DataMapDataProvider {...data}>
            <div className="lml-designer">
              <DataMapperDesigner fileService={fileService} />
            </div>
          </DataMapDataProvider>
        </DataMapperWrappedContext.Provider>
      </Provider>
    </DataMapperDesignerProvider>
  );
}

export default function Editor() {
  const [session, setSession] = useState<Session>();
  const [error, setError] = useState<string>();
  const [operationError, setOperationError] = useState<string>();
  const current = useRef<Session>();
  const attempt = useRef(0);
  const disposeSession = useCallback(() => {
    attempt.current++;
    if (current.current) {
      current.current.active = false;
    }
    cancelPending('The LML editor was unmounted.');
  }, []);
  const onError = useCallback((failure: unknown) => {
    setOperationError(failure instanceof Error ? failure.message : String(failure));
  }, []);
  const reload = useCallback(async () => {
    const id = ++attempt.current;
    if (current.current) {
      current.current.active = false;
    }
    cancelPending('The LML editor is reloading the document.');
    setSession(undefined);
    setError(undefined);
    setOperationError(undefined);
    try {
      InitLoggerService([new DevLogger()]);
      InitOtherDMService(apiService);
      const loaded = await bootstrap();
      if (id === attempt.current) {
        current.current = loaded;
        setSession(loaded);
      }
    } catch (failure) {
      if (id === attempt.current) {
        setError(failure instanceof Error ? failure.message : String(failure));
      }
    }
  }, []);

  useEffect(() => {
    const onChange = ({ data }: MessageEvent<LmlEditorDocumentChange>) => {
      if (data?.type === 'lmlDocumentChanged') {
        reload();
      }
    };
    window.addEventListener('message', onChange);
    reload();
    return () => {
      disposeSession();
      window.removeEventListener('message', onChange);
    };
  }, [reload, disposeSession]);

  if (!session) {
    return (
      <main className="lml-status" aria-live="polite">
        <h1>{error ? 'Unable to open LML map' : 'Opening LML map'}</h1>
        {error ? <pre role="alert">{error}</pre> : <p>Loading schemas and functions...</p>}
        {error && (
          <button type="button" onClick={reload}>
            Retry
          </button>
        )}
      </main>
    );
  }
  return (
    <>
      {operationError && (
        <div className="lml-operation-error" role="alert">
          <span>{operationError}</span>
          <button type="button" aria-label="Dismiss error" onClick={() => setOperationError(undefined)}>
            X
          </button>
        </div>
      )}
      <EditorSession session={session} onError={onError} />
    </>
  );
}
