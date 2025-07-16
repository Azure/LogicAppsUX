import { Text, Textarea, Field, Divider, Badge, Card, Label, Button } from '@fluentui/react-components';
import {
  bundleIcon,
  Settings24Regular,
  Settings24Filled,
  CheckmarkCircle16Regular,
  Edit16Regular,
  Dismiss16Regular,
} from '@fluentui/react-icons';
import type { RootState } from '../../../core/state/mcp/store';
import { useSelector } from 'react-redux';
import { useCallback, useMemo, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditOperationStyles } from './styles';
import type { ParameterInfo, ValueSegment } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import type { SearchableDropdownOption } from '@microsoft/designer-ui';
import { SearchableDropdownWithAddAll, StringEditor } from '@microsoft/designer-ui';

const SettingsIcon = bundleIcon(Settings24Filled, Settings24Regular);

export interface EditOperationProps {
  setIsDirty: (b: boolean) => void;
  isDirty: boolean;
}

export interface EditOperationRef {
  getConditionalVisibilityChanges: () => Record<string, boolean>;
  getParameterValueChanges: () => Record<string, ValueSegment[]>;
  getDescriptionChange: () => string | null;
  resetLocalChanges: () => void;
}

export const EditOperation = forwardRef<EditOperationRef, EditOperationProps>(function EditOperation({ setIsDirty, isDirty }, ref) {
  const intl = useIntl();
  const styles = useEditOperationStyles();

  const [localConditionalVisibility, setLocalConditionalVisibility] = useState<Record<string, boolean>>({});
  const [conditionalParameterAddOrder, setConditionalParameterAddOrder] = useState<string[]>([]);

  const [localParameterChanges, setLocalParameterChanges] = useState<Record<string, ValueSegment[]>>({});
  const [localDescriptionChange, setLocalDescriptionChange] = useState<string | null>(null);

  const { selectedOperationId, operationInfos, operationMetadata, inputParameters } = useSelector((state: RootState) => ({
    selectedOperationId: state.connector.selectedOperationId,
    operationInfos: state.operation.operationInfo,
    operationMetadata: state.operation.operationMetadata,
    inputParameters: state.operation.inputParameters,
  }));

  const operationInfo = selectedOperationId ? operationInfos[selectedOperationId] : null;
  const metadata = selectedOperationId ? operationMetadata[selectedOperationId] : null;
  const parameters = selectedOperationId ? inputParameters[selectedOperationId] : null;

  // Reset local state when operation changes
  useEffect(() => {
    setLocalConditionalVisibility({});
    setConditionalParameterAddOrder([]);
  }, [selectedOperationId]);

  // Initialize local state from Redux when component mounts
  useEffect(() => {
    if (!parameters?.parameterGroups) {
      setLocalConditionalVisibility({});
      return;
    }

    const initialVisibility: Record<string, boolean> = {};
    Object.values(parameters.parameterGroups).forEach((group) => {
      group.parameters.forEach((param) => {
        if (!param.required && param.conditionalVisibility) {
          initialVisibility[param.id] = true;
        }
      });
    });

    setLocalConditionalVisibility(initialVisibility);

    setConditionalParameterAddOrder([]);
  }, [parameters]);

  // Separate parameters into required/visible and optional/conditional with proper ordering
  const { allVisibleParameters, optionalDropdownOptions } = useMemo(() => {
    if (!parameters?.parameterGroups) {
      return { allVisibleParameters: [], optionalDropdownOptions: [] };
    }

    const requiredParams: Array<{ groupId: string; param: ParameterInfo; isConditional: boolean }> = [];
    const conditionalParamsMap = new Map<string, { groupId: string; param: ParameterInfo; isConditional: boolean }>();
    const dropdownOptions: SearchableDropdownOption[] = [];

    // Collect all parameters by type
    Object.entries(parameters.parameterGroups).forEach(([groupId, group]) => {
      group.parameters.forEach((param) => {
        if (param.required) {
          requiredParams.push({ groupId, param, isConditional: false });
        } else if (localConditionalVisibility[param.id]) {
          conditionalParamsMap.set(param.id, { groupId, param, isConditional: true });
        } else {
          dropdownOptions.push({
            key: param.id,
            text: param.label ?? param.parameterName,
            data: { groupId, param },
          });
        }
      });
    });

    // Sort conditional parameters by their add order
    const sortedConditionalParams = conditionalParameterAddOrder.map((id) => conditionalParamsMap.get(id)).filter(Boolean) as Array<{
      groupId: string;
      param: ParameterInfo;
      isConditional: boolean;
    }>;

    // Add any conditional parameters that might not be in the add order yet
    conditionalParamsMap.forEach((paramData, id) => {
      if (!conditionalParameterAddOrder.includes(id)) {
        sortedConditionalParams.push(paramData);
      }
    });

    // Combine required parameters first, then conditional parameters in add order
    const allVisible = [...requiredParams, ...sortedConditionalParams];

    return {
      allVisibleParameters: allVisible,
      optionalDropdownOptions: dropdownOptions,
    };
  }, [parameters, localConditionalVisibility, conditionalParameterAddOrder]);

  // Calculate counts for optional parameters
  const { allConditionalSettings, conditionallyInvisibleSettings } = useMemo(() => {
    if (!parameters?.parameterGroups) {
      return { allConditionalSettings: [], conditionallyInvisibleSettings: [] };
    }

    const allConditional: ParameterInfo[] = [];
    const invisible: ParameterInfo[] = [];

    Object.entries(parameters.parameterGroups).forEach(([_groupId, group]) => {
      group.parameters.forEach((param) => {
        if (!param.required) {
          allConditional.push(param);
          if (!localConditionalVisibility[param.id]) {
            invisible.push(param);
          }
        }
      });
    });

    return {
      allConditionalSettings: allConditional,
      conditionallyInvisibleSettings: invisible,
    };
  }, [parameters, localConditionalVisibility]);

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
    addOptionalParameters: intl.formatMessage({
      id: 'm+jXp8',
      defaultMessage: 'Add optional parameters',
      description: 'Label for the dropdown to add optional parameters',
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
    addNewParamText: intl.formatMessage(
      {
        defaultMessage: 'Showing {countShowing} of {countTotal}',
        id: 'jTHUFb',
        description: 'Placeholder text for the number of advanced parameters showing',
      },
      {
        countShowing: allConditionalSettings.length - conditionallyInvisibleSettings.length,
        countTotal: allConditionalSettings.length,
      }
    ),
  };

  const handleFieldChange = useCallback(
    (field: string, value: string) => {
      if (field === 'description') {
        setLocalDescriptionChange(value);
      }

      setIsDirty(true);
    },
    [setIsDirty]
  );

  const handleParameterValueChange = useCallback(
    (parameterId: string, newValue: ValueSegment[]) => {
      setLocalParameterChanges((prev) => ({
        ...prev,
        [parameterId]: {
          ...prev[parameterId],
          value: newValue,
        },
      }));

      setIsDirty(true);
    },
    [setIsDirty]
  );

  const handleOptionalParameterToggle = useCallback(
    (parameterId: string, isVisible: boolean) => {
      setLocalConditionalVisibility((prev) => ({
        ...prev,
        [parameterId]: isVisible,
      }));
      if (isVisible) {
        setConditionalParameterAddOrder((prev) => (prev.includes(parameterId) ? prev : [...prev, parameterId]));
      } else {
        setConditionalParameterAddOrder((prev) => prev.filter((id) => id !== parameterId));
      }
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const handleRemoveConditionalParameter = useCallback(
    (parameterId: string) => {
      setLocalConditionalVisibility((prev) => ({
        ...prev,
        [parameterId]: false,
      }));
      setConditionalParameterAddOrder((prev) => prev.filter((id) => id !== parameterId));
      setIsDirty(true);
    },
    [setIsDirty]
  );

  const handleShowAllOptional = useCallback(() => {
    if (!parameters?.parameterGroups) {
      return;
    }

    const newVisibility: Record<string, boolean> = { ...localConditionalVisibility };
    const newParameterIds: string[] = [];

    Object.entries(parameters.parameterGroups).forEach(([_groupId, group]) => {
      group.parameters.forEach((param) => {
        if (!param.required && !localConditionalVisibility[param.id]) {
          newVisibility[param.id] = true;
          newParameterIds.push(param.id);
        }
      });
    });

    setLocalConditionalVisibility(newVisibility);

    // Add all new parameters to the add order
    setConditionalParameterAddOrder((prev) => {
      const newIds = newParameterIds.filter((id) => !prev.includes(id));
      return [...prev, ...newIds];
    });

    // Mark as dirty if any parameters were added
    if (newParameterIds.length > 0) {
      setIsDirty(true);
    }
  }, [parameters, localConditionalVisibility, setIsDirty]);

  const handleHideAllOptional = useCallback(() => {
    const conditionalIds = Object.keys(localConditionalVisibility).filter((id) => localConditionalVisibility[id]);

    if (conditionalIds.length === 0) {
      return;
    }

    const newVisibility = { ...localConditionalVisibility };
    conditionalIds.forEach((id) => {
      newVisibility[id] = false;
    });

    setLocalConditionalVisibility(newVisibility);
    setConditionalParameterAddOrder((prev) => prev.filter((id) => !conditionalIds.includes(id)));
    setIsDirty(true);
  }, [localConditionalVisibility, setIsDirty]);

  const renderParameterField = useCallback(
    (param: ParameterInfo, isConditional = false) => {
      return (
        <div key={param.id} className={styles.parameterField}>
          <div className={styles.parameterHeader}>
            <Label className={styles.parameterLabel} required={param.required} title={param.label}>
              {param.label}
            </Label>
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
          <StringEditor
            className="msla-setting-token-editor-container"
            initialValue={param.value}
            editorBlur={(changeState) => {
              const newValue = changeState.value;
              handleParameterValueChange(param.id, newValue);
            }}
            placeholder={param.placeholder ?? `Enter ${param.label?.toLowerCase()}`}
          />
        </div>
      );
    },
    [
      styles.parameterField,
      styles.parameterHeader,
      styles.parameterLabel,
      styles.removeParameterButton,
      INTL_TEXT.removeParameter,
      handleRemoveConditionalParameter,
      handleParameterValueChange,
    ]
  );

  const getConditionalVisibilityChanges = useCallback(() => {
    return localConditionalVisibility;
  }, [localConditionalVisibility]);

  // Methods to expose to parent component

  const getParameterValueChanges = useCallback(() => {
    const changes: Record<string, any> = {};

    Object.entries(localParameterChanges).forEach(([parameterId, changeData]) => {
      changes[parameterId] = changeData;
    });

    return changes;
  }, [localParameterChanges]);

  const getDescriptionChange = useCallback(() => {
    // Only return the description if it actually changed
    if (localDescriptionChange !== null && metadata?.description !== localDescriptionChange) {
      return localDescriptionChange;
    }
    return null;
  }, [localDescriptionChange, metadata?.description]);

  const resetLocalChanges = useCallback(() => {
    if (!parameters?.parameterGroups) {
      setLocalConditionalVisibility({});
      setConditionalParameterAddOrder([]);
      setLocalParameterChanges({});
      setLocalDescriptionChange(null);
      return;
    }

    const originalVisibility: Record<string, boolean> = {};
    Object.values(parameters.parameterGroups).forEach((group) => {
      group.parameters.forEach((param) => {
        if (!param.required && param.conditionalVisibility) {
          originalVisibility[param.id] = true;
        }
      });
    });

    setLocalConditionalVisibility(originalVisibility);
    setConditionalParameterAddOrder([]);
    setLocalParameterChanges({});
    setLocalDescriptionChange(null);
  }, [parameters]);

  // Expose methods to parent component
  useImperativeHandle(
    ref,
    () => ({
      getConditionalVisibilityChanges,
      getParameterValueChanges,
      getDescriptionChange,
      resetLocalChanges,
    }),
    [getConditionalVisibilityChanges, getParameterValueChanges, getDescriptionChange, resetLocalChanges]
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
  const hasOptionalParameters = optionalDropdownOptions.length > 0;
  const hasVisibleConditionalParameters = allVisibleParameters.some(({ isConditional }) => isConditional);

  return (
    <div className={styles.container}>
      {/* Operation Header */}
      <div className={styles.operationHeader}>
        <div className={styles.operationIcon}>
          <SettingsIcon />
        </div>
        <div className={styles.operationInfo}>
          <Text size={500} className={styles.operationTitle}>
            {metadata?.summary ?? selectedOperationId}
          </Text>
          <Text className={styles.operationMeta}>
            {operationInfo.type} • {operationInfo.connectorId}
          </Text>
        </div>
        <div className={styles.statusBadge}>
          {isDirty ? (
            <Badge appearance="filled" icon={<Edit16Regular />} className={styles.modifiedBadge}>
              {INTL_TEXT.modified}
            </Badge>
          ) : (
            <Badge appearance="filled" icon={<CheckmarkCircle16Regular />} className={styles.savedBadge}>
              {INTL_TEXT.saved}
            </Badge>
          )}
        </div>
      </div>

      <Divider className={styles.divider} />

      {/* Description Section */}
      <div className={styles.section}>
        <Field label={INTL_TEXT.descriptionLabel} className={styles.descriptionField}>
          <Textarea
            value={localDescriptionChange ?? metadata?.description ?? ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
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
              <div className={styles.parameterCardHeader}>
                <Text size={200} style={{ opacity: 0.8, marginTop: '4px' }}>
                  {intl.formatMessage(
                    {
                      id: 'EcoTuv',
                      defaultMessage: '{count, plural, one {# parameter} other {# parameters}}',
                      description: 'Parameter count text',
                    },
                    { count: allVisibleParameters.length }
                  )}
                </Text>
              </div>

              <div className={styles.parameterCardContent}>
                {/* Visible Parameters */}
                {hasVisibleParameters && (
                  <div className={styles.parameterList}>
                    {allVisibleParameters.map(({ param, isConditional }) => renderParameterField(param, isConditional))}
                  </div>
                )}

                {/* Optional Parameters Dropdown */}
                {allConditionalSettings.length > 0 ? (
                  <div className={styles.optionalParametersSection}>
                    {hasVisibleParameters && <Divider className={styles.inlineParameterDivider} />}
                    <SearchableDropdownWithAddAll
                      key={`dropdown-${selectedOperationId}-${optionalDropdownOptions.length}`}
                      label={INTL_TEXT.addOptionalParameters}
                      options={optionalDropdownOptions}
                      placeholder={INTL_TEXT.addNewParamText}
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
});
