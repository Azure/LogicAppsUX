import type { INamingRules } from '../../../run-service';
import type { RootState } from '../../../state/store';
import { isNameValid } from './helper';
import { Callout, Link, PrimaryButton, Text, TextField } from '@fluentui/react';
import type { IDropdownOption } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const resourceGroupNamingRules: INamingRules = {
  minLength: 1,
  maxLength: 90,
  invalidCharsRegExp: new RegExp(/[^a-zA-Z0-9._\-()]/, 'g'),
};

export interface INewResourceGroupProps {
  onAddNewResourceGroup: (selectedOption: IDropdownOption) => void;
  resourceGroups: IDropdownOption[];
}

export const NewResourceGroup: React.FC<INewResourceGroupProps> = ({ onAddNewResourceGroup, resourceGroups }) => {
  const intl = useIntl();
  const [isCalloutVisible, { toggle: toggleIsCalloutVisible }] = useBoolean(false);
  const [name, setName] = useState<string>('');
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { exportData } = workflowState;
  const { location } = exportData;

  const intlText = {
    CREATE_NEW: intl.formatMessage({
      defaultMessage: 'Create new',
      id: 'XKQ/Lw',
      description: 'Create new text',
    }),
    RESOURCE_GROUP_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'A resource group is a container that holds related resources for an Azure solution.',
      id: 'fU98Nt',
      description: 'Deploy managed connections warning text',
    }),
    OK: intl.formatMessage({
      defaultMessage: 'OK',
      id: '70cHmm',
      description: 'OK button',
    }),
    CANCEL: intl.formatMessage({
      defaultMessage: 'Cancel',
      id: 'qz9XeG',
      description: 'Cancel button',
    }),
    NAME: intl.formatMessage({
      defaultMessage: 'Name',
      id: '1kGBdP',
      description: 'Name button',
    }),
    INVALID_CHARS: intl.formatMessage({
      defaultMessage: 'The name can contain only alphanumeric characters or the following symbols: . _ - ( )',
      id: '9vOq5B',
      description: 'RResource group name - invalid characters error',
    }),
    INVALID_ENDING_CHAR: intl.formatMessage({
      defaultMessage: `The name can't end with a period.`,
      id: 'Pe0eMX',
      description: 'Resource group name ending error',
    }),
    INVALID_EXISTING_NAME: intl.formatMessage({
      defaultMessage: 'A resource group with the same name already exists in the selected subscription.',
      id: 'KtGlzI',
      description: 'Resource group existing name error',
    }),
    NEW: intl.formatMessage({
      defaultMessage: 'New',
      id: 'm3H+gL',
      description: 'New text',
    }),
  };

  const linkClassName = 'msla-export-summary-connections-new-resource';

  const onChangeName = (_event: FormEvent<HTMLInputElement | HTMLTextAreaElement>, newName?: string | undefined) => {
    setName(newName as string);
  };

  const onClickOk = () => {
    toggleIsCalloutVisible();
    onAddNewResourceGroup({ key: name, text: `(${intlText.NEW}) ${name}`, data: location });
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
            value={name}
            onChange={onChangeName}
            onGetErrorMessage={(newName) => isNameValid(newName, intlText, resourceGroups).validationError}
            autoFocus={true}
          />
          <PrimaryButton
            className="msla-export-summary-connections-button"
            text={intlText.OK}
            ariaLabel={intlText.OK}
            disabled={!isNameValid(name, intlText, resourceGroups).validName}
            onClick={onClickOk}
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
