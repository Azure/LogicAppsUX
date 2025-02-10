import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { ChoiceGroup, Label, TextField } from '@fluentui/react';
import { updateKind, updateWorkflowName, updateWorkflowNameValidationError } from '../../../core/state/templates/templateSlice';
import { Link, Text } from '@fluentui/react-components';
import { useCallback, useMemo } from 'react';
import { useExistingWorkflowNames } from '../../../core/queries/template';
import { Open16Regular } from '@fluentui/react-icons';
import { useWorkflowTemplate } from '../../../core/state/templates/templateselectors';
import { validateWorkflowName } from '../../../core/actions/bjsworkflow/templates';
import { useFunctionalState } from '@react-hookz/web';

export const SingleWorkflowBasics = ({ workflowId }: { workflowId: string }) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    workflowName,
    isWorkflowNameEditable,
    errors: { workflow: workflowError, kind: kindError },
    kind,
    isKindEditable,
    manifest,
  } = useWorkflowTemplate(workflowId);
  const { existingWorkflowName } = useSelector((state: RootState) => state.workflow);
  const { data: existingWorkflowNames } = useExistingWorkflowNames();
  const [name, setName] = useFunctionalState(existingWorkflowName ?? workflowName);
  const intl = useIntl();

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
      WORKFLOW_NAME: intl.formatMessage({
        defaultMessage: 'Workflow name',
        id: 'ekM77J',
        description: 'Label for workflow Name',
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
      <Label className="msla-templates-tab-label" required={true} htmlFor={'workflowNameLabel'}>
        {intlText.WORKFLOW_NAME}
      </Label>
      <Text className="msla-templates-tab-label-description">{intlText.WORKFLOW_NAME_DESCRIPTION}</Text>
      <TextField
        className="msla-templates-tab-textField"
        data-testid={'msla-templates-workflowName'}
        id={'msla-templates-workflowName'}
        ariaLabel={intlText.WORKFLOW_NAME}
        value={name()}
        onChange={(_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
          setName(newValue);
          dispatch(updateWorkflowName({ id: workflowId, name: newValue }));
        }}
        disabled={!!existingWorkflowName || isWorkflowNameEditable === false}
        onBlur={() => {
          const validationError = validateWorkflowName(name(), existingWorkflowNames ?? []);
          dispatch(updateWorkflowNameValidationError({ id: workflowId, error: validationError }));
        }}
        errorMessage={workflowError}
      />
      <div className={kindError ? 'msla-templates-tab-stateType-error' : ''}>
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
          disabled={manifest?.kinds?.length === 1 || isKindEditable === false}
        />
      </div>
      {kindError && <Text className="msla-templates-tab-stateType-error-message">{kindError}</Text>}
    </div>
  );
};
