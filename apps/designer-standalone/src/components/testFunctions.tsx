import { Modal, PrimaryButton } from '@fluentui/react';
import { EditorLanguage, MonacoEditor } from '@microsoft/designer-ui';
import type { Workflow, WorkflowParameter } from '@microsoft/logic-apps-designer';
import { serializeWorkflow } from '@microsoft/logic-apps-designer';
import { useState } from 'react';

const TestFunctions = () => {
  const [showSerialization, setShowSeralization] = useState(false);
  const [serializedWorkflow, setSerializedWorkflow] = useState<Workflow>();
  const serializeCallback = () => {
    const state = (window as any).DesignerStore.getState();
    serializeWorkflow(state).then((serialized) => setSerializedWorkflow(serialized));
    setShowSeralization(true);
  };

  const [showWorkflowParameters, setShowWorkflowParameters] = useState(false);
  const toggleWorkflowParameters = () => setShowWorkflowParameters(!showWorkflowParameters);
  const workflowParameters: Record<string, WorkflowParameter> = {};

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      <PrimaryButton text="Code View" onClick={serializeCallback} />
      <PrimaryButton disabled={!!workflowParameters} text="Workflow Parameters" onClick={toggleWorkflowParameters} />

      {/* Code view */}
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

      {/* WorkflowParameters */}
      <Modal isOpen={showWorkflowParameters} onDismiss={toggleWorkflowParameters} layerProps={{ eventBubblingEnabled: true }}>
        <div style={{ padding: '24px' }}>
          <h1>Workflow Parameters</h1>
          {/* Add parameters here */}
        </div>
      </Modal>
    </div>
  );
};

export default TestFunctions;
