import type { RootState } from '../../../core/state/templates/store';
import { useIntl } from 'react-intl';
import { makeStyles, Text, tokens } from '@fluentui/react-components';
import { useSelector } from 'react-redux';
import { Spinner, SpinnerSize } from '@fluentui/react';
import { useSubscriptions } from '../../../core/templates/utils/queries';
import { useMemo } from 'react';
import { useTemplatesStrings } from '../templatesStrings';

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
  const { existingWorkflowName, subscriptionId, location, resourceGroup } = useSelector((state: RootState) => state.workflow);

  const intlText = {
    WORKFLOW_NAME: intl.formatMessage({
      defaultMessage: 'Workflow name',
      id: 'TdgpOf',
      description: 'Label for workflow name',
    }),
  };

  const { resourceStrings } = useTemplatesStrings();

  const { data: subscriptions, isLoading: subscriptionLoading } = useSubscriptions();
  const subscriptionDisplayName = useMemo(
    () => subscriptions?.find((sub) => sub.id === `/subscriptions/${subscriptionId}`)?.displayName ?? '-',
    [subscriptions, subscriptionId]
  );

  const styles = useStyles();

  return (
    <div className="msla-templates-tab msla-templates-review-compact-container">
      <div className="msla-templates-review-block">
        <Text>{resourceOverrides?.workflowName ?? intlText.WORKFLOW_NAME}</Text>
        <Text weight="semibold" className={styles.actionName}>
          {existingWorkflowName}
        </Text>
      </div>

      <div className="msla-templates-review-block basics">
        <div className="msla-templates-review-block">
          <Text>{resourceStrings.SUBSCRIPTION}</Text>
          {subscriptionLoading ? <Spinner size={SpinnerSize.xSmall} /> : <Text weight="semibold">{subscriptionDisplayName}</Text>}
        </div>
        <div className="msla-templates-review-block">
          <Text>{resourceStrings.LOCATION}</Text>
          <Text weight="semibold">{location}</Text>
        </div>
        <div className="msla-templates-review-block">
          <Text>{resourceStrings.RESOURCE_GROUP}</Text>
          <Text weight="semibold">{resourceGroup}</Text>
        </div>
      </div>
    </div>
  );
};
