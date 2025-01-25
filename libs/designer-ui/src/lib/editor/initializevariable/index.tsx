import { useState } from 'react';
import type { BaseEditorProps } from '../base';
import { createEmptyLiteralValueSegment } from '../base/utils/helper';
import type { ValueSegment } from '../models/parameter';
import { StringEditor } from '../string';
import { VariableEditor } from './variableEditor';
import { Button, MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { createVariableEditorSegments, parseVariableEditorSegments } from './util';
import constants from '../../constants';
import { Add24Filled, Add24Regular, bundleIcon } from '@fluentui/react-icons';

const CreateIcon = bundleIcon(Add24Filled, Add24Regular);
export interface InitializeVariableProps {
  name: ValueSegment[];
  type: ValueSegment[];
  value: ValueSegment[];
}

export const InitializeVariableEditor = ({ initialValue, onChange, ...props }: BaseEditorProps) => {
  const intl = useIntl();
  const [variables, setVariables] = useState<InitializeVariableProps[]>(() => parseVariableEditorSegments(initialValue));

  const addVariableLabel = intl.formatMessage({ defaultMessage: 'Add a Variable', id: 'HET2nV', description: 'label to add a variable' });
  const warningTitle = intl.formatMessage({
    defaultMessage: 'Unable to Parse Variables',
    id: 'uqrOee',
    description: 'Warning title for when unable to parse variables',
  });
  const warningBody = intl.formatMessage({
    defaultMessage: 'This could mean that the variable is set up incorrectly.',
    id: '3pOMqH',
    description: 'Warning body for when unable to parse variables',
  });

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
      if (prev.length === 1) {
        return prev;
      }
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
          disableDelete={variables.length === 1}
        />
      ))}

      <div className="msla-initialize-variable-add-variable-button">
        <Button
          appearance="subtle"
          aria-label={addVariableLabel}
          onClick={addVariable}
          disabled={variables.length === constants.PARAMETER.VARIABLE_EDITOR_MAX_VARIABLES}
          icon={<CreateIcon />}
          style={{ border: '1px solid #9e9e9e', color: 'var(--colorBrandForeground1)' }}
        >
          {addVariableLabel}
        </Button>
      </div>
    </div>
  ) : (
    <>
      <StringEditor {...props} initialValue={initialValue} />
      <MessageBar key={'warning'} intent={'warning'} className="msla-initialize-variable-warning">
        <MessageBarBody>
          <MessageBarTitle>{warningTitle}</MessageBarTitle>
          {warningBody}
        </MessageBarBody>
      </MessageBar>
    </>
  );
};
