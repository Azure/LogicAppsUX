import { Callout, Link, PrimaryButton, Text, TextField } from '@fluentui/react';
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
    OK: intl.formatMessage({
      defaultMessage: 'OK',
      description: 'OK button',
    }),
    CANCEL: intl.formatMessage({
      defaultMessage: 'Cancel',
      description: 'Cancel button',
    }),
    NAME: intl.formatMessage({
      defaultMessage: 'Name',
      description: 'Name button',
    }),
  };

  const linkClassName = 'msla-export-summary-connections-new-resource';

  return (
    <>
      <Link className={linkClassName} onClick={toggleIsCalloutVisible}>
        {intlText.CREATE_NEW}
      </Link>
      {isCalloutVisible && (
        <Callout
          role="dialog"
          gapSpace={8}
          calloutMaxWidth={360}
          style={{ padding: '20px 15px 0 15px' }}
          target={`.${linkClassName}`}
          onDismiss={toggleIsCalloutVisible}
        >
          <Text variant="mediumPlus" block>
            {intlText.RESOURCE_GROUP_DESCRIPTION}
          </Text>
          <TextField required label={intlText.NAME} />
          <PrimaryButton className="msla-export-navigation-panel-button" text={intlText.OK} ariaLabel={intlText.OK} />
          <PrimaryButton className="msla-export-navigation-panel-button" text={intlText.CANCEL} ariaLabel={intlText.CANCEL} />
        </Callout>
      )}
    </>
  );
};
