import { Label } from '../../label';
import { DropdownEditor, StringEditor, useId } from '../..';
import type { DropdownItem } from '../../dropdown';
import type { BaseEditorProps, ChangeState } from '../base';
import type { ValueSegment } from '../models/parameter';
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
} from '@fluentui/react-icons';
import { useState } from 'react';
import { isSingleLiteralValueSegment } from '../base/utils/helper';
import { guid } from '@microsoft/logic-apps-shared';
import { VARIABLE_TYPE } from '../../constants';

const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);
const ExpandIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
const CollapseIcon = bundleIcon(ChevronDown24Regular, ChevronDown24Filled);

const typeOptions: DropdownItem[] = [
  { key: VARIABLE_TYPE.BOOLEAN, value: VARIABLE_TYPE.BOOLEAN, displayName: 'Boolean' },
  { key: VARIABLE_TYPE.INTEGER, value: VARIABLE_TYPE.INTEGER, displayName: 'Integer' },
  { key: VARIABLE_TYPE.FLOAT, value: VARIABLE_TYPE.FLOAT, displayName: 'Float' },
  { key: VARIABLE_TYPE.STRING, value: VARIABLE_TYPE.STRING, displayName: 'String' },
  { key: VARIABLE_TYPE.OBJECT, value: VARIABLE_TYPE.OBJECT, displayName: 'Object' },
  { key: VARIABLE_TYPE.ARRAY, value: VARIABLE_TYPE.ARRAY, displayName: 'Array' },
];

export interface InitializeVariableProps {
  name: ValueSegment[];
  type: ValueSegment[];
  value: ValueSegment[];
}

interface VariableEditorProps extends Partial<BaseEditorProps> {
  variable: InitializeVariableProps;
  disableDelete: boolean;
  onDelete: () => void;
  onVariableChange: (value: InitializeVariableProps[]) => void;
}

const FieldEditor = ({
  label,
  id,
  isRequired,
  editor: EditorComponent,
  editorProps,
}: {
  label: string;
  id: string;
  isRequired: boolean;
  editor: React.ElementType;
  editorProps: Record<string, any>;
}) => (
  <div className="msla-input-parameter-field">
    <div className="msla-input-parameter-label">
      <Label id={id} isRequiredField={isRequired} text={label} />
    </div>
    <EditorComponent {...editorProps} />
  </div>
);

export const VariableEditor = ({ variable, onDelete, disableDelete, onVariableChange, ...baseEditorProps }: VariableEditorProps) => {
  const intl = useIntl();
  const [expanded, setExpanded] = useState(true);
  const [variableId, setVariableId] = useState<string>(guid());

  const handleToggleExpand = (): void => {
    setExpanded(!expanded);
  };

  const deleteButtonTitle = intl.formatMessage({
    defaultMessage: 'Delete',
    id: 'JErLDT',
    description: 'Delete label',
  });

  const deleteButtonDisabledTitle = intl.formatMessage({
    defaultMessage: 'Cannot delete the last variable',
    id: 'YL00wK',
    description: 'Delete label',
  });

  const newVariableName = intl.formatMessage({
    defaultMessage: 'New Variable',
    id: 'TyFREt',
    description: 'Heading Title for a Variable Without Name',
  });

  const handleBlur = (newState: ChangeState, property: string): void => {
    const newVariable = { ...variable, [property]: newState.value };
    onVariableChange([newVariable]);
  };

  const { name, type, value } = variable;

  const fields = [
    {
      label: 'Name',
      id: useId('Name'),
      isRequired: true,
      editor: StringEditor,
      editorProps: {
        ...baseEditorProps,
        key: `name-${variableId}`,
        className: 'msla-setting-token-editor-container',
        initialValue: name,
        editorBlur: (newState: ChangeState) => handleBlur(newState, 'name'),
        basePlugins: { ...baseEditorProps.basePlugins, tokens: false },
      },
    },
    {
      label: 'Type',
      id: useId('Type'),
      isRequired: true,
      editor: DropdownEditor,
      editorProps: {
        key: `type-${variableId}`,
        initialValue: type,
        options: typeOptions,
        onChange: (newState: ChangeState) => handleBlur(newState, 'type'),
      },
    },
    {
      label: 'Value',
      id: useId('Value'),
      isRequired: false,
      editor: StringEditor,
      editorProps: {
        ...baseEditorProps,
        key: `value-${variableId}`,
        className: 'msla-setting-token-editor-container',
        initialValue: value,
        editorBlur: (newState: ChangeState) => handleBlur(newState, 'value'),
      },
    },
  ];

  const handleDelete = () => {
    setVariableId(guid());
    onDelete();
  };

  return (
    <div className="msla-editor-initialize-variable">
      <div>
        <div>
          <Button
            appearance="subtle"
            className="msla-variable-editor-heading-button"
            onClick={handleToggleExpand}
            icon={expanded ? <CollapseIcon /> : <ExpandIcon />}
            aria-expanded={expanded}
          >
            {isSingleLiteralValueSegment(name) && name[0]?.value ? name[0]?.value : newVariableName}
          </Button>
          {/* {Object.values(props.validationErrors ?? {}).filter((x) => !!x).length > 0 ? (
            <span className="msla-workflow-parameter-error-dot">
              <TrafficLightDot fill={RUN_AFTER_COLORS[themeName]['FAILED']} />
            </span>
          ) : null} */}
        </div>
        {expanded ? (
          <>
            {fields.map(({ label, id, isRequired, editor, editorProps }) => (
              <FieldEditor key={id} label={label} id={id} isRequired={isRequired} editor={editor} editorProps={editorProps} />
            ))}
          </>
        ) : null}
      </div>
      <div className={'msla-variable-editor-edit-or-delete-button'}>
        <Tooltip relationship="label" content={disableDelete ? deleteButtonDisabledTitle : deleteButtonTitle}>
          <Button
            appearance="subtle"
            aria-label={deleteButtonTitle}
            onClick={handleDelete}
            icon={<DeleteIcon />}
            disabled={disableDelete}
            style={{ color: 'var(--colorBrandForeground1)' }}
          />
        </Tooltip>
      </div>
    </div>
  );
};
