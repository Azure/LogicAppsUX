import { Text, Textarea, Field, tokens, Button } from '@fluentui/react-components';
import type { RootState, AppDispatch } from '../../../core/state/mcp/store';
import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useMemo, useRef } from 'react';
import { useEditOperationStyles } from './styles';
import { isUndefinedOrEmptyString, type ParameterInfo } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { SEARCHABLE_DROPDOWN_SELECT_ALL_KEY, SearchableDropdown, type SearchableDropdownOption } from '@microsoft/designer-ui';
import { updateParameterConditionalVisibility } from '../../../core/state/operation/operationMetadataSlice';
import { getGroupIdFromParameterId } from '../../../core/utils/parameters/helper';
import { type McpParameterInputType, ParameterField } from './parameterfield';
import { DismissCircle20Filled } from '@fluentui/react-icons';
import { useMcpWizardStyles } from '../wizard/styles';
import { DescriptionWithLink, ErrorBar } from '../../configuretemplate/common';
import { isDependentStaticParameter } from '../../../core/mcp/utils/helper';
import { useOperationDynamicInputsError } from '../../../core/state/operation/operationSelector';

interface EditOperationProps {
  description: string;
  handleDescriptionInputChange: (description: string) => void;
  onParameterVisibilityUpdate: () => void;
  userInputParamIds: Record<string, boolean>;
  setUserInputParamIds: (ids: Record<string, boolean>) => void;
  parameterErrors: Record<string, string | undefined>;
  setParameterErrors: (errors: Record<string, string | undefined>) => void;
}

