import { useMount } from '@fluentui/react-hooks';
import type { EditorContentChangedEventArgs } from '@microsoft/designer-ui';
import { MonacoEditor } from '@microsoft/designer-ui';
import { serializeBJSWorkflow, store as DesignerStore, setIsWorkflowDirty, useIsWorkflowDirty } from '@microsoft/logic-apps-designer';
import type { AppDispatch } from '@microsoft/logic-apps-designer';
import { EditorLanguage, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { useDispatch } from 'react-redux';
import { convertDesignerWorkflowToConsumptionWorkflow } from './Services/ConsumptionSerializationHelpers';
import { useState, forwardRef, useImperativeHandle } from 'react';

interface CodeViewProps {
  workflowKind?: string;
  isConsumption?: boolean;
}

const CodeViewEditor = forwardRef(({ workflowKind, isConsumption }: CodeViewProps, ref) => {
  const dispatch = useDispatch<AppDispatch>();
  const isWorkflowIsDirty = useIsWorkflowDirty();
  const [code, setCode] = useState<string | undefined>();

  useMount(async () => {
    const serializedWorkflowDefinition = await serializeBJSWorkflow(DesignerStore.getState(), {
      skipValidation: true,
      ignoreNonCriticalErrors: true,
    }).then(async (serializedWorkflow) => {
      if (isConsumption) {
        const { definition, connectionReferences, parameters } = serializedWorkflow;
        const workflowToSave = {
          definition,
          parameters,
          connectionReferences,
        };

        const workflow = await convertDesignerWorkflowToConsumptionWorkflow(workflowToSave);
        return workflow;
      }

      return { definition: serializedWorkflow.definition, kind: workflowKind };
    });

    setCode(JSON.stringify(serializedWorkflowDefinition, null, 2));
  });

  const handleContentChanged = (e: EditorContentChangedEventArgs): void => {
    if (!isWorkflowIsDirty) {
      dispatch(setIsWorkflowDirty(true));
    }
    if (e.value !== undefined) {
      setCode(e.value);
    }
  };

  useImperativeHandle(ref, () => ({
    getValue: () => code,
  }));

  return (
    <div>
      {isNullOrUndefined(code) ? null : (
        <MonacoEditor
          height="95vh"
          language={EditorLanguage.json}
          value={code}
          overviewRulerBorder={true}
          scrollBeyondLastLine={false}
          fontSize={13}
          onContentChanged={handleContentChanged}
        />
      )}
    </div>
  );
});

export default CodeViewEditor;
