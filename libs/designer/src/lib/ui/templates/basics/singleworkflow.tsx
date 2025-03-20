import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { ChoiceGroup, Label, TextField } from '@fluentui/react';
import { updateKind, updateWorkflowName, updateWorkflowNameValidationError } from '../../../core/state/templates/templateSlice';
import { Link, Text } from '@fluentui/react-components';
import { useCallback, useMemo } from 'react';
import { useExistingWorkflowNames } from '../../../core/queries/template';
import { Open16Regular } from '@fluentui/react-icons';
import { useWorkflowBasicsEditable, useWorkflowTemplate } from '../../../core/state/templates/templateselectors';
import { validateWorkflowName } from '../../../core/actions/bjsworkflow/templates';
import { ResourcePicker } from './resourcepicker';
import { useTemplatesStrings } from '../templatesStrings';

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
      WORKFLOW_NAME_DESCRIPTION: intl.formatMessage({
        defaultMessage: 'Avoid spaces and the following symbols in your workflow name: \\ / : * ? " < > | @, #, $, %, &',
        id: 'ZbeL1D',
        description: 'Description for workflow name field and the expected format of the name.',
      }),
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

  const onRenderStatefulField = useCallback(
    () => (
      <div className="msla-templates-tab-choiceGroup-label">
        <Text>{intlText.STATEFUL}</Text>
        <div className="msla-templates-tab-choiceGroup-list">
          <li>{intlText.STATEFUL_FIRST_POINT}</li>
          <li>{intlText.STATEFUL_SECOND_POINT}</li>
        </div>
      </div>
    ),
    [intlText]
  );

  const onRenderStatelessField = useCallback(
    () => (
      <div className="msla-templates-tab-choiceGroup-label">
        <Text>{intlText.STATELESS}</Text>
        <div className="msla-templates-tab-choiceGroup-list">
          <li>{intlText.STATELESS_FIRST_POINT}</li>
          <li>{intlText.STATELESS_SECOND_POINT}</li>
        </div>
      </div>
    ),
    [intlText]
  );

  return (
    <div className="msla-templates-tab msla-panel-no-description-tab">
      {enableResourceSelection ? <ResourcePicker /> : null}
      <Label className="msla-templates-tab-label" required={true} htmlFor={'workflowNameLabel'}>
        {resources.WORKFLOW_NAME}
      </Label>
      <Text className="msla-templates-tab-label-description">{intlText.WORKFLOW_NAME_DESCRIPTION}</Text>
      <TextField
        className="msla-templates-tab-textField"
        data-testid={'msla-templates-workflowName'}
        id={'msla-templates-workflowName'}
        ariaLabel={resources.WORKFLOW_NAME}
        value={name}
        onChange={(_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
          dispatch(updateWorkflowName({ id: workflowId, name: newValue }));
        }}
        disabled={!isNameEditable}
        onBlur={async () => {
          const validationError = await validateWorkflowName(name, !!isConsumption, {
            subscriptionId,
            resourceGroupName,
            existingWorkflowNames: existingWorkflowNames ?? [],
          });
          dispatch(updateWorkflowNameValidationError({ id: workflowId, error: validationError }));
        }}
        errorMessage={errors?.workflow}
      />
      {isConsumption ? null : (
        <div className={errors?.kind ? 'msla-templates-tab-stateType-error' : ''}>
          <Label className="msla-templates-tab-label" required={true} htmlFor={'stateTypeLabel'}>
            {intlText.STATE_TYPE}
          </Label>
          <Text className="msla-templates-tab-label-description">
            {intlText.STATE_TYPE_DESCRIPTION}{' '}
            <Link
              className="msla-templates-tab-label-link"
              href={'https://learn.microsoft.com/azure/logic-apps/single-tenant-overview-compare#stateful-stateless'}
              target="_blank"
              rel="noreferrer"
            >
              {intlText.LEARN_MORE}
              <Open16Regular className="msla-templates-tab-description-icon" />
            </Link>
          </Text>
          <ChoiceGroup
            className="msla-templates-tab-choiceGroup"
            options={[
              { key: 'stateful', text: intlText.STATEFUL, onRenderLabel: onRenderStatefulField },
              {
                key: 'stateless',
                text: intlText.STATELESS,
                onRenderLabel: onRenderStatelessField,
              },
            ]}
            onChange={(_, option) => {
              if (option?.key) {
                dispatch(updateKind({ id: workflowId, kind: option?.key }));
              }
            }}
            selectedKey={kind}
            disabled={manifest?.kinds?.length === 1 || !isKindEditable}
          />
        </div>
      )}
      {errors?.kind && <Text className="msla-templates-tab-stateType-error-message">{errors?.kind}</Text>}
    </div>
  );
};
