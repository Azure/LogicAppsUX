import { useState } from 'react';
import type { BaseEditorProps } from '../base';
import { createEmptyLiteralValueSegment } from '../base/utils/helper';
import type { ValueSegment } from '../models/parameter';
import { StringEditor } from '../string';
import { VariableEditor } from './variableEditor';
import { Button } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { createVariableEditorSegments, parseVariableEditorSegments } from './util';

export interface InitializeVariableProps {
  name: ValueSegment[];
  type: ValueSegment[];
  value: ValueSegment[];
}

export const InitializeVariableEditor = ({ initialValue, onChange, ...props }: BaseEditorProps) => {
  const intl = useIntl();
  const [variables, setVariables] = useState(() => parseVariableEditorSegments(initialValue) || []);

  const addVariableLabel = intl.formatMessage({ defaultMessage: 'Add a Variable', id: 'HET2nV', description: 'label to add a variable' });

  const addVariable = () => {
    setVariables((prev) => [
      ...prev,
      {
        name: [createEmptyLiteralValueSegment()],
        type: [createEmptyLiteralValueSegment()],
        value: [createEmptyLiteralValueSegment()],
      },
    ]);
  };

  const updateVariables = (updatedVariables: InitializeVariableProps[]) => {
    const segments = createVariableEditorSegments(updatedVariables);
    onChange?.({ value: segments });
    return updatedVariables;
  };

  const handleDeleteVariable = (index: number) => {
    setVariables((prev) => {
      const updatedVariables = prev.filter((_, i) => i !== index);
      return updateVariables(updatedVariables);
    });
  };

  const handleVariableChange = (value: InitializeVariableProps[], index: number) => {
    setVariables((prev) => {
      const updatedVariables = prev.map((v, i) => (i === index ? value[0] : v));
      return updateVariables(updatedVariables);
    });
  };

  return variables?.length ? (
    <div className="msla-editor-initialize-variables">
      {variables.map((variable, index) => (
        <VariableEditor
          {...props}
          key={index}
          variable={variable}
          onDelete={() => handleDeleteVariable(index)}
          onVariableChange={(value: InitializeVariableProps[]) => handleVariableChange(value, index)}
        />
      ))}

      <div className="msla-add-variable-button">
        <Button onClick={addVariable}>{addVariableLabel}</Button>
      </div>
    </div>
  ) : (
    <StringEditor {...props} initialValue={initialValue} />
  );
};
