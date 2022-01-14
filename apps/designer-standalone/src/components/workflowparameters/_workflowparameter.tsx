import { CommandBarButton, IButton, IButtonStyles, IconButton } from '@fluentui/react/lib/Button';
import { Dropdown, IDropdownOption, IDropdownStyles } from '@fluentui/react/lib/Dropdown';
import type { IIconProps } from '@fluentui/react/lib/Icon';
import { ILabelStyles, Label } from '@fluentui/react/lib/Label';
import { FontWeights, getTheme, IStyle } from '@fluentui/react/lib/Styling';
import { ITextStyles, Text } from '@fluentui/react/lib/Text';
import { ITextFieldProps, ITextFieldStyles, TextField } from '@fluentui/react/lib/TextField';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';
// import * as monaco from 'monaco-editor';
import { findDOMNode } from 'react-dom';
// import Resources from 'resources';
import { equals, format } from '../../libs/shared/Utils';
import Constants from '../../constants';
import type { EventHandler } from '../eventhandler';
import { isHighContrastBlackOrInverted } from '../../utils/theme';

const fieldStyles: IStyle = {
  display: 'inline-block',
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 'auto',
};

const disabledTextFieldStyles: Partial<ITextFieldStyles> = {
  root: fieldStyles,
  fieldGroup: {
    borderColor: 'rgb(194, 194, 194)',
  },
};

const dropdownStyles: Partial<IDropdownStyles> = {
  root: fieldStyles,
};

const commandBarStyles: Partial<IButtonStyles> = {
  label: {
    fontWeight: FontWeights.semibold,
  },
};

const labelStyles: Partial<ILabelStyles> = {
  root: {
    display: 'inline-block',
    minWidth: 100,
    verticalAlign: 'top',
  },
};

const textStyles: Partial<ITextStyles> = {
  root: {
    color: getTheme().palette.yellow,
    fontWeight: FontWeights.bold,
  },
};

const textFieldStyles: Partial<ITextFieldStyles> = {
  root: fieldStyles,
};

const textFieldWithWarningStyles: Partial<ITextFieldStyles> = {
  root: fieldStyles,
  fieldGroup: {
    borderColor: 'rgb(255, 185, 0)',
    selectors: {
      '&:hover': {
        borderColor: 'rgb(255, 185, 0)',
      },
    },
  },
};

const typeOptions: IDropdownOption[] = [
  { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.ARRAY, text: 'Resources.WORKFLOW_PARAMETERS_TYPE_ARRAY' },
  { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.BOOL, text: 'Resources.WORKFLOW_PARAMETERS_TYPE_BOOL' },
  { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.FLOAT, text: 'Resources.WORKFLOW_PARAMETERS_TYPE_FLOAT' },
  { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.INT, text: 'Resources.WORKFLOW_PARAMETERS_TYPE_INT' },
  { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.OBJECT, text: 'Resources.WORKFLOW_PARAMETERS_TYPE_OBJECT' },
  { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.SECURE_OBJECT, text: 'Resources.WORKFLOW_PARAMETERS_TYPE_SECURE_OBJECT' },
  { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.SECURE_STRING, text: 'Resources.WORKFLOW_PARAMETERS_TYPE_SECURE_STRING' },
  { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.STRING, text: 'Resources.WORKFLOW_PARAMETERS_TYPE_STRING' },
];

const typeOptionsForStandard: IDropdownOption[] = [
  { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.ARRAY, text: 'Resources.WORKFLOW_PARAMETERS_TYPE_ARRAY' },
  { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.BOOL, text: 'Resources.WORKFLOW_PARAMETERS_TYPE_BOOL' },
  { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.FLOAT, text: 'Resources.WORKFLOW_PARAMETERS_TYPE_FLOAT' },
  { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.INT, text: 'Resources.WORKFLOW_PARAMETERS_TYPE_INT' },
  { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.OBJECT, text: 'Resources.WORKFLOW_PARAMETERS_TYPE_OBJECT' },
  { key: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.STRING, text: 'Resources.WORKFLOW_PARAMETERS_TYPE_STRING' },
];

const NAME_KEY = 'name';
const DEFAULT_VALUE_KEY = 'defaultValue';

