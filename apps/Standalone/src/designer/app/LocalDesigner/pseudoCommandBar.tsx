import { useShowConnectionsPanel } from '../../state/workflowLoadingSelectors';
import './pseudoCommandBar.less';
import type { IModalStyles } from '@fluentui/react';
import { ActionButton, Modal } from '@fluentui/react';
import { MonacoEditor } from '@microsoft/designer-ui';
import type { Workflow, AppDispatch, RootState } from '@microsoft/logic-apps-designer';
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

export const PseudoCommandBar = () => {
  const state = useSelector((state: any) => state);
  const dispatch = useDispatch<AppDispatch>();

  const [showSerialization, setShowSeralization] = useState(false);
  const [serializedWorkflow, setSerializedWorkflow] = useState<Workflow>();
  const serializeCallback = () => {
    serializeWorkflow(state).then((serialized) => setSerializedWorkflow(serialized));
    setShowSeralization(true);
  };

  const isDarkMode = useSelector((state: RootState) => state.designerOptions.isDarkMode);

  const numErrors = useTotalNumErrors();
  const haveErrors = useMemo(() => numErrors > 0, [numErrors]);

  const isDirty = useIsDesignerDirty();

  const showConnectionsButton = useShowConnectionsPanel();

  return (
    <div className="pseudo-command-bar">
      <ActionButton
        iconProps={{ iconName: 'Save' }}
        text="Save"
        disabled={!isDirty}
        onClick={() => {
          alert("Congrats you saved the workflow! (Not really, you're in standalone)");
          dispatch(resetDesignerDirtyState(undefined));
        }}
      />
      <ActionButton
        iconProps={{ iconName: 'Clear' }}
        text="Discard"
        disabled={!isDirty}
        onClick={() => {
          dispatch(resetDesignerDirtyState(undefined));
        }}
      />
      <ActionButton
        iconProps={{ iconName: 'Parameter' }}
        text="Workflow Parameters"
        onClick={() => dispatch(openPanel({ panelMode: 'WorkflowParameters' }))}
      />
      {showConnectionsButton && (
        <ActionButton
          iconProps={{ iconName: 'Link12' }}
          text="Connections"
          onClick={() => dispatch(openPanel({ panelMode: 'Connection' }))}
        />
      )}
      <ActionButton iconProps={{ iconName: 'Code' }} text="Code View" onClick={serializeCallback} />
      <ActionButton
        iconProps={{
          iconName: haveErrors ? 'StatusErrorFull' : 'ErrorBadge',
          style: haveErrors ? { color: RUN_AFTER_COLORS[isDarkMode ? 'dark' : 'light']['FAILED'] } : undefined,
        }}
        text="Errors"
        onClick={() => dispatch(openPanel({ panelMode: 'Error' }))}
        disabled={!haveErrors}
      />
      <ActionButton iconProps={{ iconName: 'Undo' }} text="Undo" onClick={() => dispatch(onUndoClick())} disabled={!useCanUndo()} />
      <ActionButton iconProps={{ iconName: 'Redo' }} text="Redo" onClick={() => dispatch(onRedoClick())} disabled={!useCanRedo()} />

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
            wrappingIndent="same"
            height="800px"
            width="800px"
          />
        </div>
      </Modal>
    </div>
  );
};
