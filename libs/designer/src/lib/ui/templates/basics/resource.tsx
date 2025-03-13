import { Field, Input, Text } from '@fluentui/react-components';
import { ResourcePicker } from './resourcepicker';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useWorkflowTemplate } from '../../../core/state/templates/templateselectors';
import { updateWorkflowName, updateWorkflowNameValidationError } from '../../../core/state/templates/templateSlice';
import { validateWorkflowName } from '../../../core/actions/bjsworkflow/templates';
import { useIntl } from 'react-intl';

interface ResourceSectionProps {
  workflowId: string;
  showResourceFirst?: boolean;
  showTemplateInfo?: boolean;
  resourceOverrides?: {
    templateLabel?: string;
    workflowLabel?: string;
  };
  cssOverrides?: Record<string, string>;
}

export const ResourceSection = (props: ResourceSectionProps) => {
  const { workflowId, showTemplateInfo, showResourceFirst, resourceOverrides } = props;
  const intl = useIntl();
  const { enableResourceSelection, templateTitle } = useSelector((state: RootState) => ({
    templateTitle: state.template.manifest?.title,
    enableResourceSelection: state.templateOptions.enableResourceSelection,
  }));
  const resources = {
    templateLabel:
      resourceOverrides?.templateLabel ??
      intl.formatMessage({
        defaultMessage: 'Template',
        id: 'fEnHVG',
        description: 'Label for the template',
      }),
    workflowLabel:
      resourceOverrides?.workflowLabel ??
      intl.formatMessage({
        defaultMessage: 'Workflow name',
        id: 'IHEZgQ',
        description: 'Label for the workflow name',
      }),
    placeholderText: intl.formatMessage({
      defaultMessage: "The name can only contain letters, numbers, and '-', '(', ')', '_' or '.",
      id: 'JimYZy',
      description: 'Description text for workflow name for allowed values',
    }),
  };
  const workflowName = <WorkflowName workflowId={workflowId} label={resources.workflowLabel} placeholder={resources.placeholderText} />;
  return (
    <>
      {showTemplateInfo ? (
        <div className="msla-templates-review-block">
          <Text>{resources.templateLabel}</Text>
          <Text weight="semibold">{templateTitle}</Text>
        </div>
      ) : null}
      {showResourceFirst ? workflowName : null}
      {enableResourceSelection ? <ResourcePicker /> : null}
      {showResourceFirst ? null : workflowName}
    </>
  );
};

const WorkflowName = ({ workflowId, label, placeholder }: { workflowId: string; label: string; placeholder?: string }) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    workflowName,
    errors: { workflow: workflowError },
  } = useWorkflowTemplate(workflowId);
  const { subscriptionId, resourceGroupName } = useSelector((state: RootState) => ({
    existingWorkflowName: state.workflow.existingWorkflowName,
    isConsumption: state.workflow.isConsumption,
    subscriptionId: state.workflow.subscriptionId,
    resourceGroupName: state.workflow.resourceGroup,
  }));

  return (
    <Field label={label} required={true} validationMessage={workflowError} className="msla-template-resource-workflow-name">
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