export interface WorkflowParameterUpdateEvent {
  id: string;
  newDefinition: WorkflowParameterDefinition;
}

export interface WorkflowParameterDeleteEvent {
  id: string;
}

export type WorkflowParameterUpdateHandler = EventHandler<WorkflowParameterUpdateEvent>;
export type WorkflowParameterDeleteHandler = EventHandler<WorkflowParameterDeleteEvent>;
export type RegisterLanguageHandler = () => void;

export interface WorkflowParameterDefinition {
  defaultValue?: string;
  id: string;
  isEditable?: boolean;
  name?: string;
  type?: string;
  value?: string;
}

export interface WorkflowParameterProps {
  definition: WorkflowParameterDefinition;
  isReadOnly?: boolean;
  standardMode?: boolean;
  validationErrors?: Record<string, string>;
  onChange?: WorkflowParameterUpdateHandler;
  onDelete?: WorkflowParameterDeleteHandler;
  onRegisterLanguageProvider?: RegisterLanguageHandler;
}

export interface WorkflowParameterState {
  defaultValue?: string;
  expanded?: boolean;
  isEditable?: boolean;
  isInverted?: boolean;
  name?: string;
  type?: string;
  valueWarningMessage?: string | undefined;
}

interface ParameterFieldDetails {
  name: string;
  defaultValue: string;
  type: string;
  value: string;
}

export class WorkflowParameter extends React.Component<WorkflowParameterProps, WorkflowParameterState> {
  state: WorkflowParameterState = {
    defaultValue: this.props.definition.defaultValue,
    expanded: !!this.props.definition.isEditable,
    isEditable: this.props.definition.isEditable,
    isInverted: isHighContrastBlackOrInverted(),
    name: this.props.definition.name,
    type: getParameterTypeKey(this.props.definition.type),
    valueWarningMessage: getValueWarningMessage(this.props.definition.defaultValue, this.props.definition.type),
  };

  render() {
    const {
      definition: { id },
      isReadOnly,
      validationErrors,
      standardMode,
    } = this.props;
    const { expanded, isEditable, name } = this.state;
    const parameterDetails: ParameterFieldDetails = {
      name: `${id}-${NAME_KEY}`,
      defaultValue: `${id}-${DEFAULT_VALUE_KEY}`,
      type: `${id}-type`,
      value: `${id}-value`,
    };
    const errors = validationErrors ? validationErrors : {};
    const iconProps: IIconProps = {
      iconName: expanded ? 'ChevronDownMed' : 'ChevronRightMed',
      styles: {
        root: {
          fontSize: 14,
          color: this.state.isInverted ? 'white' : '#514f4e',
        },
      },
    };

    if (standardMode) {
      return (
        <div className="msla-workflow-parameter">
          <div className="msla-workflow-parameter-group-standard">
            <div>
              <CommandBarButton
                className="msla-workflow-parameter-heading-button"
                iconProps={iconProps}
                onClick={this._handleToggleExpand}
                styles={commandBarStyles}
                text={name ? name : 'Resources.WORKFLOW_PARAMETER_HEADING_TEXT'}
              />
            </div>
            {expanded ? this._renderParameterFields(parameterDetails, errors) : null}
          </div>
          {!isReadOnly ? (
            <div className="msla-workflow-parameter-edit-or-delete-button">{this._renderEditOrDeleteButton(isEditable)}</div>
          ) : null}
        </div>
      );
    } else {
      return (
        <div className="msla-workflow-parameter">
          <div className="msla-workflow-parameter-group">{this._renderParameterFields(parameterDetails, errors)}</div>
          {!isReadOnly ? this._renderEditOrDeleteButton(/* showDelete */ true) : null}
        </div>
      );
    }
  }

  private _renderEditOrDeleteButton = (showDelete?: boolean): JSX.Element => {
    return showDelete ? <DeleteButton onClick={this._onDelete} /> : <EditButton onClick={this._onEdit} />;
  };

