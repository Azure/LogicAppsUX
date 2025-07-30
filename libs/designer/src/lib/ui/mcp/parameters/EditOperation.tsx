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
  mergeClasses,
} from '@fluentui/react-components';
import { Dismiss16Regular } from '@fluentui/react-icons';
import type { RootState, AppDispatch } from '../../../core/state/mcp/store';
import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { useEditOperationStyles } from './styles';
import type { ParameterInfo, ValueSegment } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import type { SearchableDropdownOption } from '@microsoft/designer-ui';
import { SearchableDropdownWithAddAll } from '@microsoft/designer-ui';
import {
  updateNodeParameters,
  updateParameterConditionalVisibility,
  type UpdateParametersPayload,
} from '../../../core/state/operation/operationMetadataSlice';
import { getGroupIdFromParameterId } from '../../../core/utils/parameters/helper';
import { ParameterEditor } from './ParameterEditor';
import constants from '../../../common/constants';

interface EditOperationProps {
  description: string;
  handleDescriptionInputChange: (description: string) => void;
  onParameterVisibilityUpdate: () => void;
}

export const EditOperation = ({ description, handleDescriptionInputChange, onParameterVisibilityUpdate }: EditOperationProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useEditOperationStyles();

  const { selectedOperationId, operationInfos, inputParameters } = useSelector((state: RootState) => ({
    selectedOperationId: state.mcpSelection.selectedOperationId,
    operationInfos: state.operations.operationInfo,
    inputParameters: state.operations.inputParameters,
  }));

  const operationInfo = selectedOperationId ? operationInfos[selectedOperationId] : null;
  const parameters = selectedOperationId ? inputParameters[selectedOperationId] : null;

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
      const visibleConditionalParams: Array<{ groupId: string; param: ParameterInfo; isConditional: boolean }> = [];
      const dropdownOptions: SearchableDropdownOption[] = [];
      const allConditional: ParameterInfo[] = [];
      const invisible: ParameterInfo[] = [];

      for (const [groupId, group] of Object.entries(parameters.parameterGroups)) {
        for (const param of group.parameters) {
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
        }
      }

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
    required: intl.formatMessage({
      id: 'WQT8jf',
      defaultMessage: 'Required',
      description: 'Title for the required section',
    }),
    advancedParameters: intl.formatMessage({
      id: 'ZP9nho',
      defaultMessage: 'Advanced parameters',
      description: 'Label for the section to configure advanced parameters',
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

  const handleToggleAllOptional = useCallback(
    (isAllVisible: boolean) => {
      if (!selectedOperationId || !parameters) {
        return;
      }

      for (const [groupId, group] of Object.entries(parameters.parameterGroups)) {
        for (const param of group.parameters) {
          if (!param.required && param.conditionalVisibility !== isAllVisible) {
            onParameterVisibilityUpdate();
            dispatch(
              updateParameterConditionalVisibility({
                nodeId: selectedOperationId,
                groupId,
                parameterId: param.id,
                value: isAllVisible,
              })
            );
          }
        }
      }
    },
    [dispatch, selectedOperationId, parameters, onParameterVisibilityUpdate]
  );

  const handleRemoveConditionalParameter = useCallback(
    (parameterId: string) => {
      handleOptionalParameterToggle(parameterId, false);
    },
    [handleOptionalParameterToggle]
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
      <Divider className={styles.divider} />

      {/* Parameters Section */}
      <div className={styles.section}>
        <Text size={400} weight="semibold" className={styles.sectionTitle}>
          {INTL_TEXT.parameters}
        </Text>

        {hasRequiredParameters || hasOptionalParameters || hasVisibleConditionalParameters ? (
          <div className={styles.parametersSection}>
            <Card className={styles.parameterCard}>
              {hasRequiredParameters && (
                <div className={styles.requiredSection}>
                  <div className={styles.parameterList}>
                    {requiredParams.map(({ param, groupId, isConditional }) => (
                      <ParameterField
                        key={param.id}
                        operationId={selectedOperationId}
                        groupId={groupId}
                        parameter={param}
                        isConditional={isConditional}
                        onParameterVisibilityUpdate={onParameterVisibilityUpdate}
                        handleParameterValueChange={handleParameterValueChange}
                        handleRemoveConditionalParameter={handleRemoveConditionalParameter}
                      />
                    ))}
                  </div>
                </div>
              )}

              {allConditionalSettings?.length ? (
                <div>
                  <Accordion collapsible={true} defaultOpenItems={['optional-parameters']}>
                    <AccordionItem value="optional-parameters">
                      <AccordionHeader>
                        <Text weight="semibold">{INTL_TEXT.advancedParameters}</Text>
                      </AccordionHeader>
                      <AccordionPanel className={styles.parameterList}>
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
                              onShowAllClick={() => handleToggleAllOptional(true)}
                              onHideAllClick={() => handleToggleAllOptional(false)}
                            />
                          </div>
                        ) : null}

                        {hasVisibleConditionalParameters && (
                          <div className={styles.parameterList}>
                            {visibleConditionalParams.map(({ param, groupId, isConditional }) => (
                              <ParameterField
                                key={param.id}
                                operationId={selectedOperationId}
                                groupId={groupId}
                                parameter={param}
                                isConditional={isConditional}
                                onParameterVisibilityUpdate={onParameterVisibilityUpdate}
                                handleParameterValueChange={handleParameterValueChange}
                                handleRemoveConditionalParameter={handleRemoveConditionalParameter}
                              />
                            ))}
                          </div>
                        )}
                      </AccordionPanel>
                    </AccordionItem>
                  </Accordion>
                </div>
              ) : null}
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

const ParameterField = ({
  operationId,
  groupId,
  parameter,
  isConditional,
  onParameterVisibilityUpdate,
  handleParameterValueChange,
  handleRemoveConditionalParameter,
}: {
  operationId: string;
  groupId: string;
  parameter: ParameterInfo;
  isConditional?: boolean;
  onParameterVisibilityUpdate: () => void;
  handleParameterValueChange: (parameterId: string, newValue: ValueSegment[]) => void;
  handleRemoveConditionalParameter: (parameterId: string) => void;
}) => {
  const intl = useIntl();
  const styles = useEditOperationStyles();

  const removeParamText = intl.formatMessage({
    id: '5E66mK',
    defaultMessage: 'Remove parameter',
    description: 'Tooltip for remove parameter button',
  });

  const isLargeParameter = useMemo(() => {
    const editor = parameter.editor?.toLowerCase();
    return (
      editor === constants.EDITOR.ARRAY ||
      editor === constants.EDITOR.DICTIONARY ||
      editor === constants.EDITOR.HTML ||
      editor === constants.EDITOR.TABLE
    );
  }, [parameter.editor]);

  return (
    <div className={styles.parameterField}>
      <Label className={styles.parameterLabel} required={parameter.required} title={parameter.label}>
        {parameter.label}
      </Label>
      <div className={mergeClasses(styles.parameterValueSection, isLargeParameter && styles.largeParameterSection)}>
        <ParameterEditor
          operationId={operationId}
          groupId={groupId}
          parameter={parameter}
          onParameterVisibilityUpdate={onParameterVisibilityUpdate}
          handleParameterValueChange={handleParameterValueChange}
        />
        {isConditional && (
          <Button
            appearance="subtle"
            size="small"
            icon={<Dismiss16Regular />}
            onClick={() => handleRemoveConditionalParameter(parameter.id)}
            title={removeParamText}
            className={styles.removeParameterButton}
          />
        )}
      </div>
    </div>
  );
};
