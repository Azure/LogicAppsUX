import { Label } from '../../label';
import { Combobox, DropdownEditor, getVariableType, StringEditor, TrafficLightDot, useId } from '../..';
import type { DropdownItem } from '../../dropdown';
import type { BaseEditorProps, ChangeState } from '../base';
import { Button, Tooltip } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import {
  bundleIcon,
  ChevronDown24Filled,
  ChevronDown24Regular,
  ChevronRight24Filled,
  ChevronRight24Regular,
  Delete24Filled,
  Delete24Regular,
  Edit24Filled,
  Edit24Regular,
} from '@fluentui/react-icons';
import { useState } from 'react';
import { createEmptyLiteralValueSegment, isSingleLiteralValueSegment } from '../base/utils/helper';
import { guid, RUN_AFTER_COLORS } from '@microsoft/logic-apps-shared';
import constants, { VARIABLE_TYPE } from '../../constants';
import { isEmptySegments } from '../base/utils/parsesegments';
import { useTheme } from '@fluentui/react';
import type { InitializeVariableProps } from './';

const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);
const EditIcon = bundleIcon(Edit24Filled, Edit24Regular);
const ExpandIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
const CollapseIcon = bundleIcon(ChevronDown24Filled, ChevronDown24Regular);

const typeOptions: DropdownItem[] = [
  { key: VARIABLE_TYPE.BOOLEAN, value: VARIABLE_TYPE.BOOLEAN, displayName: 'Boolean' },
  { key: VARIABLE_TYPE.INTEGER, value: VARIABLE_TYPE.INTEGER, displayName: 'Integer' },
  { key: VARIABLE_TYPE.FLOAT, value: VARIABLE_TYPE.FLOAT, displayName: 'Float' },
  { key: VARIABLE_TYPE.STRING, value: VARIABLE_TYPE.STRING, displayName: 'String' },
  { key: VARIABLE_TYPE.OBJECT, value: VARIABLE_TYPE.OBJECT, displayName: 'Object' },
  { key: VARIABLE_TYPE.ARRAY, value: VARIABLE_TYPE.ARRAY, displayName: 'Array' },
];

export const VARIABLE_PROPERTIES = {
  NAME: 'name',
  TYPE: 'type',
  VALUE: 'value',
  DESCRIPTION: 'description',
};

export interface InitializeVariableErrors {
  [key: string]: string;
}

interface VariableEditorProps extends Partial<BaseEditorProps> {
  index: number;
  variable: InitializeVariableProps;
  disableDelete: boolean;
  errors?: InitializeVariableErrors;
  onDelete: () => void;
  onVariableChange: (value: InitializeVariableProps) => void;
  preventMultiVariable?: boolean;
  isAgentParameter?: boolean;
}

const FieldEditor = ({
  label,
  id,
  index,
  isRequired,
  editor: EditorComponent,
  editorProps,
  errorMessage,
}: {
  label: string;
  id: string;
  index: number;
  isRequired: boolean;
  editor: React.ElementType;
  editorProps: Record<string, any>;
  errorMessage?: string;
}) => (
  <div className="msla-input-parameter-field">
    <div className="msla-input-parameter-label">
      <Label id={id} isRequiredField={isRequired} text={label} />
    </div>
    <EditorComponent {...editorProps} labelId={`${label} - ${index}`} />
    {errorMessage ? <div className="msla-input-parameter-error">{errorMessage}</div> : null}
  </div>
);

