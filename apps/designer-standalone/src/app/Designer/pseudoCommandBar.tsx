import './pseudoCommandBar.less';
import { ActionButton, Modal } from '@fluentui/react';
import { MonacoEditor, EditorLanguage } from '@microsoft/designer-ui';
import type { Workflow } from '@microsoft/logic-apps-designer';
import { serializeWorkflow, switchToWorkflowParameters } from '@microsoft/logic-apps-designer';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const PseudoCommandBar = () => {
  const state = useSelector((state: any) => state);
  const dispatch = useDispatch();

  const [showSerialization, setShowSeralization] = useState(false);
  const [serializedWorkflow, setSerializedWorkflow] = useState<Workflow>();
  const serializeCallback = () => {
    serializeWorkflow(state).then((serialized) => setSerializedWorkflow(serialized));
    setShowSeralization(true);
  };

  return (
    <div className="pseudo-command-bar">
      <ActionButton iconProps={{ iconName: 'Code' }} text="Code View" onClick={serializeCallback} />
      <ActionButton
        iconProps={{ iconName: 'Parameter' }}
        text="Workflow Parameters"
        onClick={() => dispatch(switchToWorkflowParameters())}
      />

      {/* Code view modal */}
      <Modal isOpen={showSerialization} onDismiss={() => setShowSeralization(false)} layerProps={{ eventBubblingEnabled: true }}>
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
