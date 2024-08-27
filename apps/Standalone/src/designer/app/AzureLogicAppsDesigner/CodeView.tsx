import { useMount } from '@fluentui/react-hooks';
import type { EditorContentChangedEventArgs } from '@microsoft/designer-ui';
import { MonacoEditor } from '@microsoft/designer-ui';
import { serializeBJSWorkflow, store as DesignerStore, setIsWorkflowDirty } from '@microsoft/logic-apps-designer';
import type { AppDispatch } from '@microsoft/logic-apps-designer';
import { EditorLanguage, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { useDispatch } from 'react-redux';

interface CodeViewProps {
  code?: string;
  setCode: (code?: string) => void;
  workflowKind?: string;
  isConsumption?: boolean;
}

const CodeViewEditor = ({ code, setCode, workflowKind, isConsumption }: CodeViewProps) => {
  const dispatch = useDispatch<AppDispatch>();
  useMount(async () => {
    const serializedWorkflowDefintiion = await serializeBJSWorkflow(DesignerStore.getState(), {
      skipValidation: true,
      ignoreNonCriticalErrors: true,
    }).then((serializedWorkflow) => {
      return isConsumption
        ? { definition: serializedWorkflow.definition }
        : { definition: serializedWorkflow.definition, kind: workflowKind };
    });
    setCode(JSON.stringify(serializedWorkflowDefintiion, null, 2));
  });

  const handleContentChanged = (e: EditorContentChangedEventArgs): void => {
    if (e.value !== undefined) {
      setCode(e.value);
      dispatch(setIsWorkflowDirty(true));
    }
  };
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
};

export default CodeViewEditor;
