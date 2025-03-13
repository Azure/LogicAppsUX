import { Text } from '@fluentui/react-components';
import { Spinner, SpinnerSize } from '@fluentui/react';
import { useSubscriptions } from 'lib/core/state/connection/connectionSelector';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTemplatesStrings } from '../templatesStrings';
import type { RootState } from '../../../core/state/templates/store';

export type ResourceDisplayProps = {
  invertBolds?: boolean;
};

export const ResourceDisplay = (props: ResourceDisplayProps) => {
  const { invertBolds } = props;

  const { subscriptionId, location, resourceGroup } = useSelector((state: RootState) => state.workflow);

  const { resourceStrings } = useTemplatesStrings();

  const { data: subscriptions, isLoading: subscriptionLoading } = useSubscriptions();
  const subscriptionDisplayName = useMemo(
    () => subscriptions?.find((sub) => sub.id === `/subscriptions/${subscriptionId}`)?.displayName ?? '-',
    [subscriptions, subscriptionId]
  );

  const labelWeight = useMemo(() => (invertBolds ? 'semibold' : 'regular'), [invertBolds]);
  const valueWeight = useMemo(() => (invertBolds ? 'regular' : 'semibold'), [invertBolds]);

  return (
    <div className="msla-templates-review-block basics">
      <div className="msla-templates-review-block">
        <Text weight={labelWeight}>{resourceStrings.SUBSCRIPTION}</Text>
        {subscriptionLoading ? <Spinner size={SpinnerSize.xSmall} /> : <Text weight={valueWeight}>{subscriptionDisplayName}</Text>}
      </div>
      <div className="msla-templates-review-block">
        <Text weight={labelWeight}>{resourceStrings.LOCATION}</Text>
        <Text weight={valueWeight}>{location}</Text>
      </div>
      <div className="msla-templates-review-block">
        <Text weight={labelWeight}>{resourceStrings.RESOURCE_GROUP}</Text>
        <Text weight={valueWeight}>{resourceGroup}</Text>
      </div>
    </div>
  );
};