export const EditOperation = ({
  description,
  handleDescriptionInputChange,
  onParameterVisibilityUpdate,
  userInputParamIds,
  setUserInputParamIds,
  parameterErrors,
  setParameterErrors,
}: EditOperationProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useEditOperationStyles();
  const otherStyles = useMcpWizardStyles();

  // Track the order in which parameters are selected to maintain display order
  const selectionOrderRef = useRef<Map<string, number>>(new Map());
  const nextOrderRef = useRef<number>(1);

  const { selectedOperationId, operationInfos, inputParameters, dependencies } = useSelector((state: RootState) => ({
    selectedOperationId: state.mcpSelection.selectedOperationId,
    operationInfos: state.operations.operationInfo,
    inputParameters: state.operations.inputParameters,
    dependencies: state.operations.dependencies,
  }));

  const operationInfo = useMemo(
    () => (selectedOperationId ? operationInfos[selectedOperationId] : null),
    [selectedOperationId, operationInfos]
  );
  const parameters = useMemo(
    () => (selectedOperationId ? inputParameters[selectedOperationId] : null),
    [selectedOperationId, inputParameters]
  );
  const inputDependencies = useMemo(
    () => (selectedOperationId ? (dependencies[selectedOperationId].inputs ?? {}) : {}),
    [selectedOperationId, dependencies]
  );
  const dynamicInputsError = useOperationDynamicInputsError(selectedOperationId);

  const handleParameterInputTypeChange = useCallback(
    (parameterId: string, newType: McpParameterInputType) => {
      const updated = { ...userInputParamIds };
      if (newType === 'user') {
        updated[parameterId] = true;
      } else {
        delete updated[parameterId];
      }
      onParameterVisibilityUpdate();
      setUserInputParamIds(updated);
    },
    [userInputParamIds, setUserInputParamIds, onParameterVisibilityUpdate]
  );

  const { requiredParams, visibleConditionalParams, optionalDropdownOptions, allConditionalSettings, conditionallyInvisibleSettings } =
    useMemo(() => {
      if (!parameters?.parameterGroups) {
        return {
          requiredParams: [],
          visibleConditionalParams: [],
          optionalDropdownOptions: [],
          allConditionalSettings: [],
          conditionallyInvisibleSettings: [],
        };
      }

      const requiredParams: Array<{ groupId: string; param: ParameterInfo; isConditional: boolean }> = [];
      const visibleConditionalParamsUnsorted: Array<{ groupId: string; param: ParameterInfo; isConditional: boolean }> = [];
      const dropdownOptions: SearchableDropdownOption[] = [];
      const allConditional: ParameterInfo[] = [];
      const invisible: ParameterInfo[] = [];
      const orderMap = new Map<string, number>();

      // First pass: collect all data
      for (const [groupId, group] of Object.entries(parameters.parameterGroups)) {
        const nonHiddenParameters = group.parameters.filter((param) => !param.hideInUI);
        for (const param of nonHiddenParameters) {
          if (param.required) {
            requiredParams.push({ groupId, param, isConditional: false });
          } else {
            allConditional.push(param);

            if (param.conditionalVisibility === true) {
              visibleConditionalParamsUnsorted.push({ groupId, param, isConditional: true });
              // If this parameter doesn't have a selection order yet, it might be pre-existing
              if (!selectionOrderRef.current.has(param.id)) {
                selectionOrderRef.current.set(param.id, nextOrderRef.current++);
              }
              orderMap.set(param.id, selectionOrderRef.current.get(param.id) || 0);
            } else {
              invisible.push(param);
              dropdownOptions.push({
                key: param.id,
                text: param.label ?? param.parameterName,
                data: { groupId, param },
              });
            }
          }
        }
      }

      // Sort dropdown options alphabetically by text
      dropdownOptions.sort((a, b) => (a.text || '').localeCompare(b.text || ''));

      // Sort visible conditional params by their selection order (preserve order they were selected)
      const visibleConditionalParams = visibleConditionalParamsUnsorted.sort((a, b) => {
        const orderA = orderMap.get(a.param.id) || 0;
        const orderB = orderMap.get(b.param.id) || 0;
        return orderA - orderB;
      });

      return {
        requiredParams,
        visibleConditionalParams,
        optionalDropdownOptions: dropdownOptions,
        allConditionalSettings: allConditional,
        conditionallyInvisibleSettings: invisible,
      };
    }, [parameters]);

  const INTL_TEXT = {
    noOperationSelected: intl.formatMessage({
      id: 'TBagKD',
      defaultMessage: 'No operation selected',
      description: 'Message displayed when no operation is selected in the edit operation panel',
    }),
    parameters: intl.formatMessage({
      id: 'CCpPpu',
      defaultMessage: 'Parameters',
      description: 'Title for the parameters section',
    }),
    parametersSectionDescription: intl.formatMessage({
      id: 'ieY/P+',
      defaultMessage:
        "If available, default parameters specify the minimum inputs for this task. You can add any optional parameters for your scenario. By default, parameters get dynamic values from the AI model, but you can choose to enter static values instead.",
      description: 'Description for the parameters section',
    }),
    parametersSectionLinkText: intl.formatMessage({
      id: '7MP7FJ',
      defaultMessage: 'How do values resolve at runtime?',
      description: 'Link text for learning more about tool parameters',
    }),
    defaultParameters: intl.formatMessage({
      id: 'koft/j',
      defaultMessage: 'Default parameters',
      description: 'Title for the default parameters section',
    }),
    optionalParameters: intl.formatMessage({
      id: 'VQ1BxQ',
      defaultMessage: 'Optional parameters',
      description: 'Label for the section to configure optional parameters',
    }),
    selectParameters: intl.formatMessage({
      id: '1h43JZ',
      defaultMessage: 'Select parameters',
      description: 'Label for the dropdown to select parameters',
    }),
    descriptionLabel: intl.formatMessage({
      id: 'LLJrOT',
      defaultMessage: 'Description',
      description: 'Label for the operation description field',
    }),
    descriptionSectionDescription: intl.formatMessage({
      id: 'Al+oyj',
      defaultMessage: 'Provide the purpose for this task.',
      description: 'Description for the operation description field',
    }),
    descriptionPlaceholder: intl.formatMessage({
      id: 'X1TOAH',
      defaultMessage: 'Enter operation description',
      description: 'Placeholder text for operation description field',
    }),
    noParametersMessage: intl.formatMessage({
      id: '5G/VKd',
      defaultMessage: "This action doesn't have parameters that need setup.",
      description: 'Message displayed when there are no parameters configured for the operation',
    }),
    modified: intl.formatMessage({
      id: 'ZHmzsA',
      defaultMessage: 'Modified',
      description: 'Badge text for modified state',
    }),
    saved: intl.formatMessage({
      id: 'kuMOqt',
      defaultMessage: 'Saved',
      description: 'Badge text for saved state',
    }),
    optionalParametersDescription: intl.formatMessage({
      id: 'JmYArJ',
      defaultMessage: 'Add optional parameters you want the MCP server to expose.',
      description: 'Description text for optional parameters section when no parameters are visible',
    }),
    optionalParametersLabel: intl.formatMessage({
      id: '3qDalD',
      defaultMessage: 'Add optional parameters',
      description: 'Label for adding new optional parameters in the dropdown',
    }),
    optionalParametersPlaceholder: intl.formatMessage({
      id: 'TpWNAE',
      defaultMessage: 'Select a parameter',
      description: 'Placeholder text for adding new optional parameters in the dropdown',
    }),
    optionalParametersDescriptionWithParams: intl.formatMessage({
      id: 'Met0rU',
      defaultMessage: 'Add more available parameters for this tool to use.',
      description: 'Description text for optional parameters section when parameters are already visible',
    }),
    learnMore: intl.formatMessage({
      id: 'izS5yQ',
      defaultMessage: 'Learn more',
      description: 'Learn more link text',
    }),
    removeAllParameters: intl.formatMessage({
      id: 'd43IU6',
      defaultMessage: 'Remove all',
      description: 'Button text to remove all optional parameters',
    }),
    parametersAdded: intl.formatMessage({
      id: 'iOZv39',
      defaultMessage: 'Parameters Added:',
      description: 'Label showing count of added optional parameters',
    }),
    parametersErrorTitle: intl.formatMessage({
      id: 'IjoW0x',
      defaultMessage: 'Dynamic Parameters',
      description: 'Title for dynamic inputs error message',
    }),
  };
  const handleOptionalParameterToggle = useCallback(
    (parameterId: string, isVisible: boolean) => {
      if (!selectedOperationId || !parameters?.parameterGroups) {
        return;
      }

      // Skip the Select All option - it's just for UI purposes
      if (parameterId === SEARCHABLE_DROPDOWN_SELECT_ALL_KEY) {
        return;
      }

      const parameterGroupId = getGroupIdFromParameterId(parameters, parameterId);
      if (!parameterGroupId) {
        return;
      }

      // Track selection order for newly visible parameters
      if (isVisible && !selectionOrderRef.current.has(parameterId)) {
        selectionOrderRef.current.set(parameterId, nextOrderRef.current++);
      }

      // Remove from selection order when hiding parameter
      if (!isVisible) {
        selectionOrderRef.current.delete(parameterId);
      }

      onParameterVisibilityUpdate();
      dispatch(
        updateParameterConditionalVisibility({
          nodeId: selectedOperationId,
          groupId: parameterGroupId,
          parameterId,
          value: isVisible,
        })
      );
    },
    [dispatch, selectedOperationId, parameters, onParameterVisibilityUpdate]
  );

  const handleRemoveConditionalParameter = useCallback(
    (parameterId: string) => {
      handleOptionalParameterToggle(parameterId, false);
    },
    [handleOptionalParameterToggle]
  );

  const removeParameterError = useCallback(
    (parameterId: string) => {
      setParameterErrors({ ...parameterErrors, [parameterId]: undefined });
    },
    [setParameterErrors, parameterErrors]
  );

  const parameterHasErrors = useMemo(
    () => Object.values(parameterErrors).some((error) => !isUndefinedOrEmptyString(error)),
    [parameterErrors]
  );
  const handleRemoveAllParameters = useCallback(() => {
    // Remove all visible conditional parameters
    visibleConditionalParams.forEach(({ param }) => {
      handleOptionalParameterToggle(param.id, false);
    });
  }, [visibleConditionalParams, handleOptionalParameterToggle]);

  if (!operationInfo || !selectedOperationId) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyParametersCard}>
          <Text className={styles.emptyParametersText}>{INTL_TEXT.noOperationSelected}</Text>
        </div>
      </div>
    );
  }

  const hasRequiredParameters = requiredParams.length > 0;
  const hasOptionalParameters = optionalDropdownOptions.length > 0;
  const hasVisibleConditionalParameters = visibleConditionalParams.length > 0;

  const addNewParamText = intl.formatMessage(
    {
      defaultMessage: 'Showing {countShowing} of {countTotal}',
      id: 'jTHUFb',
      description: 'Placeholder text for the number of advanced parameters showing',
    },
    {
      countShowing: allConditionalSettings.length - conditionallyInvisibleSettings.length,
      countTotal: allConditionalSettings.length,
    }
  );

  return (
    <div className={styles.container}>
      {/* Description Section */}
      <div className={otherStyles.section}>
        <div className={otherStyles.header}>
          <Text size={400} weight="semibold">
            {INTL_TEXT.descriptionLabel}
          </Text>
        </div>
        <DescriptionWithLink
          text={INTL_TEXT.descriptionSectionDescription}
          linkText={INTL_TEXT.learnMore}
          linkUrl="https://go.microsoft.com/fwlink/?linkid=2330414"
        />

        <Field className={styles.descriptionField} style={{ width: '100%' }}>
          <Textarea
            value={description}
            onChange={(_e, data) => handleDescriptionInputChange(data.value)}
            placeholder={INTL_TEXT.descriptionPlaceholder}
            rows={3}
            resize="vertical"
          />
        </Field>
      </div>

      {/* Parameters Section */}
      <div className={otherStyles.section}>
        <div className={otherStyles.header}>
          <Text size={400} weight="semibold">
            {INTL_TEXT.parameters}
          </Text>
          {parameterHasErrors && <DismissCircle20Filled color={tokens.colorStatusDangerForeground1} />}
        </div>
        <DescriptionWithLink
          text={INTL_TEXT.parametersSectionDescription}
          linkText={INTL_TEXT.parametersSectionLinkText}
          linkUrl="https://go.microsoft.com/fwlink/?linkid=2330613"
        />
        {dynamicInputsError ? <ErrorBar title={INTL_TEXT.parametersErrorTitle} errorMessage={dynamicInputsError} /> : null}
        <br />
        {hasRequiredParameters || hasOptionalParameters || hasVisibleConditionalParameters ? (
          <>
            {hasRequiredParameters && (
              <div className={otherStyles.section}>
                <Text size={400} weight="semibold">
                  {INTL_TEXT.defaultParameters}
                </Text>
                <div className={styles.parameterList}>
                  {requiredParams.map(({ param, groupId, isConditional }) => {
                    const isDependentParameter = isDependentStaticParameter(param, inputDependencies);
                    const parameterInputType = userInputParamIds[param.id] ? 'user' : 'model';

                    return (
                      <ParameterField
                        key={param.id}
                        operationId={selectedOperationId}
                        groupId={groupId}
                        parameter={param}
                        isConditional={isConditional}
                        disableInputTypeChange={isDependentParameter}
                        onParameterVisibilityUpdate={onParameterVisibilityUpdate}
                        parameterInputType={parameterInputType}
                        onParameterInputTypeChange={handleParameterInputTypeChange}
                        handleRemoveConditionalParameter={handleRemoveConditionalParameter}
                        parameterError={parameterErrors[param.id]}
                        removeParameterError={removeParameterError}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {allConditionalSettings?.length > 0 && (
              <div className={otherStyles.section} style={{ marginTop: '24px' }}>
                {/* Advanced Parameters Title and Description */}
                <div>
                  <Text weight="semibold" size={400} style={{ marginBottom: '8px', display: 'block' }}>
                    {INTL_TEXT.optionalParameters}
                  </Text>
                  <DescriptionWithLink
                    text={
                      hasVisibleConditionalParameters
                        ? INTL_TEXT.optionalParametersDescriptionWithParams
                        : INTL_TEXT.optionalParametersDescription
                    }
                    linkText={INTL_TEXT.learnMore}
                    linkUrl={hasVisibleConditionalParameters ? undefined : 'https://go.microsoft.com/fwlink/?linkid=2330508'}
                  />

                  <Field>
                    <div style={{ maxWidth: '400px' }}>
                      <SearchableDropdown
                        key={`dropdown-${selectedOperationId}-${optionalDropdownOptions.length}`}
                        searchPlaceholderText={INTL_TEXT.optionalParametersPlaceholder}
                        options={optionalDropdownOptions}
                        placeholder={addNewParamText}
                        multiselect={true}
                        showSelectAll={true}
                        onItemSelectionChanged={handleOptionalParameterToggle}
                      />
                    </div>
                  </Field>

                  {/* Parameters Added count and Remove All button */}
                  {hasVisibleConditionalParameters && (
                    <div className={styles.optionalParametersRow}>
                      <Text size={200}>
                        {INTL_TEXT.parametersAdded} {visibleConditionalParams.length}
                      </Text>
                      <Button appearance="subtle" size="small" onClick={handleRemoveAllParameters} style={{ fontSize: '12px' }}>
                        {INTL_TEXT.removeAllParameters}
                      </Button>
                    </div>
                  )}
                </div>

                {hasVisibleConditionalParameters && (
                  <div className={styles.parameterList}>
                    {visibleConditionalParams.map(({ param, groupId, isConditional }) => {
                      const isDependentParameter = isDependentStaticParameter(param, inputDependencies);
                      const parameterInputType = userInputParamIds[param.id] ? 'user' : 'model';

                      return (
                        <ParameterField
                          key={param.id}
                          operationId={selectedOperationId}
                          groupId={groupId}
                          parameter={param}
                          isConditional={isConditional}
                          disableInputTypeChange={isDependentParameter}
                          onParameterVisibilityUpdate={onParameterVisibilityUpdate}
                          parameterInputType={parameterInputType}
                          onParameterInputTypeChange={handleParameterInputTypeChange}
                          handleRemoveConditionalParameter={handleRemoveConditionalParameter}
                          parameterError={parameterErrors[param.id]}
                          removeParameterError={removeParameterError}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className={styles.emptyParametersCard}>
            <Text className={styles.emptyParametersText}>{INTL_TEXT.noParametersMessage}</Text>
          </div>
        )}
      </div>
    </div>
  );
};
