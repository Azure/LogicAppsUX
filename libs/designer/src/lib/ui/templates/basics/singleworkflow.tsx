import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { updateKind, updateWorkflowName, updateWorkflowNameValidationError } from '../../../core/state/templates/templateSlice';
import { Text } from '@fluentui/react-components';
import { useMemo } from 'react';
import { useExistingWorkflowNames } from '../../../core/queries/template';
import { useWorkflowBasicsEditable, useWorkflowTemplate } from '../../../core/state/templates/templateselectors';
import { validateWorkflowName } from '../../../core/actions/bjsworkflow/templates';
import { ResourcePicker } from './resourcepicker';
import { useTemplatesStrings } from '../templatesStrings';
import { TemplatesSection } from '@microsoft/designer-ui';

export const SingleWorkflowBasics = ({ workflowId }: { workflowId: string }) => {
  const dispatch = useDispatch<AppDispatch>();
  const workflowTemplate = useWorkflowTemplate(workflowId);
  const { workflowName, errors, kind, manifest } = useMemo(
    () => ({
      workflowName: workflowTemplate?.workflowName,
      errors: workflowTemplate?.errors,
      kind: workflowTemplate?.kind,
      manifest: workflowTemplate?.manifest,
    }),
    [workflowTemplate]
  );
  const { isNameEditable, isKindEditable } = useWorkflowBasicsEditable(workflowId);
  const { enableResourceSelection, isConsumption, subscriptionId, resourceGroupName } = useSelector((state: RootState) => ({
    isConsumption: state.workflow.isConsumption,
    subscriptionId: state.workflow.subscriptionId,
    resourceGroupName: state.workflow.resourceGroup,
    enableResourceSelection: state.templateOptions.enableResourceSelection,
  }));
  const { data: existingWorkflowNames } = useExistingWorkflowNames();
  const name = useMemo(() => workflowName, [workflowName]);
  const intl = useIntl();
  const resources = useTemplatesStrings().resourceStrings;

  const intlText = useMemo(
    () => ({
      STATE_TYPE: intl.formatMessage({
        defaultMessage: 'State type',
        id: 'W1rlxU',
        description: 'Label for choosing State type',
      }),
      STATE_TYPE_DESCRIPTION: intl.formatMessage({
        defaultMessage:
          'This workflow supports the following states. The state determines how data is managed and retained during execution of workflows.',
        id: 'NaW0ga',
        description: 'Description for state type choice group.',
      }),
      LEARN_MORE: intl.formatMessage({
        defaultMessage: 'Learn more',
        id: 'Xg1UDw',
        description: 'Link to learn more about state type',
      }),
      STATEFUL: intl.formatMessage({
        defaultMessage: 'Stateful',
        id: 'kU4VfD',
        description: 'Choice group first choice: Stateful Type',
      }),
      STATEFUL_FIRST_POINT: intl.formatMessage({
        defaultMessage: 'Optimized for high reliability',
        id: 'RLoDgQ',
        description: 'First bullet point of stateful type',
      }),
      STATEFUL_SECOND_POINT: intl.formatMessage({
        defaultMessage: 'Ideal for process business transitional data',
        id: 'F1AkvV',
        description: 'Second bullet point of stateful type',
      }),
      STATELESS: intl.formatMessage({
        defaultMessage: 'Stateless',
        id: 'uTTbhk',
        description: 'Choice group first choice: Stateless Type',
      }),
      STATELESS_FIRST_POINT: intl.formatMessage({
        defaultMessage: 'Optimized for low latency',
        id: 'xHyhqO',
        description: 'First bullet point of stateless type',
      }),
      STATELESS_SECOND_POINT: intl.formatMessage({
        defaultMessage: 'Ideal for request-response and processing IoT events',
        id: 'yeagrz',
        description: 'Second bullet point of stateless type',
      }),
    }),
    [intl]
  );

  return (
    <div className="msla-templates-tab msla-panel-no-description-tab">
      {enableResourceSelection ? <ResourcePicker /> : null}
      <TemplatesSection
        title={resources.WORKFLOW_NAME}
        isTitleRequired={true}
        titleHtmlFor={'workflowNameLabel'}
        description={resources.WORKFLOW_NAME_DESCRIPTION}
        items={[
          {
            id: 'msla-templates-workflowName',
            value: name,
            type: 'textfield',
            onChange: (newValue: string) => {
              dispatch(updateWorkflowName({ id: workflowId, name: newValue }));
            },
            disabled: !isNameEditable,
            onBlur: async () => {
              const validationError = await validateWorkflowName(name, !!isConsumption, {
                subscriptionId,
                resourceGroupName,
                existingWorkflowNames: existingWorkflowNames ?? [],
              });
              dispatch(updateWorkflowNameValidationError({ id: workflowId, error: validationError }));
            },
            errorMessage: errors?.workflow,
          },
        ]}
      />

      {isConsumption ? null : (
        <div className={errors?.kind ? 'msla-templates-tab-stateType-error' : ''}>
          <TemplatesSection
            title={intlText.STATE_TYPE}
            isTitleRequired={true}
            titleHtmlFor={'stateTypeLabel'}
            description={intlText.STATE_TYPE_DESCRIPTION}
            descriptionLink={{
              text: intlText.LEARN_MORE,
              href: 'https://learn.microsoft.com/azure/logic-apps/single-tenant-overview-compare#stateful-stateless',
            }}
            items={[
              {
                type: 'radiogroup',
                value: kind,
                disabled: manifest?.kinds?.length === 1 || !isKindEditable,
                onOptionSelect: (selectedValue) => {
                  if (selectedValue) {
                    dispatch(updateKind({ id: workflowId, kind: selectedValue }));
                  }
                },
                options: [
                  {
                    id: 'stateful',
                    label: (
                      <div className="msla-templates-tab-choiceGroup-label">
                        <Text>{intlText.STATEFUL}</Text>
                        <div className="msla-templates-tab-choiceGroup-list">
                          <li>{intlText.STATEFUL_FIRST_POINT}</li>
                          <li>{intlText.STATEFUL_SECOND_POINT}</li>
                        </div>
                      </div>
                    ),
                    value: 'stateful',
                  },
                  {
                    id: 'stateless',
                    label: (
                      <div className="msla-templates-tab-choiceGroup-label">
                        <Text>{intlText.STATELESS}</Text>
                        <div className="msla-templates-tab-choiceGroup-list">
                          <li>{intlText.STATELESS_FIRST_POINT}</li>
                          <li>{intlText.STATELESS_SECOND_POINT}</li>
                        </div>
                      </div>
                    ),
                    value: 'stateless',
                  },
                ],
              },
            ]}
          />
        </div>
      )}
      {errors?.kind && <Text className="msla-templates-tab-stateType-error-message">{errors?.kind}</Text>}
    </div>
  );
};