  private _renderParameterFields = (parameterDetails: ParameterFieldDetails, errors: Record<string, string>): JSX.Element => {
    const { isReadOnly, standardMode } = this.props;
    const { name, type, isEditable } = this.state;
    if (isEditable || !standardMode) {
      return (
        <>
          <div className="msla-workflow-parameter-field">
            <Label styles={labelStyles} required={true} htmlFor={parameterDetails.name}>
              {'Resources.WORKFLOW_PARAMETER_NAME_TITLE'}
            </Label>
            <TextField
              styles={textFieldStyles}
              id={parameterDetails.name}
              ariaLabel={'Resources.WORKFLOW_PARAMETER_NAME_TITLE'}
              placeholder={'Resources.WORKFLOW_PARAMETER_NAME_DESCRIPTION'}
              value={name}
              errorMessage={errors[NAME_KEY]}
              onChange={this._onNameChange}
              disabled={isReadOnly}
            />
          </div>
          <div className="msla-workflow-parameter-field">
            <Label styles={labelStyles} required={true} htmlFor={parameterDetails.type}>
              {'Resources.WORKFLOW_PARAMETER_TYPE_TITLE'}
            </Label>
            <Dropdown
              id={parameterDetails.type}
              ariaLabel={'Resources.WORKFLOW_PARAMETER_TYPE_TITLE'}
              options={standardMode ? typeOptionsForStandard : typeOptions}
              selectedKey={type}
              styles={dropdownStyles}
              onChange={this._onTypeChange}
              disabled={isReadOnly}
            />
          </div>
          {this._renderParameterValueField(parameterDetails, errors)}
        </>
      );
    } else {
      return this._renderReadOnlyParameters(parameterDetails);
    }
  };

  private _renderParameterValueField = (parameterDetails: ParameterFieldDetails, errors: Record<string, string>): JSX.Element => {
    const {
      definition: { value },
      isReadOnly,
      standardMode,
      onRegisterLanguageProvider,
    } = this.props;
    const { defaultValue, type, valueWarningMessage } = this.state;

    // if (standardMode) {
    //   const error = errors[DEFAULT_VALUE_KEY];
    //   const isMultiline = type === 'Object' || type === 'Array';
    //   const layout = { height: isMultiline ? 80 : 30, width: 425 };
    //   const options: monaco.editor.IEditorConstructionOptions = {
    //     ...Editor.defaultProps.options,
    //     fontSize: 14,
    //     lineNumbers: 'off',
    //     language: type === 'String' ? 'plaintext' : 'json',
    //     readOnly: false,
    //     scrollBeyondLastLine: false,
    //     wordWrap: isMultiline ? 'on' : 'off',
    //     scrollbar: {
    //       vertical: isMultiline ? 'visible' : 'hidden',
    //       horizontal: isMultiline ? 'visible' : 'hidden',
    //     },
    //     minimap: {
    //       enabled: isMultiline,
    //     },
    //     folding: isMultiline,
    //     contextmenu: isMultiline,
    //     overviewRulerLanes: isMultiline ? 2 : 0,
    //     overviewRulerBorder: isMultiline,
    //   };
    //   let className = '';

    //   if (isMultiline) {
    //     className = error ? 'msla-workflow-parameter-multiline-editor-error' : 'msla-workflow-parameter-multiline-editor';
    //   } else {
    //     className = error ? 'msla-workflow-parameter-editor-error' : 'msla-workflow-parameter-editor';
    //   }
    //   return (
    //     <div className="msla-workflow-parameter-value-field">
    //       <Label styles={labelStyles} required={true} htmlFor={parameterDetails.value}>
    //         {'Resources.WORKFLOW_PARAMETER_VALUE_TITLE'}
    //       </Label>
    //       <div>
    //         <div className={className}>
    //           <Editor
    //             defaultValue={defaultValue}
    //             layout={layout}
    //             options={options}
    //             onContentChanged={this._onContentChange}
    //             onEditorLoaded={onRegisterLanguageProvider}
    //           />
    //         </div>
    //         {errors[DEFAULT_VALUE_KEY] ? this._onRenderError(errors[DEFAULT_VALUE_KEY]) : null}
    //       </div>
    //     </div>
    //   );
    // } else {
      return (
        <>
          <div className="msla-workflow-parameter-field">
            <Label styles={labelStyles} htmlFor={parameterDetails.defaultValue}>
              {'Resources.WORKFLOW_PARAMETER_DEFAULT_VALUE_TITLE'}
            </Label>
            <TextField
              id={parameterDetails.defaultValue}
              ariaLabel={'Resources.WORKFLOW_PARAMETER_DEFAULT_VALUE_TITLE'}
              placeholder={'Resources.WORKFLOW_PARAMETER_DEFAULT_VALUE_DESCRIPTION'}
              description={valueWarningMessage}
              value={defaultValue}
              errorMessage={errors[DEFAULT_VALUE_KEY]}
              styles={valueWarningMessage ? textFieldWithWarningStyles : textFieldStyles}
              onChange={this._onValueChange}
              onRenderDescription={valueWarningMessage ? this._onRenderDescription : undefined}
              disabled={isReadOnly}
            />
          </div>
          <div className="msla-workflow-parameter-field">
            <Label styles={labelStyles} htmlFor={parameterDetails.value}>
              {'Resources.WORKFLOW_PARAMETER_ACTUAL_VALUE_TITLE'}
            </Label>
            <TextField
              styles={disabledTextFieldStyles}
              id={parameterDetails.value}
              ariaLabel={'Resources.WORKFLOW_PARAMETER_ACTUAL_VALUE_TITLE'}
              type={isSecureParameter(type) ? 'password' : undefined}
              defaultValue={value}
              disabled
            />
          </div>
        </>
      );
    // }
  };

