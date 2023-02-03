import { Text } from '@fluentui/react';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';

type AzureResourcePickerProps = {
  operation: DiscoveryOperation<DiscoveryResultTypes>;
};

export const AzureResourcePicker = (props: AzureResourcePickerProps) => {
  const { operation } = props;

  return <Text variant="medium">{operation.name}</Text>;
};
