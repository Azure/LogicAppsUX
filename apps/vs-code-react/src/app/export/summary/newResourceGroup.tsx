import { Callout, Link, Text } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { useIntl } from 'react-intl';

export const NewResourceGroup: React.FC = () => {
  const intl = useIntl();
  const [isCalloutVisible, { toggle: toggleIsCalloutVisible }] = useBoolean(false);

  const intlText = {
    CREATE_NEW: intl.formatMessage({
      defaultMessage: 'Create new',
      description: 'Create new text',
    }),
    RESOURCE_GROUP_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'A resource group is a container that holds related resources for an Azure solution.',
      description: 'Deploy managed connections warning text',
    }),
  };

  return (
    <>
      <Link onClick={toggleIsCalloutVisible}>{intlText.CREATE_NEW}</Link>
      {isCalloutVisible && (
        <Callout role="dialog" gapSpace={0} onDismiss={toggleIsCalloutVisible}>
          <Text variant="mediumPlus" block>
            {intlText.RESOURCE_GROUP_DESCRIPTION}
          </Text>
        </Callout>
      )}
    </>
  );
};
