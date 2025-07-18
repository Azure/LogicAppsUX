import type { RootState } from '../../../state/store';
import { isNameValid } from './helper';
import type { IDropdownOption } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { MediumText } from '@microsoft/designer-ui';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useExportStyles } from '../exportStyles';
import type { InputOnChangeData } from '@fluentui/react-components';
import { Button, Input, Label, Link, Popover, PopoverSurface, PopoverTrigger, useId } from '@fluentui/react-components';

interface INewResourceGroupProps {
  onAddNewResourceGroup: (selectedOption: IDropdownOption) => void;
  resourceGroups: IDropdownOption[];
}

export const NewResourceGroup: React.FC<INewResourceGroupProps> = ({ onAddNewResourceGroup, resourceGroups }) => {
  const intl = useIntl();
  const [isCalloutVisible, { toggle: toggleIsCalloutVisible }] = useBoolean(false);
  const [name, setName] = useState<string>('');
  const styles = useExportStyles();
  const resourceGroupInputId = useId('input');
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

  const onChangeName = (_ev: ChangeEvent<HTMLInputElement>, data: InputOnChangeData) => {
    const newName = data.value?.trim();
    setName(newName);
  };

  const onClickOk = () => {
    toggleIsCalloutVisible();
    onAddNewResourceGroup({ key: name, text: `(${intlText.NEW}) ${name}`, data: location });
  };

  return (
    <Popover open={isCalloutVisible} withArrow trapFocus>
      <PopoverTrigger disableButtonEnhancement>
        <Link onClick={toggleIsCalloutVisible}>{intlText.CREATE_NEW}</Link>
      </PopoverTrigger>

      <PopoverSurface tabIndex={-1}>
        <MediumText text={intlText.RESOURCE_GROUP_DESCRIPTION} style={{ display: 'block' }} />
        <div className={styles.exportSummaryNewResorurceGroup}>
          <Label htmlFor={resourceGroupInputId} size={'small'}>
            {intlText.NAME}
          </Label>
          <Input autoFocus={true} value={name} id={resourceGroupInputId} onChange={onChangeName} />
        </div>
        <Button
          appearance="primary"
          className={styles.exportSummaryConnectionsButton}
          aria-label={intlText.OK}
          disabled={!isNameValid(name, intlText, resourceGroups).validName}
          onClick={onClickOk}
        >
          {intlText.OK}
        </Button>
        <Button
          appearance="primary"
          className={styles.exportSummaryConnectionsButton}
          aria-label={intlText.CANCEL}
          onClick={toggleIsCalloutVisible}
        >
          {intlText.CANCEL}
        </Button>
      </PopoverSurface>
    </Popover>
  );
};
