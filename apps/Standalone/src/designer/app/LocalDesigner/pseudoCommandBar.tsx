import './pseudoCommandBar.less';
import type { IModalStyles } from '@fluentui/react';
import { ActionButton, Modal } from '@fluentui/react';
import { MonacoEditor } from '@microsoft/designer-ui';
import type { AppDispatch, RootState } from '@microsoft/logic-apps-designer';
import * as DesignerV2 from '@microsoft/logic-apps-designer-v2';
import {
  useIsDesignerDirty,
  resetDesignerDirtyState,
  serializeWorkflow,
  openPanel,
  onRedoClick,
  onUndoClick,
  useCanUndo,
  useCanRedo,
  useTotalNumErrors,
} from '@microsoft/logic-apps-designer';
import { EditorLanguage, RUN_AFTER_COLORS } from '@microsoft/logic-apps-shared';
import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const modalStyles: Partial<IModalStyles> = {
  scrollableContent: {
    maxHeight: '100%',
  },
};

interface CommandBarBindings {
  isDarkMode: boolean;
  isDirty: boolean;
  numErrors: number;
  canUndo: boolean;
  canRedo: boolean;
  serialize: () => Promise<unknown>;
  resetDirty: () => void;
  openPanel: (panelMode: 'WorkflowParameters' | 'Connection' | 'Error') => void;
  undo: () => void;
  redo: () => void;
}

export const PseudoCommandBar = () => {
  const state = useSelector((state: RootState) => state);
  const dispatch = useDispatch<AppDispatch>();
  const bindings: CommandBarBindings = {
    isDarkMode: state.designerOptions.isDarkMode ?? false,
    isDirty: useIsDesignerDirty(),
    numErrors: useTotalNumErrors(),
    canUndo: useCanUndo(),
    canRedo: useCanRedo(),
    serialize: () => serializeWorkflow(state),
    resetDirty: () => dispatch(resetDesignerDirtyState(undefined)),
    openPanel: (panelMode) => dispatch(openPanel({ panelMode })),
    undo: () => dispatch(onUndoClick()),
    redo: () => dispatch(onRedoClick()),
  };
  return <CommandBar {...bindings} />;
};

export const PseudoCommandBarV2 = () => {
  const state = useSelector((state: DesignerV2.RootState) => state);
  const dispatch = useDispatch<DesignerV2.AppDispatch>();
  const bindings: CommandBarBindings = {
    isDarkMode: state.designerOptions.isDarkMode ?? false,
    isDirty: DesignerV2.useIsDesignerDirty(),
    numErrors: DesignerV2.useTotalNumErrors(),
    canUndo: DesignerV2.useCanUndo(),
    canRedo: DesignerV2.useCanRedo(),
    serialize: () => DesignerV2.serializeWorkflow(state),
    resetDirty: () => dispatch(DesignerV2.resetDesignerDirtyState(undefined)),
    openPanel: (panelMode) => dispatch(DesignerV2.openPanel({ panelMode })),
    undo: () => dispatch(DesignerV2.onUndoClick()),
    redo: () => dispatch(DesignerV2.onRedoClick()),
  };
  return <CommandBar {...bindings} />;
};

const CommandBar = ({
  isDarkMode,
  isDirty,
  numErrors,
  canUndo,
  canRedo,
  serialize,
  resetDirty,
  openPanel,
  undo,
  redo,
}: CommandBarBindings) => {
  const [showSerialization, setShowSeralization] = useState(false);
  const [serializedWorkflow, setSerializedWorkflow] = useState<unknown>();
  const serializeCallback = () => {
    serialize().then((serialized) => setSerializedWorkflow(serialized));
    setShowSeralization(true);
  };

  const haveErrors = useMemo(() => numErrors > 0, [numErrors]);

  return (
    <div className="pseudo-command-bar">
      <ActionButton
        iconProps={{ iconName: 'Save' }}
        text="Save"
        disabled={!isDirty}
        onClick={() => {
          alert("Congrats you saved the workflow! (Not really, you're in standalone)");
          resetDirty();
        }}
      />
      <ActionButton
        iconProps={{ iconName: 'Clear' }}
        text="Discard"
        disabled={!isDirty}
        onClick={() => {
          resetDirty();
        }}
      />
      <ActionButton iconProps={{ iconName: 'Parameter' }} text="Workflow Parameters" onClick={() => openPanel('WorkflowParameters')} />
      <ActionButton iconProps={{ iconName: 'Link12' }} text="Connections" onClick={() => openPanel('Connection')} />
      <ActionButton iconProps={{ iconName: 'Code' }} text="Code View" onClick={serializeCallback} />
      <ActionButton
        iconProps={{
          iconName: haveErrors ? 'StatusErrorFull' : 'ErrorBadge',
          style: haveErrors ? { color: RUN_AFTER_COLORS[isDarkMode ? 'dark' : 'light']['FAILED'] } : undefined,
        }}
        text="Errors"
        onClick={() => openPanel('Error')}
        disabled={!haveErrors}
      />
      <ActionButton iconProps={{ iconName: 'Undo' }} text="Undo" onClick={undo} disabled={!canUndo} />
      <ActionButton iconProps={{ iconName: 'Redo' }} text="Redo" onClick={redo} disabled={!canRedo} />

      {/* Code view modal */}
      <Modal
        isOpen={showSerialization}
        onDismiss={() => setShowSeralization(false)}
        layerProps={{ eventBubblingEnabled: true }}
        styles={modalStyles}
      >
        <div style={{ padding: '24px' }}>
          <h1>Serialized Workflow</h1>
          <MonacoEditor
            language={EditorLanguage.json}
            value={JSON.stringify(serializedWorkflow, null, 2)}
            readOnly
            folding
            lineNumbers="on"
            scrollbar={{ horizontal: 'auto', vertical: 'auto' }}
            wordWrap="on"
            height="800px"
            width="800px"
          />
        </div>
      </Modal>
    </div>
  );
};
