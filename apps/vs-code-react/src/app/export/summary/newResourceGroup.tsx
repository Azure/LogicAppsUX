import type { INamingRules } from '../../../run-service';
import type { RootState } from '../../../state/store';
import { isNameValid } from './helper';
import { Popover, PopoverTrigger, PopoverSurface, Link, Button, Input, Field } from '@fluentui/react-components';
import type { Option } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import { MediumText } from '@microsoft/designer-ui';
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
  onAddNewResourceGroup: (selectedOption: Option) => void;
  resourceGroups: Option[];
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

  const onChangeName = (_event: FormEvent<HTMLInputElement>, data: { value: string }) => {
    setName(data.value);
  };

  const onClickOk = () => {
    toggleIsCalloutVisible();
    onAddNewResourceGroup({ key: name, text: `(${intlText.NEW}) ${name}`, data: location });
  };

  return (
    <Popover open={isCalloutVisible} onOpenChange={(_, data) => (data.open ? null : toggleIsCalloutVisible())}>
      <PopoverTrigger disableButtonEnhancement>
        <Link className={linkClassName} onClick={toggleIsCalloutVisible}>
          {intlText.CREATE_NEW}
        </Link>
      </PopoverTrigger>
      <PopoverSurface style={{ padding: '20px 15px 0 15px', maxWidth: '360px' }}>
        <MediumText text={intlText.RESOURCE_GROUP_DESCRIPTION} style={{ display: 'block', marginBottom: '10px' }} />
        <Field
          label={intlText.NAME}
          required
          validationMessage={isNameValid(name, intlText, resourceGroups).validationError}
          validationState={isNameValid(name, intlText, resourceGroups).validName ? 'none' : 'error'}
        >
          <Input value={name} onChange={onChangeName} autoFocus={true} />
        </Field>
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
          <Button
            className="msla-export-summary-connections-button"
            appearance="primary"
            aria-label={intlText.OK}
            disabled={!isNameValid(name, intlText, resourceGroups).validName}
            onClick={onClickOk}
          >
            {intlText.OK}
          </Button>
          <Button className="msla-export-summary-connections-button" aria-label={intlText.CANCEL} onClick={toggleIsCalloutVisible}>
            {intlText.CANCEL}
          </Button>
        </div>
      </PopoverSurface>
    </Popover>
  );
};
