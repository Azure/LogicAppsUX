import type { EditorContentChangedEventArgs } from '@microsoft/designer-ui';
import { MonacoEditor } from '@microsoft/designer-ui';
import { serializeBJSWorkflow, store as DesignerStore, setIsWorkflowDirty, useIsWorkflowDirty } from '@microsoft/logic-apps-designer-v2';
import type { AppDispatch } from '@microsoft/logic-apps-designer-v2';
import { EditorLanguage, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { useDispatch } from 'react-redux';
import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';

interface CodeViewProps {
  workflowKind?: string;
  workflowFile?: any;
}

const CodeViewEditor = forwardRef(({ workflowKind, workflowFile }: CodeViewProps, ref) => {
  const dispatch = useDispatch<AppDispatch>();
  const isWorkflowIsDirty = useIsWorkflowDirty();
  const [code, setCode] = useState<string | undefined>();
  const [changesMade, setChangesMade] = useState(false);

  useEffect(() => {
    const state = DesignerStore.getState();
    const initializeWorkflowFromState = async () => {
      try {
        const serializedWorkflowDefinition = await serializeBJSWorkflow(state, {
          skipValidation: true,
          ignoreNonCriticalErrors: true,
        }).then(async (serializedWorkflow) => {
          return { definition: serializedWorkflow.definition, kind: workflowKind };
        });

        setCode(JSON.stringify(serializedWorkflowDefinition, null, 2));
      } catch (error) {
        console.error('Error serializing workflow:', error);
      }
    };

    const initializeWorkflowFromFile = async () => {
      setCode(JSON.stringify(workflowFile, null, 2));
    };

    if (state?.workflow?.graph) {
      // When coming from designer view
      initializeWorkflowFromState();
    } else {
      // When coming from monitoring view
      initializeWorkflowFromFile();
    }
  }, [workflowFile, workflowKind]);

  const handleContentChanged = (e: EditorContentChangedEventArgs): void => {
    if (!isWorkflowIsDirty) {
      dispatch(setIsWorkflowDirty(true));
    }
    if (e.value !== undefined) {
      setCode(e.value);
      setChangesMade(true);
    }
  };

  useImperativeHandle(ref, () => ({
    getValue: () => code,
    hasChanges: () => changesMade,
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

CodeViewEditor.displayName = 'CodeViewEditor';
export default CodeViewEditor;
