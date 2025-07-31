import { Text, Textarea, Field, Divider, Card, Label, Button, Link, mergeClasses } from '@fluentui/react-components';
import { Dismiss16Regular } from '@fluentui/react-icons';
import type { RootState, AppDispatch } from '../../../core/state/mcp/store';
import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useMemo, useRef } from 'react';
import { useEditOperationStyles } from './styles';
import type { ParameterInfo, ValueSegment } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import type { SearchableDropdownOption } from '@microsoft/designer-ui';
import { SEARCHABLE_DROPDOWN_SELECT_ALL_KEY, SearchableDropdown } from '@microsoft/designer-ui';
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

  // Track the order in which parameters are selected to maintain display order
  const selectionOrderRef = useRef<Map<string, number>>(new Map());
  const nextOrderRef = useRef<number>(1);

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
      const visibleConditionalParamsUnsorted: Array<{ groupId: string; param: ParameterInfo; isConditional: boolean }> = [];
      const dropdownOptions: SearchableDropdownOption[] = [];
      const allConditional: ParameterInfo[] = [];
      const invisible: ParameterInfo[] = [];
      const orderMap = new Map<string, number>();

      // First pass: collect all data
      for (const [groupId, group] of Object.entries(parameters.parameterGroups)) {
        for (const param of group.parameters) {
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
    optionalParametersDescription: intl.formatMessage({
      id: 'hlSLnD',
      defaultMessage: 'Add optional parameters you want the MCP to expose.',
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
      id: 'NF08ud',
      defaultMessage: 'Learn More',
      description: 'Learn more link text for optional parameters',
    }),
    removeAllParameters: intl.formatMessage({
      id: 'BVxUsU',
      defaultMessage: 'Remove All',
      description: 'Button text to remove all optional parameters',
    }),
    parametersAdded: intl.formatMessage({
      id: 'iOZv39',
      defaultMessage: 'Parameters Added:',
      description: 'Label showing count of added optional parameters',
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

              {allConditionalSettings?.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  {/* Advanced Parameters Title and Description */}
                  <div style={{ marginBottom: '16px' }}>
                    <Text weight="semibold" size={400} style={{ marginBottom: '8px', display: 'block' }}>
                      {INTL_TEXT.optionalParameters}
                    </Text>
                    <div style={{ marginBottom: '16px' }}>
                      <Text size={300}>
                        {hasVisibleConditionalParameters
                          ? INTL_TEXT.optionalParametersDescriptionWithParams
                          : INTL_TEXT.optionalParametersDescription}
                      </Text>
                      {!hasVisibleConditionalParameters && (
                        <>
                          {' '}
                          <Link
                            href="https://learn.microsoft.com/en-us/azure/logic-apps/create-parameters-workflows?tabs=standard#define-use-and-edit-parameters"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {INTL_TEXT.learnMore}
                          </Link>
                        </>
                      )}
                    </div>

                    <Field>
                      <Label>{INTL_TEXT.optionalParametersLabel}</Label>
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
                </div>
              )}
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
