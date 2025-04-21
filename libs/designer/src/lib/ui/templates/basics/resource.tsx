import { Field, InfoLabel, Input, makeStyles, Textarea } from '@fluentui/react-components';
import { ResourcePicker } from './resourcepicker';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useWorkflowTemplate } from '../../../core/state/templates/templateselectors';
import {
  updateWorkflowName,
  updateWorkflowNameValidationError,
  updateTemplateTriggerDescription,
	updateTemplateTriggerDescriptionValidationError,
} from '../../../core/state/templates/templateSlice';
import { validateTriggerDescription, validateWorkflowName } from '../../../core/actions/bjsworkflow/templates';
import { useIntl } from 'react-intl';
import { useTemplatesStrings } from '../templatesStrings';
import { TemplateDisplay } from '../templateDisplay';
import { useMemo } from 'react';

interface ResourceSectionProps {
  workflowId: string;
  showResourceFirst?: boolean;
  showTriggerDescription?: boolean;
  showTemplateInfo?: boolean;
  resourceOverrides?: {
    templateLabel?: string;
    workflowLabel?: string;
    triggerDescriptionLabel?: string;
    triggerDescriptionPlaceholder?: string;
    triggerDescriptionInfoLabel?: string;
  };
  cssOverrides?: Record<string, string>;
}

const useStyles = makeStyles({
  template: {
    padding: '20px 0 10px 0',
  },
  workflowName: {
    margin: '12px 0',
  },
  triggerDescription: {
    margin: '0 0 12px 0',
  },
});

export const ResourceSection = (props: ResourceSectionProps) => {
  const { workflowId, showTemplateInfo, showResourceFirst, showTriggerDescription, resourceOverrides } = props;
  const intl = useIntl();
  const { enableResourceSelection } = useSelector((state: RootState) => ({
    enableResourceSelection: state.templateOptions.enableResourceSelection,
  }));
  const { resourceStrings } = useTemplatesStrings();
  const resources = {
    workflowLabel: resourceOverrides?.workflowLabel ?? resourceStrings.WORKFLOW_NAME,
    workflowNamePlaceholderText: intl.formatMessage({
      defaultMessage: "The name can only contain letters, numbers, and '-', '(', ')', '_' or '.",
      id: 'JimYZy',
      description: 'Description text for workflow name for allowed values',
    }),
    triggerDescriptionLabel:
      resourceOverrides?.triggerDescriptionLabel ??
      intl.formatMessage({
        defaultMessage: 'Trigger description',
        id: 'h3V6DM',
        description: 'Label for trigger description',
      }),
    triggerDescriptionPlaceholderText:
      resourceOverrides?.triggerDescriptionPlaceholder ??
      intl.formatMessage({
        defaultMessage: 'Description of the trigger',
        id: 'gDW6Bd',
        description: 'Placeholder text for trigger description',
      }),
  };
  const styles = useStyles();
  const workflowName = (
    <WorkflowName workflowId={workflowId} label={resources.workflowLabel} placeholder={resources.workflowNamePlaceholderText} />
  );
  const triggerDescription = (
    <WorkflowTriggerDescription
      workflowId={workflowId}
      label={resources.triggerDescriptionLabel}
      placeholder={resources.triggerDescriptionPlaceholderText}
      infoLabel={resourceOverrides?.triggerDescriptionInfoLabel}
    />
  );
  return (
    <>
      {showTemplateInfo ? (
        <TemplateDisplay titleLabel={resourceOverrides?.templateLabel} cssOverrides={styles} showDescription={true} />
      ) : null}
      {showResourceFirst ? workflowName : null}
      {showTriggerDescription ? triggerDescription : null}
      {enableResourceSelection ? <ResourcePicker /> : null}
      {showResourceFirst ? null : workflowName}
    </>
  );
};

const WorkflowName = ({ workflowId, label, placeholder }: { workflowId: string; label: string; placeholder?: string }) => {
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();
  const workflowTemplate = useWorkflowTemplate(workflowId);
  const workflowName = useMemo(() => workflowTemplate?.workflowName, [workflowTemplate]);
  const workflowError = useMemo(() => workflowTemplate?.errors?.workflow, [workflowTemplate]);
  const { subscriptionId, resourceGroupName } = useSelector((state: RootState) => ({
    subscriptionId: state.workflow.subscriptionId,
    resourceGroupName: state.workflow.resourceGroup,
  }));

  return (
    <Field label={label} required={true} validationMessage={workflowError} className={styles.workflowName}>
      <Input
        placeholder={placeholder}
        value={workflowName}
        onChange={(_event, data) => dispatch(updateWorkflowName({ id: workflowId, name: data.value ?? '' }))}
        onBlur={async () => {
          const validationError = await validateWorkflowName(workflowName, /* isConsumption */ true, {
            subscriptionId,
            resourceGroupName,
            existingWorkflowNames: [],
          });
          dispatch(updateWorkflowNameValidationError({ id: workflowId, error: validationError }));
        }}
        size="small"
      />
    </Field>
  );
};

const WorkflowTriggerDescription = ({
  workflowId,
  label,
  placeholder,
  infoLabel,
}: {
  workflowId: string;
  label: string;
  placeholder?: string;
  infoLabel?: string;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();
  const workflowTemplate = useWorkflowTemplate(workflowId);
  const triggerDescription = useMemo(
    () => Object.values(workflowTemplate?.workflowDefinition?.triggers ?? {})?.[0]?.description,
    [workflowTemplate]
  );
	const triggerDescriptionError = useMemo(
		() => workflowTemplate?.errors?.triggerDescription,
		[workflowTemplate]
	);

  return (
    <Field
      label={{
        children: <InfoLabel info={infoLabel}>{label}</InfoLabel>,
      }}
      required={true}
      className={styles.triggerDescription}
			validationMessage={triggerDescriptionError}
    >
      <Textarea
        placeholder={placeholder}
        defaultValue={triggerDescription}
        onChange={(_event, data) => dispatch(updateTemplateTriggerDescription({ id: workflowId, description: data.value ?? '' }))}
        size="small"
        maxLength={256}
        required
        style={{ height: '64px' }}
				onBlur={async () => {
					const validationError = await validateTriggerDescription(triggerDescription);
					dispatch(updateTemplateTriggerDescriptionValidationError({ id: workflowId, error: validationError }));
				}}
      />
    </Field>
  );
};