  private _renderReadOnlyParameters = (parameterDetails: ParameterFieldDetails): JSX.Element => {
    const { defaultValue, name, type } = this.state;

    return (
      <>
        <div className="msla-workflow-parameter-field">
          <Label styles={labelStyles} htmlFor={parameterDetails.name}>
            {"Resources.WORKFLOW_PARAMETER_NAME_TITLE"}
          </Label>
          <Text className="msla-workflow-parameter-read-only">{name}</Text>
        </div>
        <div className="msla-workflow-parameter-field">
          <Label styles={labelStyles} htmlFor={parameterDetails.type}>
            {"Resources.WORKFLOW_PARAMETER_TYPE_TITLE"}
          </Label>
          <Text className="msla-workflow-parameter-read-only">{type}</Text>
        </div>
        <div className="msla-workflow-parameter-value-field">
          <Label styles={labelStyles} htmlFor={parameterDetails.value}>
            {"Resources.WORKFLOW_PARAMETER_VALUE_TITLE"}
          </Label>
          <Text block className="msla-workflow-parameter-read-only">
            {defaultValue}
          </Text>
        </div>
      </>
    );
  };

  private _handleToggleExpand = (): void => {
    this.setState({ expanded: !this.state.expanded });
  };

  private _onRenderDescription = (props?: ITextFieldProps): JSX.Element => {
    return (
      <Text variant="small" styles={textStyles}>
        {props?.description}
      </Text>
    );
  };

  private _onRenderError = (error: string): JSX.Element => {
    const { isInverted } = this.state;
    const errorText: ITextStyles = {
      root: {
        color: isInverted ? 'red' : 'darkRed',
      },
    };
    return (
      <Text variant="small" styles={errorText}>
        {error}
      </Text>
    );
  };

  private _onTypeChange = (_event?: React.FormEvent<HTMLDivElement>, item?: IDropdownOption): void => {
    const { definition, onChange } = this.props;
    const { defaultValue } = this.state;
    const type = item?.key.toString();

    if (onChange) {
      onChange({
        id: definition.id,
        newDefinition: { ...definition, type },
      });
    }

    this.setState({
      type,
      valueWarningMessage: getValueWarningMessage(defaultValue, type),
    });
  };

  private _onNameChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    this.setState({ name: newValue });

    const { definition, onChange } = this.props;
    if (onChange) {
      onChange({
        id: definition.id,
        newDefinition: { ...definition, name: newValue },
      });
    }
  };

  private _onValueChange = (_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
    this._handleContentChange(newValue);
  };

