import { Text, Textarea, Field, Divider, Badge, Card, Label } from '@fluentui/react-components';
import { bundleIcon, Settings24Regular, Settings24Filled, CheckmarkCircle16Regular, Edit16Regular } from '@fluentui/react-icons';
import type { RootState } from '../../../core/state/mcp/store';
import { useSelector } from 'react-redux';
import { useCallback } from 'react';
import { useEditOperationStyles } from './styles';
import type { ChangeHandler } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { StringEditor } from '@microsoft/designer-ui';

const SettingsIcon = bundleIcon(Settings24Filled, Settings24Regular);

export interface EditOperationProps {
  onValueChange: ChangeHandler;
  isDirty: boolean;
}

export const EditOperation = ({ onValueChange, isDirty }: EditOperationProps) => {
  const intl = useIntl();
  const styles = useEditOperationStyles();

  const { selectedOperationId, operationInfos, operationMetadata, inputParameters } = useSelector((state: RootState) => ({
    selectedOperationId: state.connector.selectedOperationId,
    operationInfos: state.operation.operationInfo,
    operationMetadata: state.operation.operationMetadata,
    inputParameters: state.operation.inputParameters,
  }));

  const operationInfo = selectedOperationId ? operationInfos[selectedOperationId] : null;
  const metadata = selectedOperationId ? operationMetadata[selectedOperationId] : null;
  const parameters = selectedOperationId ? inputParameters[selectedOperationId] : null;

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

  const handleFieldChange = useCallback((field: string, value: any) => {
    console.log(`Field changed: ${field} = ${value}`);
    // You can implement actual field change logic here
  }, []);

  if (!operationInfo || !selectedOperationId) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyParametersCard}>
          <Text className={styles.emptyParametersText}>{INTL_TEXT.noOperationSelected}</Text>
        </div>
      </div>
    );
  }

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
            value={metadata?.description ?? ''}
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

        {parameters?.parameterGroups && Object.keys(parameters.parameterGroups).length > 0 ? (
          <div className={styles.parametersSection}>
            {Object.entries(parameters.parameterGroups).map(([groupId, group]) => (
              <Card key={groupId} className={styles.parameterCard}>
                <div className={styles.parameterCardHeader}>
                  <Text size={200} style={{ opacity: 0.8, marginTop: '4px' }}>
                    {intl.formatMessage(
                      {
                        id: 'EcoTuv',
                        defaultMessage: '{count, plural, one {# parameter} other {# parameters}}',
                        description: 'Parameter count text',
                      },
                      { count: group.parameters.length }
                    )}
                  </Text>
                </div>

                <div className={styles.parameterCardContent}>
                  <div className={styles.parameterList}>
                    {group.parameters.map((param) => {
                      console.log(param);
                      return (
                        <div key={param.id} className={styles.parameterField}>
                          <Label className={styles.parameterLabel} required={param.required} title={param.label}>
                            {param.label}
                          </Label>
                          <StringEditor
                            className="msla-setting-token-editor-container"
                            initialValue={param.value}
                            onChange={onValueChange}
                            placeholder={param.placeholder ?? `Enter ${param.label?.toLowerCase()}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
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
