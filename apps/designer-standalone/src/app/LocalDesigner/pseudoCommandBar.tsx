import './pseudoCommandBar.less';
import type { IModalStyles } from '@fluentui/react';
import { ActionButton, Modal } from '@fluentui/react';
import { MonacoEditor, EditorLanguage } from '@microsoft/logic-apps-designer';
import type { Workflow, AppDispatch } from '@microsoft/logic-apps-designer';
import {
  useIsDesignerDirty,
  resetDesignerDirtyState,
  serializeWorkflow,
  switchToWorkflowParameters,
  switchToErrorsPanel,
} from '@microsoft/logic-apps-designer';
import { useState } from 'react';
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

  const isDirty = useIsDesignerDirty();

  return (
    <div className="pseudo-command-bar">
      <ActionButton
        iconProps={{ iconName: 'Save' }}
        text="Save"
        disabled={!isDirty}
        onClick={() => {
          alert("Congrats you saved the workflow! (Not really, you're in standalone)");
          dispatch(resetDesignerDirtyState());
        }}
      />
      <ActionButton
        iconProps={{ iconName: 'Clear' }}
        text="Discard"
        disabled={!isDirty}
        onClick={() => {
          dispatch(resetDesignerDirtyState());
        }}
      />
      <ActionButton
        iconProps={{ iconName: 'Parameter' }}
        text="Workflow Parameters"
        onClick={() => dispatch(switchToWorkflowParameters())}
      />
      <ActionButton iconProps={{ iconName: 'Code' }} text="Code View" onClick={serializeCallback} />
      <ActionButton iconProps={{ iconName: 'ErrorBadge' }} text="Errors" onClick={() => dispatch(switchToErrorsPanel())} />

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
