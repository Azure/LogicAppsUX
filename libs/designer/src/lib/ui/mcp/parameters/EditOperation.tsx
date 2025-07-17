import {
  Text,
  Textarea,
  Field,
  Divider,
  Card,
  Label,
  Button,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
} from '@fluentui/react-components';
import { Dismiss16Regular } from '@fluentui/react-icons';
import type { RootState, AppDispatch } from '../../../core/state/mcp/store';
import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEditOperationStyles } from './styles';
import type { ParameterInfo, ValueSegment } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import type { SearchableDropdownOption } from '@microsoft/designer-ui';
import { SearchableDropdownWithAddAll, StringEditor } from '@microsoft/designer-ui';
import {
  updateNodeParameters,
  updateOperationDescription,
  updateParameterConditionalVisibility,
  type UpdateParametersPayload,
} from '../../../core/state/operation/operationMetadataSlice';
import { getGroupIdFromParameterId } from '../../../core/utils/parameters/helper';

export const EditOperation = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useEditOperationStyles();

  const [localDescription, setLocalDescription] = useState<string>('');

  const { selectedOperationId, operationInfos, operationMetadata, inputParameters } = useSelector((state: RootState) => ({
    selectedOperationId: state.connector.selectedOperationId,
    operationInfos: state.operation.operationInfo,
    operationMetadata: state.operation.operationMetadata,
    inputParameters: state.operation.inputParameters,
  }));

  const operationInfo = selectedOperationId ? operationInfos[selectedOperationId] : null;
  const metadata = selectedOperationId ? operationMetadata[selectedOperationId] : null;
  const parameters = selectedOperationId ? inputParameters[selectedOperationId] : null;

  useEffect(() => {
    if (metadata) {
      setLocalDescription(metadata.description ?? '');
    } else {
      setLocalDescription('');
    }
  }, [metadata, metadata?.description, selectedOperationId]);

  const {
    allVisibleParameters,
    requiredParams,
    visibleConditionalParams,
    optionalDropdownOptions,
    allConditionalSettings,
    conditionallyInvisibleSettings,
  } = useMemo(() => {
    if (!parameters?.parameterGroups) {
      return {
        allVisibleParameters: [],
        requiredParams: [],
        visibleConditionalParams: [],
        optionalDropdownOptions: [],
        allConditionalSettings: [],
        conditionallyInvisibleSettings: [],
      };
    }

    const requiredParams: Array<{ groupId: string; param: ParameterInfo; isConditional: boolean }> = [];
    const visibleConditionalParams: Array<{ groupId: string; param: ParameterInfo; isConditional: boolean }> = [];
    const dropdownOptions: SearchableDropdownOption[] = [];
    const allConditional: ParameterInfo[] = [];
    const invisible: ParameterInfo[] = [];

    Object.entries(parameters.parameterGroups).forEach(([groupId, group]) => {
      group.parameters.forEach((param) => {
        if (param.required) {
          requiredParams.push({ groupId, param, isConditional: false });
        } else {
          allConditional.push(param);

          if (param.conditionalVisibility === true) {
            visibleConditionalParams.push({ groupId, param, isConditional: true });
          } else {
            invisible.push(param);
            dropdownOptions.push({
              key: param.id,
              text: param.label ?? param.parameterName,
              data: { groupId, param },
            });
          }
        }
      });
    });

    const allVisible = [...requiredParams, ...visibleConditionalParams];

    return {
      allVisibleParameters: allVisible,
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
    required: intl.formatMessage({
      id: 'WQT8jf',
      defaultMessage: 'Required',
      description: 'Title for the required section',
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
    showAllOptional: intl.formatMessage({
      id: 'EgGZJG',
      defaultMessage: 'Show All',
      description: 'Button text to show all optional parameters',
    }),
    hideAllOptional: intl.formatMessage({
      id: 'qwjHE8',
      defaultMessage: 'Hide All',
      description: 'Button text to hide all optional parameters',
    }),
    showAllOptionalTooltip: intl.formatMessage({
      id: 'H7xM88',
      defaultMessage: 'Show all optional parameters',
      description: 'Tooltip for show all optional parameters button',
    }),
    hideAllOptionalTooltip: intl.formatMessage({
      id: 'r/KmCk',
      defaultMessage: 'Hide all optional parameters',
      description: 'Tooltip for hide all optional parameters button',
    }),
    removeParameter: intl.formatMessage({
      id: '5E66mK',
      defaultMessage: 'Remove parameter',
      description: 'Tooltip for remove parameter button',
    }),
    descriptionLabel: intl.formatMessage({
      id: 'LLJrOT',
      defaultMessage: 'Description',
      description: 'Label for the operation description field',
    }),
    descriptionPlaceholder: intl.formatMessage({
      id: 'X1TOAH',
      defaultMessage: 'Enter operation description',
      description: 'Placeholder text for operation description field',
    }),
    noParametersMessage: intl.formatMessage({
      id: 'WG0K6x',
      defaultMessage: 'No parameters configured for this operation',
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
  };

  const handleDescriptionInputChange = useCallback((description: string) => {
    setLocalDescription(description);
  }, []);

  const handleDescriptionBlur = useCallback(() => {
    if (!selectedOperationId) {
      return;
    }

    const originalDescription = metadata?.description ?? '';
    if (localDescription !== originalDescription) {
      dispatch(
        updateOperationDescription({
          id: selectedOperationId,
          description: localDescription,
        })
      );
    }
  }, [dispatch, selectedOperationId, localDescription, metadata?.description]);

  const handleParameterValueChange = useCallback(
    (parameterId: string, newValue: ValueSegment[]) => {
      if (!selectedOperationId || !parameters?.parameterGroups) {
        return;
      }

      const parameterGroupId = getGroupIdFromParameterId(parameters, parameterId);
      if (!parameterGroupId) {
        return;
      }

      const updatePayload: UpdateParametersPayload = {
        nodeId: selectedOperationId,
        parameters: [
          {
            groupId: parameterGroupId,
            parameterId,
            propertiesToUpdate: { value: newValue },
          },
        ],
        isUserAction: true,
      };

      dispatch(updateNodeParameters(updatePayload));
    },
    [dispatch, selectedOperationId, parameters]
  );
  const handleOptionalParameterToggle = useCallback(
    (parameterId: string, isVisible: boolean) => {
      if (!selectedOperationId || !parameters?.parameterGroups) {
        return;
      }

      const parameterGroupId = getGroupIdFromParameterId(parameters, parameterId);
      if (!parameterGroupId) {
        return;
      }

      dispatch(
        updateParameterConditionalVisibility({
          nodeId: selectedOperationId,
          groupId: parameterGroupId,
          parameterId,
          value: isVisible,
        })
      );
    },
    [dispatch, selectedOperationId, parameters]
  );

  const handleRemoveConditionalParameter = useCallback(
    (parameterId: string) => {
      handleOptionalParameterToggle(parameterId, false);
    },
    [handleOptionalParameterToggle]
  );

  const handleShowAllOptional = useCallback(() => {
    if (!selectedOperationId || !parameters) {
      return;
    }

    Object.entries(parameters.parameterGroups).forEach(([groupId, group]) => {
      group.parameters.forEach((param) => {
        if (!param.required && param.conditionalVisibility !== true) {
          dispatch(
            updateParameterConditionalVisibility({
              nodeId: selectedOperationId,
              groupId,
              parameterId: param.id,
              value: true,
            })
          );
        }
      });
    });
  }, [dispatch, selectedOperationId, parameters]);

  const handleHideAllOptional = useCallback(() => {
    if (!selectedOperationId || !parameters) {
      return;
    }

    Object.entries(parameters.parameterGroups).forEach(([groupId, group]) => {
      group.parameters.forEach((param) => {
        if (!param.required && param.conditionalVisibility === true) {
          dispatch(
            updateParameterConditionalVisibility({
              nodeId: selectedOperationId,
              groupId,
              parameterId: param.id,
              value: false,
            })
          );
        }
      });
    });
  }, [dispatch, selectedOperationId, parameters]);

  const renderParameterField = useCallback(
    (param: ParameterInfo, isConditional = false) => {
      return (
        <div key={param.id} className={styles.parameterField}>
          <Label className={styles.parameterLabel} required={param.required} title={param.label}>
            {param.label}
          </Label>
          <div className={styles.parameterValueSection}>
            <StringEditor
              className="msla-setting-token-editor-container"
              initialValue={param.value}
              editorBlur={(changeState) => {
                const newValue = changeState.value;
                handleParameterValueChange(param.id, newValue);
              }}
              placeholder={param.placeholder ?? `Enter ${param.label?.toLowerCase()}`}
            />
            {isConditional && (
              <Button
                appearance="subtle"
                size="small"
                icon={<Dismiss16Regular />}
                onClick={() => handleRemoveConditionalParameter(param.id)}
                title={INTL_TEXT.removeParameter}
                className={styles.removeParameterButton}
              />
            )}
          </div>
        </div>
      );
    },
    [
      styles.parameterField,
      styles.parameterValueSection,
      styles.parameterLabel,
      styles.removeParameterButton,
      INTL_TEXT.removeParameter,
      handleRemoveConditionalParameter,
      handleParameterValueChange,
    ]
  );

  if (!operationInfo || !selectedOperationId) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyParametersCard}>
          <Text className={styles.emptyParametersText}>{INTL_TEXT.noOperationSelected}</Text>
        </div>
      </div>
    );
  }

  const hasVisibleParameters = allVisibleParameters.length > 0;
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
      <div className={styles.section}>
        <Text size={400} weight="semibold" className={styles.descriptionField}>
          {INTL_TEXT.descriptionLabel}
        </Text>
        <Field>
          <Textarea
            value={localDescription}
            onChange={(_e, data) => handleDescriptionInputChange(data.value)}
            onBlur={handleDescriptionBlur}
            placeholder={INTL_TEXT.descriptionPlaceholder}
            rows={3}
            resize="vertical"
          />
        </Field>
      </div>
      <Divider className={styles.divider} />

      {/* Parameters Section */}
      <div className={styles.section}>
        <Text size={400} weight="semibold" className={styles.sectionTitle}>
          {INTL_TEXT.parameters}
        </Text>

        {hasVisibleParameters || hasOptionalParameters ? (
          <div className={styles.parametersSection}>
            <Card className={styles.parameterCard}>
              <Label required>
                <Text size={400} weight="semibold" className={styles.sectionTitle}>
                  {INTL_TEXT.required}
                </Text>
              </Label>

              <div className={styles.parameterCardContent}>
                {hasRequiredParameters && (
                  <div className={styles.parameterList}>
                    {requiredParams.map(({ param, isConditional }) => renderParameterField(param, isConditional))}
                  </div>
                )}

                {hasVisibleParameters && <Divider className={styles.inlineParameterDivider} />}

                <Accordion collapsible={true} defaultOpenItems={['optional-parameters']}>
                  <AccordionItem value="optional-parameters">
                    <AccordionHeader>
                      <Text weight="semibold">{INTL_TEXT.optionalParameters}</Text>
                    </AccordionHeader>
                    <AccordionPanel>
                      {/* Optional Parameters Dropdown */}
                      {allConditionalSettings.length > 0 ? (
                        <div className={styles.optionalParametersSection}>
                          <SearchableDropdownWithAddAll
                            key={`dropdown-${selectedOperationId}-${optionalDropdownOptions.length}`}
                            label={INTL_TEXT.selectParameters}
                            options={optionalDropdownOptions}
                            placeholder={addNewParamText}
                            multiselect={true}
                            onItemSelectionChanged={handleOptionalParameterToggle}
                            addAllButtonText={INTL_TEXT.showAllOptional}
                            addAllButtonTooltip={INTL_TEXT.showAllOptionalTooltip}
                            addAllButtonEnabled={optionalDropdownOptions.length > 0}
                            removeAllButtonText={INTL_TEXT.hideAllOptional}
                            removeAllButtonTooltip={INTL_TEXT.hideAllOptionalTooltip}
                            removeAllButtonEnabled={hasVisibleConditionalParameters}
                            onShowAllClick={handleShowAllOptional}
                            onHideAllClick={handleHideAllOptional}
                          />
                        </div>
                      ) : null}

                      {hasVisibleConditionalParameters && (
                        <div className={styles.parameterList}>
                          {visibleConditionalParams.map(({ param, isConditional }) => renderParameterField(param, isConditional))}
                        </div>
                      )}
                    </AccordionPanel>
                  </AccordionItem>
                </Accordion>
              </div>
            </Card>
          </div>
        ) : (
          <div className={styles.emptyParametersCard}>
            <Text className={styles.emptyParametersText}>{INTL_TEXT.noParametersMessage}</Text>
          </div>
        )}
      </div>
    </div>
  );
};
