import { useCallback, useMemo, useState } from 'react';
import type { BaseEditorProps } from '../base';
import { createEmptyLiteralValueSegment } from '../base/utils/helper';
import type { ValueSegment } from '../models/parameter';
import { StringEditor } from '../string';
import type { InitializeVariableErrors } from './variableEditor';
import { VariableEditor } from './variableEditor';
import { Button, MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import {
  createVariableEditorSegments,
  convertVariableEditorSegmentsAsSchema,
  parseSchemaAsVariableEditorSegments,
  parseVariableEditorSegments,
} from './util';
import constants from '../../constants';
import { Add24Filled, Add24Regular, bundleIcon } from '@fluentui/react-icons';

const CreateIcon = bundleIcon(Add24Filled, Add24Regular);
export interface InitializeVariableProps {
  name: ValueSegment[];
  type: ValueSegment[];
  value: ValueSegment[];
  description?: ValueSegment[];
}

export interface InitializeVariableEditorProps extends BaseEditorProps {
  validationErrors?: InitializeVariableErrors[];
  isMultiVariableEnabled?: boolean;
  isAgentParameter?: boolean;
}

export const InitializeVariableEditor = ({
  initialValue,
  onChange,
  validationErrors,
  isAgentParameter,
  ...props
}: InitializeVariableEditorProps) => {
  const intl = useIntl();
  const [variables, setVariables] = useState<InitializeVariableProps[] | undefined>(() =>
    isAgentParameter ? parseSchemaAsVariableEditorSegments(initialValue) : parseVariableEditorSegments(initialValue)
  );

  const stringResources = useMemo(
    () => ({
      ADD_VARIABLE: intl.formatMessage({
        defaultMessage: 'Add a Variable',
        id: 'HET2nV',
        description: 'label to add a variable',
      }),
      ADD_PARAMETER: intl.formatMessage({
        defaultMessage: 'Add a Parameter',
        id: 'ysSmGO',
        description: 'label to add a parameter',
      }),
    }),
    [intl]
  );

  const addButtonText = isAgentParameter ? stringResources.ADD_PARAMETER : stringResources.ADD_VARIABLE;

  const warningTitleVariable = intl.formatMessage({
    defaultMessage: 'Unable to Parse Variables',
    id: 'uqrOee',
    description: 'Warning title for when unable to parse variables',
  });

  const warningTitleAgentParameter = intl.formatMessage({
    defaultMessage: 'Unable to Parse Agent Parameter Schema',
    id: '4vZjpN',
    description: 'Warning title for when unable to parse schema',
  });

  const warningVariableBody = intl.formatMessage({
    defaultMessage: 'This could mean that the variable is set up incorrectly.',
    id: '3pOMqH',
    description: 'Warning body for when unable to parse variables',
  });

  const warningAgentParameterBody = intl.formatMessage({
    defaultMessage: 'This could mean that the agent parameter schema is set up incorrectly.',
    id: 'JLd6W7',
    description: 'Warning body for when unable to parse schema',
  });

  const addVariable = useCallback(() => {
    setVariables((prev) => [
      ...(prev ?? []),
      {
        name: [createEmptyLiteralValueSegment()],
        type: [createEmptyLiteralValueSegment()],
        value: [createEmptyLiteralValueSegment()],
      },
    ]);
  }, [setVariables]);

  const updateVariables = useCallback(
    (updatedVariables: InitializeVariableProps[]) => {
      const segments = isAgentParameter
        ? convertVariableEditorSegmentsAsSchema(updatedVariables)
        : createVariableEditorSegments(updatedVariables);
      onChange?.({
        value: segments,
        viewModel: { variables: updatedVariables, hideParameterErrors: true },
      });
      return updatedVariables;
    },
    [isAgentParameter, onChange]
  );

  const handleDeleteVariable = useCallback(
    (index: number) => {
      setVariables((prev) => {
        const p = prev ?? [];
        const updatedVariables = p.filter((_, i) => i !== index);
        return updateVariables(updatedVariables);
      });
    },
    [updateVariables]
  );

  const handleVariableChange = useCallback(
    (value: InitializeVariableProps, index: number) => {
      setVariables((prev) => {
        const updatedVariables = (prev ?? []).map((v, i) => (i === index ? value : v));
        return updateVariables(updatedVariables);
      });
    },
    [updateVariables]
  );

  return variables ? (
    <div className="msla-editor-initialize-variables">
      {variables.map((variable, index) => (
        <VariableEditor
          {...props}
          isAgentParameter={isAgentParameter}
          key={index}
          index={index}
          variable={variable}
          onDelete={() => handleDeleteVariable(index)}
          onVariableChange={(value: InitializeVariableProps) => handleVariableChange(value, index)}
          disableDelete={!isAgentParameter && variables.length === 1}
          errors={validationErrors?.[index]}
        />
      ))}
      {props.isMultiVariableEnabled || isAgentParameter ? (
        <div className="msla-initialize-variable-add-variable-button">
          <Button
            appearance="subtle"
            aria-label={addButtonText}
            onClick={addVariable}
            disabled={variables.length === constants.PARAMETER.VARIABLE_EDITOR_MAX_VARIABLES || props.readonly}
            icon={<CreateIcon />}
            style={
              variables.length === constants.PARAMETER.VARIABLE_EDITOR_MAX_VARIABLES || props.readonly
                ? {}
                : {
                    color: 'var(--colorBrandForeground1)',
                    border: '1px solid #9e9e9e',
                  }
            }
          >
            {addButtonText}
          </Button>
        </div>
      ) : null}
    </div>
  ) : (
    <>
      <StringEditor {...props} initialValue={initialValue} />
      {/** TODO: Error should only be shown if there's no error */}
      <MessageBar key={'warning'} intent={'warning'} className="msla-initialize-variable-warning">
        <MessageBarBody>
          <MessageBarTitle>{isAgentParameter ? warningTitleAgentParameter : warningTitleVariable}</MessageBarTitle>
          {isAgentParameter ? warningAgentParameterBody : warningVariableBody}
        </MessageBarBody>
      </MessageBar>
    </>
  );
};
