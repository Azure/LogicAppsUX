import type { RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { makeStyles, Text, tokens } from '@fluentui/react-components';
import { useSelector } from 'react-redux';
import { ResourceDisplay } from './ResourceDisplay';

const useStyles = makeStyles({
  actionName: {
    color: tokens.colorPaletteLavenderBorderActive,
  },
});

type ReviewExistingProps = {
  resourceOverrides?: {
    workflowName?: string;
  };
};

export const ReviewExisting = ({ resourceOverrides }: ReviewExistingProps) => {
  const intl = useIntl();
  const { existingWorkflowName } = useSelector((state: RootState) => state.workflow);
  const { enableResourceSelection } = useSelector((state: RootState) => state.templateOptions);

  const intlText = {
    WORKFLOW_NAME: intl.formatMessage({
      defaultMessage: 'Workflow name',
      id: 'TdgpOf',
      description: 'Label for workflow name',
    }),
  };

  const styles = useStyles();

  return (
    <div className="msla-templates-tab msla-templates-review-container">
      <div className="msla-templates-review-block">
        <Text>{resourceOverrides?.workflowName ?? intlText.WORKFLOW_NAME}</Text>
        <Text weight="semibold" className={styles.actionName}>
          {existingWorkflowName}
        </Text>
      </div>

      {enableResourceSelection && <ResourceDisplay />}
    </div>
  );
};
