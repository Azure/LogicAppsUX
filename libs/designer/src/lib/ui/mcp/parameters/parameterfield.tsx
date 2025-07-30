import type { ChangeState } from '@microsoft/designer-ui';
import { Label, Button, mergeClasses, RadioGroup, Radio, Field, type RadioGroupProps } from '@fluentui/react-components';
import { Dismiss16Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEditOperationStyles } from './styles';
import type { ParameterInfo } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { ParameterEditor } from './ParameterEditor';
import constants from '../../../common/constants';
import {
  parameterHasValue,
  updateParameterAndDependencies,
  type UpdateParameterAndDependenciesPayload,
} from '../../../core/utils/parameters/helper';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { updateNodeParameters, type UpdateParametersPayload } from '../../../core/state/operation/operationMetadataSlice';

type InputType = 'model' | 'user';

export const ParameterField = ({
  operationId,
  groupId,
  parameter,
  isConditional,
  onParameterVisibilityUpdate,
  handleRemoveConditionalParameter,
}: {
  operationId: string;
  groupId: string;
  parameter: ParameterInfo;
  isConditional?: boolean;
  onParameterVisibilityUpdate: () => void;
  handleRemoveConditionalParameter: (parameterId: string) => void;
}) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useEditOperationStyles();

  const { operationInfo, reference, nodeInputs, dependencies } = useSelector((state: RootState) => ({
    operationInfo: state.operations.operationInfo[operationId],
    reference: state.connection.connectionReferences[state.connection.connectionsMapping[operationId] ?? ''],
    nodeInputs: state.operations.inputParameters[operationId],
    dependencies: state.operations.dependencies[operationId],
  }));

  const [inputType, setInputType] = useState<InputType>(parameterHasValue(parameter) ? 'model' : 'user');

  useEffect(() => {
    setInputType(parameterHasValue(parameter) ? 'model' : 'user');
  }, [parameter]);

  const parameterHasErrors = useMemo(() => parameter?.validationErrors?.some(Boolean), [parameter.validationErrors]);

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

      const hasValue = parameterHasValue(propertiesToUpdate as ParameterInfo);
      const toRemoveValidationErrors = parameterHasErrors && (inputType === 'model' || hasValue);
      if (toRemoveValidationErrors) {
        propertiesToUpdate.validationErrors = [];
      }

      const updateParameterAndDependencyPayload: UpdateParameterAndDependenciesPayload = {
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
      };

      dispatch(updateParameterAndDependencies(updateParameterAndDependencyPayload));

      const updateParametersPayload: UpdateParametersPayload = {
        nodeId,
        parameters: [
          {
            groupId,
            parameterId,
            propertiesToUpdate: { value: newValueSegments },
          },
        ],
        isUserAction: true,
      };
      dispatch(updateNodeParameters(updateParametersPayload));

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
      inputType,
      parameterHasErrors,
    ]
  );

  const handleSelectionChange: RadioGroupProps['onChange'] = (_, data) => {
    setInputType(data.value as InputType);
    // Reset parameter value when model is selected
    if (data.value === 'model') {
      onParameterValueChange({ value: [], viewModel: { hideErrorMessage: true } });
      //TODO: remove validation errors.
    }
  };

  return (
    <div className={styles.parameterField}>
      <Label className={styles.parameterLabel} required={parameter.required} title={parameter.label}>
        {parameter.label}
      </Label>
      <Field label={INTL_TEXT.inputLabelText} hint={parameter.placeholder}>
        <RadioGroup layout="horizontal" value={inputType} onChange={handleSelectionChange}>
          <Radio value={'model'} key={'model'} label={INTL_TEXT.modelRadioText} />
          <Radio value={'user'} key={'user'} label={INTL_TEXT.userRadioText} />
        </RadioGroup>
      </Field>
      <div className={mergeClasses(styles.parameterValueSection, isLargeParameter && styles.largeParameterSection)}>
        <ParameterEditor
          operationId={operationId}
          groupId={groupId}
          parameter={parameter}
          onParameterVisibilityUpdate={onParameterVisibilityUpdate}
          onParameterValueChange={onParameterValueChange}
        />
        {isConditional && (
          <Button
            appearance="subtle"
            size="small"
            icon={<Dismiss16Regular />}
            onClick={() => handleRemoveConditionalParameter(parameter.id)}
            title={INTL_TEXT.removeParamText}
            className={styles.removeParameterButton}
          />
        )}
      </div>
    </div>
  );
};
