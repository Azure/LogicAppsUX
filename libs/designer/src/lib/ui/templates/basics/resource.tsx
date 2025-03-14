import { Field, Input, makeStyles } from '@fluentui/react-components';
import { ResourcePicker } from './resourcepicker';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useWorkflowTemplate } from '../../../core/state/templates/templateselectors';
import { updateWorkflowName, updateWorkflowNameValidationError } from '../../../core/state/templates/templateSlice';
import { validateWorkflowName } from '../../../core/actions/bjsworkflow/templates';
import { useIntl } from 'react-intl';
import { useTemplatesStrings } from '../templatesStrings';
import { TemplateDisplay } from '../review/ReviewAddPanel';

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

const useStyles = makeStyles({
  template: {
    padding: '20px 0 10px 0',
  },
  workflowName: {
    padding: '10px 0 10px 0',
  },
});

export const ResourceSection = (props: ResourceSectionProps) => {
  const { workflowId, showTemplateInfo, showResourceFirst, resourceOverrides } = props;
  const intl = useIntl();
  const { enableResourceSelection } = useSelector((state: RootState) => ({
    enableResourceSelection: state.templateOptions.enableResourceSelection,
  }));
  const { resourceStrings } = useTemplatesStrings();
  const resources = {
    workflowLabel: resourceOverrides?.workflowLabel ?? resourceStrings.WORKFLOW_NAME,
    placeholderText: intl.formatMessage({
      defaultMessage: "The name can only contain letters, numbers, and '-', '(', ')', '_' or '.",
      id: 'JimYZy',
      description: 'Description text for workflow name for allowed values',
    }),
  };
  const styles = useStyles();
  const workflowName = <WorkflowName workflowId={workflowId} label={resources.workflowLabel} placeholder={resources.placeholderText} />;
  return (
    <>
      {showTemplateInfo ? <TemplateDisplay label={resourceOverrides?.templateLabel} cssOverrides={styles} /> : null}
      {showResourceFirst ? workflowName : null}
      {enableResourceSelection ? <ResourcePicker /> : null}
      {showResourceFirst ? null : workflowName}
    </>
  );
};

const WorkflowName = ({ workflowId, label, placeholder }: { workflowId: string; label: string; placeholder?: string }) => {
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();
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
