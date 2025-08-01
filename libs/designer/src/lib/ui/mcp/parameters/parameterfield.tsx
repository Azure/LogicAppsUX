import type { ChangeState } from '@microsoft/designer-ui';
import { Label, Button, mergeClasses, RadioGroup, Radio, Field, type RadioGroupProps, InfoLabel, Text } from '@fluentui/react-components';
import { Delete16Regular } from '@fluentui/react-icons';
import { useCallback, useMemo } from 'react';
import { useEditOperationStyles } from './styles';
import type { ParameterInfo } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { ParameterEditor } from './ParameterEditor';
import constants from '../../../common/constants';
import { parameterHasValue, updateParameterAndDependencies } from '../../../core/utils/parameters/helper';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { createLiteralValueSegment } from '../../../core/utils/parameters/segment';

export type McpParameterInputType = 'model' | 'user';

interface ParameterFieldProps {
  operationId: string;
  groupId: string;
  parameter: ParameterInfo;
  parameterInputType: McpParameterInputType;
  parameterError: string | undefined;
  disableInputTypeChange?: boolean;
  isConditional?: boolean;
  onParameterVisibilityUpdate: () => void;
  onParameterInputTypeChange: (parameterId: string, newType: McpParameterInputType) => void;
  handleRemoveConditionalParameter: (parameterId: string) => void;
  removeParameterError: (parameterId: string) => void;
}

export const ParameterField = ({
  operationId,
  groupId,
  parameter,
  isConditional,
  disableInputTypeChange = false,
  onParameterVisibilityUpdate,
  parameterInputType,
  onParameterInputTypeChange,
  handleRemoveConditionalParameter,
  parameterError,
  removeParameterError,
}: ParameterFieldProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useEditOperationStyles();

  const { operationInfo, reference, nodeInputs, dependencies } = useSelector((state: RootState) => ({
    operationInfo: state.operations.operationInfo[operationId],
    reference: state.connection.connectionReferences[state.connection.connectionsMapping[operationId] ?? ''],
    nodeInputs: state.operations.inputParameters[operationId],
    dependencies: state.operations.dependencies[operationId],
  }));

  const INTL_TEXT = {
    removeParamText: intl.formatMessage({
      id: '5E66mK',
      defaultMessage: 'Remove parameter',
      description: 'Tooltip for remove parameter button',
    }),
    modelRadioText: intl.formatMessage({
      id: 'LNA+DZ',
      defaultMessage: 'Model',
      description: 'Label for parameter to use model input type',
    }),
    userRadioText: intl.formatMessage({
      id: 'gOWYv9',
      defaultMessage: 'User',
      description: 'Label for parameter to use user input type',
    }),
    inputLabelText: intl.formatMessage({
      id: 'gwYMqA',
      defaultMessage: 'Input',
      description: 'Label for input field in parameter editor radio button section',
    }),
  };

  const onHandleRemoveError = useCallback(() => {
    removeParameterError(parameter.id as string);
  }, [parameter.id, removeParameterError]);

  const isLargeParameter = useMemo(() => {
    const editor = parameter.editor?.toLowerCase();
    return (
      editor === constants.EDITOR.ARRAY ||
      editor === constants.EDITOR.DICTIONARY ||
      editor === constants.EDITOR.HTML ||
      editor === constants.EDITOR.TABLE
    );
  }, [parameter.editor]);

  const onParameterValueChange = useCallback(
    (newState: ChangeState) => {
      const { value: newValueSegments, viewModel } = newState;
      const propertiesToUpdate = { value: newValueSegments, preservedValue: undefined } as Partial<ParameterInfo>;

      if (viewModel !== undefined) {
        propertiesToUpdate.editorViewModel = viewModel;
      }

      const nodeId = operationId;
      const parameterId = parameter.id as string;

      if (parameterHasValue(propertiesToUpdate as ParameterInfo)) {
        onHandleRemoveError();
      }

      dispatch(
        updateParameterAndDependencies({
          nodeId,
          groupId,
          parameterId,
          properties: propertiesToUpdate,
          isTrigger: false,
          operationInfo,
          connectionReference: reference,
          nodeInputs,
          dependencies,
          updateTokenMetadata: false,
        })
      );

      onParameterVisibilityUpdate();
    },
    [
      dispatch,
      operationId,
      groupId,
      parameter.id,
      operationInfo,
      reference,
      nodeInputs,
      dependencies,
      onParameterVisibilityUpdate,
      onHandleRemoveError,
    ]
  );

  const handleSelectionChange: RadioGroupProps['onChange'] = (_, data) => {
    onParameterInputTypeChange(parameter.id, data.value as McpParameterInputType);
    // Reset parameter value when model is selected
    if (data.value === 'model') {
      onHandleRemoveError();
      onParameterValueChange({
        value: [createLiteralValueSegment('')],
      });
    }
  };

  return (
    <div className={styles.parameterField}>
      <div className={styles.parameterLabelSection}>
        <InfoLabel className={styles.parameterLabel} info={parameter.placeholder}>
          {parameter.label}
        </InfoLabel>
        {isConditional && (
          <Button
            appearance="subtle"
            size="small"
            icon={<Delete16Regular />}
            onClick={() => handleRemoveConditionalParameter(parameter.id)}
            title={INTL_TEXT.removeParamText}
            className={styles.removeParameterButton}
          />
        )}
      </div>
      <div className={styles.parameterBodySection}>
        <Field className={styles.parameterInputType}>
          <Label className={styles.parameterInputTypeLabel} size={'small'}>
            {INTL_TEXT.inputLabelText}
          </Label>
          <RadioGroup layout="horizontal" disabled={disableInputTypeChange} value={parameterInputType} onChange={handleSelectionChange}>
            <Radio
              value={'model'}
              key={'model'}
              label={
                <Label className={styles.parameterInputTypeLabel} size={'small'}>
                  {INTL_TEXT.modelRadioText}
                </Label>
              }
            />
            <Radio
              value={'user'}
              key={'user'}
              label={
                <Label className={styles.parameterInputTypeLabel} size={'small'}>
                  {INTL_TEXT.userRadioText}
                </Label>
              }
            />
          </RadioGroup>
        </Field>
        {parameterInputType === 'user' && (
          <div className={mergeClasses(styles.parameterValueSection, isLargeParameter && styles.largeParameterSection)}>
            <ParameterEditor
              operationId={operationId}
              groupId={groupId}
              parameter={parameter}
              onParameterVisibilityUpdate={onParameterVisibilityUpdate}
              onParameterValueChange={onParameterValueChange}
            />
          </div>
        )}
        {parameterError && (
          <Text className={styles.validationErrorText} size={200}>
            {parameterError}
          </Text>
        )}
      </div>
    </div>
  );
};