//   private _onContentChange = (e: EditorContentChangedEventArgs): void => {
//     this._handleContentChange(e.value);
//   };

  private _handleContentChange(value?: string) {
    const { definition, onChange } = this.props;
    const { type } = this.state;

    this.setState({
      [DEFAULT_VALUE_KEY]: value,
      valueWarningMessage: getValueWarningMessage(value, type),
    });

    if (onChange) {
      onChange({
        id: definition.id,
        newDefinition: { ...definition, defaultValue: value },
      });
    }
  }

  private _onDelete = (e: React.MouseEvent<HTMLButtonElement>): void => {
    const {
      definition: { id },
      onDelete,
    } = this.props;
    if (onDelete) {
      e.stopPropagation();
      onDelete({ id });
    }
  };

  private _onEdit = (): void => {
    this.setState({ isEditable: true, expanded: true });
  };
}

function getParameterTypeKey(type?: string): string | undefined {
  switch (type?.toLowerCase()) {
    case Constants.WORKFLOW_PARAMETER_TYPE.FLOAT:
      return Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.FLOAT;
    case Constants.WORKFLOW_PARAMETER_TYPE.INT:
      return Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.INT;
    case Constants.WORKFLOW_PARAMETER_TYPE.BOOL:
      return Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.BOOL;
    case Constants.WORKFLOW_PARAMETER_TYPE.SECURE_STRING:
      return Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.SECURE_STRING;
    case Constants.WORKFLOW_PARAMETER_TYPE.STRING:
      return Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.STRING;
    case Constants.WORKFLOW_PARAMETER_TYPE.ARRAY:
      return Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.ARRAY;
    case Constants.WORKFLOW_PARAMETER_TYPE.OBJECT:
      return Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.OBJECT;
    case Constants.WORKFLOW_PARAMETER_TYPE.SECURE_OBJECT:
      return Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.SECURE_OBJECT;
    default:
      return undefined;
  }
}

function isSecureParameter(type?: string): boolean {
  return equals(type, Constants.WORKFLOW_PARAMETER_TYPE.SECURE_STRING) || equals(type, Constants.WORKFLOW_PARAMETER_TYPE.SECURE_OBJECT);
}

function getValueWarningMessage(value?: string, type?: string): string | undefined {
  return isSecureParameter(type) && !!value ? format('Resources.WORKFLOW_PARAMETER_SECURE_PARAMETER_WARNING_MESSAGE', type) : undefined;
}

interface DeleteButtonProps {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

const deleteButtonStyles: IButtonStyles = {
  root: {
    alignSelf: 'flex-end',
    margin: 0,
  },
};

const deleteIcon: IIconProps = {
  iconName: 'Delete',
  styles: {
    root: {
      color: '#3AA0F3',
    },
  },
};

const editIcon: IIconProps = {
  iconName: 'Edit',
  styles: {
    root: {
      color: '#3AA0F3',
    },
  },
};

function DeleteButton({ onClick }: DeleteButtonProps): JSX.Element {
  const componentRef = React.useRef<IButton>(null);
  const [target, setTarget] = React.useState<Element>();

  React.useEffect(() => {
    setTarget(findDOMNode(componentRef.current as unknown as React.ReactInstance) as Element);
  }, []);

  return (
    <TooltipHost calloutProps={{ target }} content={'Resources.WORKFLOW_PARAMETER_DELETE_TITLE'}>
      <IconButton
        ariaLabel={'Resources.WORKFLOW_PARAMETER_DELETE_TITLE'}
        componentRef={componentRef}
        iconProps={deleteIcon}
        styles={deleteButtonStyles}
        onClick={onClick}
      />
    </TooltipHost>
  );
}

function EditButton({ onClick }: DeleteButtonProps): JSX.Element {
  const componentRef = React.useRef<IButton>(null);
  const [target, setTarget] = React.useState<Element>();

  React.useEffect(() => {
    setTarget(findDOMNode(componentRef.current as unknown as React.ReactInstance) as Element);
  }, []);

  return (
    <TooltipHost calloutProps={{ target }} content={'Resources.WORKFLOW_PARAMETER_EDIT_TITLE'}>
      <IconButton
        ariaLabel={'Resources.WORKFLOW_PARAMETER_EDIT_TITLE'}
        componentRef={componentRef}
        iconProps={editIcon}
        styles={deleteButtonStyles}
        onClick={onClick}
      />
    </TooltipHost>
  );
}