export const VariableEditor = ({
  variable,
  onDelete,
  disableDelete,
  onVariableChange,
  errors,
  index,
  preventMultiVariable,
  isAgentParameter,
  ...baseEditorProps
}: VariableEditorProps) => {
  const intl = useIntl();
  const { isInverted } = useTheme();
  const themeName = isInverted ? 'dark' : 'light';
  const [expanded, setExpanded] = useState(!isAgentParameter);
  const [variableId, setVariableId] = useState<string>(guid());

  const handleToggleExpand = (): void => {
    setExpanded(!expanded);
  };

  const deleteButtonTitle = intl.formatMessage({
    defaultMessage: 'Delete',
    id: 'JErLDT',
    description: 'Delete label',
  });

  const deleteButtonDisabledVariableTitle = intl.formatMessage({
    defaultMessage: 'Cannot delete the last variable',
    id: 'YL00wK',
    description: 'Delete label',
  });

  const deleteButtonDisabledAgentParameter = intl.formatMessage({
    defaultMessage: 'Cannot delete the last agent parameter',
    id: 'hcpXlK',
    description: 'Delete label',
  });

  const editButtonTitle = intl.formatMessage({
    defaultMessage: 'Edit',
    id: 'crclvu',
    description: 'Edit label',
  });

  const newAgentParameterName = intl.formatMessage({
    defaultMessage: 'New Agent Parameter',
    id: '2bR583',
    description: 'Heading Title for a Agent Parameter Without Name',
  });

  const newVariableName = intl.formatMessage({
    defaultMessage: 'New Variable',
    id: 'TyFREt',
    description: 'Heading Title for a Variable Without Name',
  });

  const nameVariablePlaceHolder = intl.formatMessage({
    defaultMessage: 'Enter variable name',
    id: 'QKC8fv',
    description: 'Placeholder for variable name',
  });

  const nameAgentParameterPlaceHolder = intl.formatMessage({
    defaultMessage: 'Enter agent parameter name',
    id: '02TAGZ',
    description: 'Placeholder for parameter name',
  });

  const typeVariablePlaceHolder = intl.formatMessage({
    defaultMessage: 'Select variable type',
    id: 'Xrd4VK',
    description: 'Placeholder for variable type',
  });

  const typeAgentParameterPlaceholder = intl.formatMessage({
    defaultMessage: 'Select agent parameter type',
    id: 'gQSH6J',
    description: 'Placeholder for agent parameter type',
  });

  const valuePlaceHolder = intl.formatMessage({
    defaultMessage: 'Enter initial value',
    id: 'RlOSrx',
    description: 'Placeholder for initial value',
  });

  const descriptionPlaceHolder = intl.formatMessage({
    defaultMessage: 'Enter description',
    id: '0ws70s',
    description: 'Placeholder for description',
  });

  const handleBlur = (newState: ChangeState, property: string): void => {
    const newVariable = { ...variable, [property]: isEmptySegments(newState.value) ? [createEmptyLiteralValueSegment()] : newState.value };
    onVariableChange(newVariable);
  };

  const { name, type, value, description } = variable;

  const valueOrDescription = isAgentParameter ? VARIABLE_PROPERTIES.DESCRIPTION : VARIABLE_PROPERTIES.VALUE;
  const displayName =
    isSingleLiteralValueSegment(name) && name[0]?.value ? name[0]?.value : isAgentParameter ? newAgentParameterName : newVariableName;

  const isBooleanType = type[0]?.value === VARIABLE_TYPE.BOOLEAN;
  const variableType = getVariableType(type);
  const fields = [
    {
      label: VARIABLE_PROPERTIES.NAME,
      id: useId(VARIABLE_PROPERTIES.NAME),
      isRequired: true,
      editor: StringEditor,
      editorProps: {
        ...baseEditorProps,
        key: `${VARIABLE_PROPERTIES.NAME}-${variableId}`,
        className: 'msla-setting-token-editor-container',
        initialValue: name,
        editorBlur: (newState: ChangeState) => handleBlur(newState, VARIABLE_PROPERTIES.NAME),
        basePlugins: { ...baseEditorProps.basePlugins, tokens: false },
        placeholder: isAgentParameter ? nameAgentParameterPlaceHolder : nameVariablePlaceHolder,
        dataAutomationId: `${baseEditorProps.dataAutomationId}-${VARIABLE_PROPERTIES.NAME}-${index}`,
      },
      errorMessage: errors?.[VARIABLE_PROPERTIES.NAME],
    },
    {
      label: VARIABLE_PROPERTIES.TYPE,
      id: useId(VARIABLE_PROPERTIES.TYPE),
      isRequired: true,
      editor: DropdownEditor,
      editorProps: {
        ...baseEditorProps,
        key: `${VARIABLE_PROPERTIES.TYPE}-${variableId}`,
        initialValue: type,
        options: typeOptions,
        onChange: (newState: ChangeState) => handleBlur(newState, VARIABLE_PROPERTIES.TYPE),
        placeholder: isAgentParameter ? typeAgentParameterPlaceholder : typeVariablePlaceHolder,
        dataAutomationId: `${baseEditorProps.dataAutomationId}-${VARIABLE_PROPERTIES.TYPE}-${index}`,
      },
      errorMessage: errors?.[VARIABLE_PROPERTIES.TYPE],
    },
    {
      label: valueOrDescription,
      id: useId(valueOrDescription),
      isRequired: false,
      editor: isBooleanType && !isAgentParameter ? Combobox : StringEditor,
      editorProps: {
        ...baseEditorProps,
        key: `${valueOrDescription}-${variableId}`,
        className: 'msla-setting-token-editor-container',
        initialValue: isAgentParameter ? (description ?? []) : value,
        valueType: isAgentParameter ? constants.SWAGGER.TYPE.STRING : variableType,
        editorBlur: (newState: ChangeState) => handleBlur(newState, valueOrDescription),
        options:
          isBooleanType && !isAgentParameter
            ? [
                { key: 'true', displayName: 'true', value: true },
                { key: 'false', displayName: 'false', value: false },
              ]
            : undefined,
        onChange: isBooleanType ? (newState: ChangeState) => handleBlur(newState, valueOrDescription) : undefined,
        placeholder: isAgentParameter ? descriptionPlaceHolder : valuePlaceHolder,
        dataAutomationId: `${baseEditorProps.dataAutomationId}-${valueOrDescription}-${index}`,
      },
      errorMessage: errors?.[valueOrDescription],
    },
  ];

  const handleDelete = () => {
    setVariableId(guid());
    onDelete();
  };

  return (
    <div className={'msla-editor-initialize-variable'}>
      <div className={'msla-variable-editor-heading'}>
        <Button
          appearance="subtle"
          className="msla-variable-editor-heading-button"
          onClick={handleToggleExpand}
          icon={expanded ? <CollapseIcon /> : <ExpandIcon />}
          aria-expanded={expanded}
          style={{ justifyContent: 'flex-start', width: '90%' }}
        >
          {displayName}
          {Object.values(errors ?? {}).filter((x) => !!x).length > 0 ? (
            <span className="msla-initialize-variable-error-dot">
              <TrafficLightDot fill={RUN_AFTER_COLORS[themeName]['FAILED']} />
            </span>
          ) : null}
        </Button>
        {preventMultiVariable && !isAgentParameter ? null : (
          <>
            <div className={'msla-variable-editor-edit-or-delete-button'}>
              <Tooltip relationship="label" content={editButtonTitle}>
                <Button
                  appearance="subtle"
                  aria-label={editButtonTitle}
                  onClick={handleToggleExpand}
                  icon={<EditIcon />}
                  disabled={baseEditorProps?.readonly}
                  style={{ color: 'var(--colorBrandForeground1)' }}
                />
              </Tooltip>
            </div>
            <div className={'msla-variable-editor-edit-or-delete-button'}>
              <Tooltip
                relationship="label"
                content={
                  disableDelete
                    ? isAgentParameter
                      ? deleteButtonDisabledAgentParameter
                      : deleteButtonDisabledVariableTitle
                    : deleteButtonTitle
                }
              >
                <Button
                  appearance="subtle"
                  aria-label={deleteButtonTitle}
                  onClick={handleDelete}
                  icon={<DeleteIcon />}
                  disabled={disableDelete || baseEditorProps?.readonly}
                  style={{ color: 'var(--colorBrandForeground1)' }}
                />
              </Tooltip>
            </div>
          </>
        )}
      </div>
      {expanded ? (
        <div className="msla-variable-editor-content">
          {fields.map(({ label, id, isRequired, editor, editorProps, errorMessage }) => (
            <FieldEditor
              key={id}
              label={label}
              id={id}
              index={index}
              isRequired={isRequired}
              editor={editor}
              editorProps={editorProps}
              errorMessage={errorMessage}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};
