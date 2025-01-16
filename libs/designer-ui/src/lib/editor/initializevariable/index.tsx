import { useState } from 'react';
import type { BaseEditorProps } from '../base';
import { convertStringToSegments } from '../base/utils/editorToSegment';
import { createEmptyLiteralValueSegment, createLiteralValueSegment } from '../base/utils/helper';
import { convertSegmentsToString, isEmptySegments } from '../base/utils/parsesegments';
import type { ValueSegment } from '../models/parameter';
import { StringEditor } from '../string';
import { VariableEditor } from './variableEditor';
import { Button } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export interface InitializeVariableProps {
  name: ValueSegment[];
  type: ValueSegment[];
  value: ValueSegment[];
}

export const InitializeVariableEditor = ({ initialValue, ...props }: BaseEditorProps) => {
  const intl = useIntl();
  const [variables, setVariables] = useState<InitializeVariableProps[]>(parseInitialValue(initialValue) || []);

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

  const handleDeleteVariable = (index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  };

  return variables ? (
    <div className="msla-editor-initialize-variables">
      {variables.map((variable, index) => (
        <VariableEditor key={index} variable={variable} onDelete={() => handleDeleteVariable(index)} {...props} />
      ))}

      <div className="msla-add-variable-button">
        <Button onClick={addVariable}>{addVariableLabel}</Button>
      </div>
    </div>
  ) : (
    <StringEditor {...props} initialValue={initialValue} />
  );
};

const parseInitialValue = (initialValue: ValueSegment[]): InitializeVariableProps[] | undefined => {
  if (isEmptySegments(initialValue)) {
    return [
      { name: [createEmptyLiteralValueSegment()], type: [createEmptyLiteralValueSegment()], value: [createEmptyLiteralValueSegment()] },
    ];
  }

  const nodeMap: Map<string, ValueSegment> = new Map<string, ValueSegment>();
  const initialValueString = convertSegmentsToString(initialValue, nodeMap);

  try {
    const variables = JSON.parse(initialValueString);
    return Array.isArray(variables)
      ? variables.map((variable: { name: string; type: string; value: string }) => ({
          name: [createLiteralValueSegment(variable.name)],
          type: [createLiteralValueSegment(variable.type)],
          value: convertStringToSegments(variable.value, nodeMap, { tokensEnabled: true }),
        }))
      : undefined;
  } catch {
    return undefined;
  }
};
