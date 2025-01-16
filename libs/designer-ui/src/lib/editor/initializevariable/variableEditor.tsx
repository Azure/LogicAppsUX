import { Label } from '../../label';
import { DropdownEditor, StringEditor, TrafficLightDot, useId } from '../..';
import type { DropdownItem } from '../../dropdown';
import type { BaseEditorProps } from '../base';
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
import { useTheme } from '@fluentui/react';
import { RUN_AFTER_COLORS } from '@microsoft/logic-apps-shared';

const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);
const ExpandIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
const CollapseIcon = bundleIcon(ChevronDown24Regular, ChevronDown24Filled);

const typeOptions: DropdownItem[] = [
  { key: 'boolean', value: 'boolean', displayName: 'Boolean' },
  { key: 'integer', value: 'integer', displayName: 'Integer' },
  { key: 'float', value: 'float', displayName: 'Float' },
  { key: 'string', value: 'string', displayName: 'String' },
  { key: 'object', value: 'object', displayName: 'Object' },
  { key: 'array', value: 'array', displayName: 'Array' },
];

export interface InitializeVariableProps {
  name: ValueSegment[];
  type: ValueSegment[];
  value: ValueSegment[];
}

interface VariableEditorProps extends Partial<BaseEditorProps> {
  variable: InitializeVariableProps;
  onDelete: () => void;
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

export const VariableEditor = ({ variable, onDelete, ...baseEditorProps }: VariableEditorProps) => {
  const intl = useIntl();
  const [expanded, setExpanded] = useState(true);
  const { isInverted } = useTheme();
  const themeName = isInverted ? 'dark' : 'light';

  const handleToggleExpand = (): void => {
    setExpanded(!expanded);
  };

  const deleteButtonTitle = intl.formatMessage({
    defaultMessage: 'Delete',
    id: 'JErLDT',
    description: 'Delete label',
  });

  const newVariableName = intl.formatMessage({
    defaultMessage: 'New Variable',
    id: 'TyFREt',
    description: 'Heading Title for a Variable Without Name',
  });

  const { name, type, value } = variable;

  const fields = [
    {
      label: 'Name',
      id: useId('Name'),
      isRequired: true,
      editor: StringEditor,
      editorProps: { ...baseEditorProps, className: 'msla-setting-token-editor-container', initialValue: name },
    },
    {
      label: 'Type',
      id: useId('Type'),
      isRequired: true,
      editor: DropdownEditor,
      editorProps: { initialValue: type, options: typeOptions },
    },
    {
      label: 'Value',
      id: useId('Value'),
      isRequired: false,
      editor: StringEditor,
      editorProps: { ...baseEditorProps, className: 'msla-setting-token-editor-container', initialValue: value },
    },
  ];

  return (
    <div className="msla-editor-initialize-variable">
      {/* <div className="msla-delete-variable">
        <Tooltip relationship="label" content={deleteButtonTitle}>
          <Button
            appearance="subtle"
            aria-label={deleteButtonTitle}
            onClick={onDelete}
            icon={<DeleteIcon style={{ color: 'var(--colorBrandForeground1)' }} />}
          />
        </Tooltip>
      </div> */}
      <div>
        <div>
          <Button
            appearance="subtle"
            data-testid={`${name}-parameter-heading-button`}
            className="msla-workflow-parameter-heading-button"
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
      <div className="msla-workflow-parameter-edit-or-delete-button">
        <Tooltip relationship="label" content={deleteButtonTitle}>
          <Button
            appearance="subtle"
            aria-label={deleteButtonTitle}
            onClick={onDelete}
            icon={<DeleteIcon style={{ color: 'var(--colorBrandForeground1)' }} />}
          />
        </Tooltip>
      </div>
    </div>
  );
};
