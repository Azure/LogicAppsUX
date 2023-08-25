import constants from '../../constants';
import type { DynamicallyAddedParameterProps, DynamicallyAddedParameterTypeType } from '../../dynamicallyaddedparameter';
import { DynamicallyAddedParameter, DynamicallyAddedParameterType } from '../../dynamicallyaddedparameter';
import { generateDynamicParameterKey, getIconForDynamicallyAddedParameterType } from '../../dynamicallyaddedparameter/helper';
import type { ValueSegment } from '../../editor';
import type { BasePlugins, ChangeHandler, ChangeState, GetTokenPickerHandler } from '../../editor/base';
import type { TokenPickerButtonEditorProps } from '../../editor/base/plugins/tokenpickerbutton';
import { StringEditor } from '../../editor/string';
import type { FloatingActionMenuItem } from '../floatingactionmenubase';
import { FloatingActionMenuBase } from '../floatingactionmenubase';
import { clone, ValidationErrorCode, ValidationException } from '@microsoft/utils-logic-apps';
import React from 'react';
import { useIntl } from 'react-intl';

type DynamicallyAddedParameterOutputsProperties = {
  type: string;
  title: string;
  format?: string;
  'x-ms-content-hint': DynamicallyAddedParameterTypeType;
  'x-ms-dynamically-added': boolean;
};

export type FloatingActionMenuOutputViewModel = {
  schema: {
    type: string;
    properties: Record<string, DynamicallyAddedParameterOutputsProperties>;
  };
  outputValueSegmentsMap: Record<string, ValueSegment[] | undefined>;
};

type FloatingActionMenuOutputsProps = {
  supportedTypes: string[];
  initialValue: ValueSegment[];
  onChange?: ChangeHandler;
  editorViewModel: FloatingActionMenuOutputViewModel;
  BasePlugins: BasePlugins;
  tokenPickerButtonProps: TokenPickerButtonEditorProps | undefined;
  getTokenPicker: GetTokenPickerHandler;
  hideValidationErrors: ChangeHandler | undefined;
};

export const FloatingActionMenuOutputs = (props: FloatingActionMenuOutputsProps): JSX.Element => {
  const intl = useIntl();

  if (!props.editorViewModel?.schema?.properties) {
    /**
     * Expects:
     *   schema: {
     *       type: 'object',
     *       properties: {},
     *   }
     */
    throw new ValidationException(ValidationErrorCode.INVALID_PARAMETERS, 'default value needed for floatingActionMenuOutputs.');
  }

  const onDynamicallyAddedParameterTitleChange = (schemaKey: string, newValue: string | undefined): void => {
    const { onChange } = props;
    if (onChange) {
      const viewModel = clone(props.editorViewModel);
      viewModel.schema.properties[schemaKey].title = newValue || '';
      onChange({ value: props.initialValue, viewModel });
    }
  };

  const onDynamicallyAddedParameterDelete = (schemaKey: string): void => {
    const { onChange } = props;
    if (onChange) {
      const viewModel = clone(props.editorViewModel);
      delete viewModel.schema.properties[schemaKey];
      delete viewModel.outputValueSegmentsMap[schemaKey];
      onChange({ value: props.initialValue, viewModel });
    }
  };

  const onRenderValueField = (schemaKey: string): JSX.Element => {
    const placeholder = intl.formatMessage({
      defaultMessage: 'Enter a value to respond',
      description: 'Placeholder for output value field',
    });
    const onDynamicallyAddedParameterValueChange = (schemaKey: string, newValue: ValueSegment[]) => {
      const { onChange } = props;
      if (onChange) {
        const viewModel = clone(props.editorViewModel);
        viewModel.outputValueSegmentsMap[schemaKey] = newValue;
        onChange({ value: props.initialValue, viewModel });
      }
    };

    return (
      <StringEditor
        className="msla-setting-token-editor-container"
        placeholder={placeholder}
        BasePlugins={props.BasePlugins}
        readonly={false}
        initialValue={props.editorViewModel.outputValueSegmentsMap[schemaKey] || []}
        tokenPickerButtonProps={props.tokenPickerButtonProps}
        editorBlur={(newState: ChangeState) => onDynamicallyAddedParameterValueChange(schemaKey, newState.value)}
        getTokenPicker={props.getTokenPicker}
        onChange={props.hideValidationErrors}
        dataAutomationId={`msla-setting-token-editor-floatingActionMenuOutputs-${schemaKey}`}
      />
    );
  };

  const dynamicParameterProps: DynamicallyAddedParameterProps[] = Object.entries(props.editorViewModel.schema.properties)
    .filter(([_key, config]) => {
      return config['x-ms-dynamically-added'];
    })
    .map(([key, config]) => {
      return {
        schemaKey: key,
        icon: getIconForDynamicallyAddedParameterType(config['x-ms-content-hint']),
        title: config.title,
        onTitleChange: onDynamicallyAddedParameterTitleChange,
        onDelete: onDynamicallyAddedParameterDelete,
        onRenderValueField,
      };
    });

  const onMenuItemSelected = (item: FloatingActionMenuItem): void => {
    const { onChange } = props;
    if (onChange) {
      const viewModel = clone(props.editorViewModel);

      const schemaKey = generateDynamicParameterKey(Object.keys(viewModel.schema.properties), item.type);

      let format = undefined;
      let type = '';
      switch (item.type) {
        case DynamicallyAddedParameterType.Date:
        case DynamicallyAddedParameterType.Email:
          type = constants.SWAGGER.TYPE.STRING;
          format = item.type.toLowerCase();
          break;
        case DynamicallyAddedParameterType.Text:
          type = constants.SWAGGER.TYPE.STRING;
          break;
        case DynamicallyAddedParameterType.File:
          type = constants.SWAGGER.TYPE.OBJECT;
          format = constants.SWAGGER.FORMAT.BYTE;
          break;
        case DynamicallyAddedParameterType.Boolean:
          type = constants.SWAGGER.TYPE.BOOLEAN;
          break;
        case DynamicallyAddedParameterType.Number:
          type = constants.SWAGGER.TYPE.NUMBER;
          break;
      }
      viewModel.schema.properties[schemaKey] = {
        title: '',
        type,
        format,
        'x-ms-content-hint': item.type,
        'x-ms-dynamically-added': true,
      };

      onChange({ value: props.initialValue, viewModel });
    }
  };

  const collapsedTitle = intl.formatMessage({
    defaultMessage: 'Add an output    asdasdasd',
    description: 'Button to add a dynamically added parameter',
  });
  const expandedTitle = intl.formatMessage({
    defaultMessage: 'Choose the type of output',
    description: 'Button to choose data type of the dynamically added parameter',
  });

  return (
    <FloatingActionMenuBase
      supportedTypes={props.supportedTypes}
      collapsedTitle={collapsedTitle}
      expandedTitle={expandedTitle}
      onMenuItemSelected={onMenuItemSelected}
    >
      {dynamicParameterProps.map((props) => (
        <DynamicallyAddedParameter {...props} key={props.schemaKey} />
      ))}
    </FloatingActionMenuBase>
  );
};
