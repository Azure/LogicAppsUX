import { mergeClasses, Text } from '@fluentui/react-components';
import { Spinner, SpinnerSize } from '@fluentui/react';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useTemplatesStrings } from '../templatesStrings';
import type { RootState } from '../../../core/state/templates/store';
import { useSubscriptions } from '../../../core/templates/utils/queries';

export type ResourceDisplayProps = {
  invertBolds?: boolean;
  cssOverrides?: Record<string, string>;
};

export const ResourceDisplay = (props: ResourceDisplayProps) => {
  const { invertBolds, cssOverrides } = props;

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
    <div className={mergeClasses('msla-templates-review-block basics', cssOverrides?.root)}>
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
