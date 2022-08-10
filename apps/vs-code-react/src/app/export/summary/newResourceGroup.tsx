import type { INamingRules } from '../../../run-service';
import { isNameValid } from './helper';
import { Callout, Link, PrimaryButton, Text, TextField } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useIntl } from 'react-intl';

export const resourceGroupNamingRules: INamingRules = {
  minLength: 1,
  maxLength: 90,
  invalidCharsRegExp: new RegExp(/[^a-zA-Z0-9._\-()]/, 'g'),
};

export const NewResourceGroup: React.FC = () => {
  const intl = useIntl();
  const [isCalloutVisible, { toggle: toggleIsCalloutVisible }] = useBoolean(false);
  const [name, setName] = useState<string>('');

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
    INVALID_CHARS: intl.formatMessage({
      defaultMessage: 'The name can only contain alphanumeric characters or the symbols ._-()',
      description: 'Resource group name invalid chars error',
    }),
    INVALID_ENDING_CHAR: intl.formatMessage({
      defaultMessage: 'The name cannot end in a period.',
      description: 'Resource group name ending error',
    }),
  };

  const linkClassName = 'msla-export-summary-connections-new-resource';

  const onChangeName = (_event: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newName?: string | undefined) => {
    setName(newName as string);
  };

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
          <Text variant="medium" block>
            {intlText.RESOURCE_GROUP_DESCRIPTION}
          </Text>
          <TextField
            required
            label={intlText.NAME}
            onChange={onChangeName}
            onGetErrorMessage={(newName) => isNameValid(newName, intlText).validationError}
            autoFocus={true}
          />
          <PrimaryButton
            className="msla-export-summary-connections-button"
            text={intlText.OK}
            ariaLabel={intlText.OK}
            disabled={!isNameValid(name, intlText).validName}
          />
          <PrimaryButton
            className="msla-export-summary-connections-button"
            text={intlText.CANCEL}
            ariaLabel={intlText.CANCEL}
            onClick={toggleIsCalloutVisible}
          />
        </Callout>
      )}
    </>
  );
};
