import { mergeClasses, StringEditor } from '@microsoft/designer-ui';
import type { ParameterInfo, ValueSegment } from '@microsoft/logic-apps-shared';
import { useEditOperationStyles } from './styles';

interface ParameterEditorProps {
  parameter: ParameterInfo;
  onParameterVisibilityUpdate: () => void;
  handleParameterValueChange: (parameterId: string, newValue: ValueSegment[]) => void;
}

export const ParameterEditor = ({ parameter, onParameterVisibilityUpdate, handleParameterValueChange }: ParameterEditorProps) => {
  const styles = useEditOperationStyles();

  return (
    <StringEditor
      className={mergeClasses('msla-setting-token-editor-container', styles.parameterEditor)}
      initialValue={parameter.value}
      onChange={onParameterVisibilityUpdate}
      editorBlur={(changeState) => {
        const newValue = changeState.value;
        handleParameterValueChange(parameter.id, newValue);
      }}
      placeholder={parameter.placeholder ?? `Enter ${parameter.label?.toLowerCase()}`}
    />
  );
};
