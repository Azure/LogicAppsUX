import type { RootState } from '../../../state/store';
import { isNameValid } from './helper';
import type { IDropdownOption } from '../../components/searchableDropdown';
import { useBoolean } from '@fluentui/react-hooks';
import { MediumText } from '@microsoft/designer-ui';
import { useState, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { useSelector } from 'react-redux';
import { useExportStyles } from '../exportStyles';
import type { InputOnChangeData } from '@fluentui/react-components';
import { Button, Field, Input, Label, Link, Popover, PopoverSurface, PopoverTrigger, useId } from '@fluentui/react-components';
import { useIntlMessages, exportMessages } from '../../../intl';

interface INewResourceGroupProps {
  onAddNewResourceGroup: (selectedOption: IDropdownOption) => void;
  resourceGroups: IDropdownOption[];
}

export const NewResourceGroup: React.FC<INewResourceGroupProps> = ({ onAddNewResourceGroup, resourceGroups }) => {
  const [isCalloutVisible, { toggle: toggleIsCalloutVisible }] = useBoolean(false);
  const [name, setName] = useState<string>('');
  const styles = useExportStyles();
  const resourceGroupInputId = useId('input');
  const workflowState = useSelector((state: RootState) => state.workflow);
  const { exportData } = workflowState;
  const { location } = exportData;
  const intlText = useIntlMessages(exportMessages);

  const onChangeName = (_ev: ChangeEvent<HTMLInputElement>, data: InputOnChangeData) => {
    const newName = typeof data.value === 'string' ? data.value : '';
    setName(newName);
  };

  const validation = useMemo(() => {
    return isNameValid(name, intlText, resourceGroups);
  }, [name, intlText, resourceGroups]);

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
        <div className={styles.exportSummaryNewResourceGroup}>
          <Field validationState={validation.validationError ? 'error' : 'none'} validationMessage={validation.validationError} required>
            <Label htmlFor={resourceGroupInputId} size={'small'}>
              {intlText.NAME}
            </Label>
            <Input autoFocus={true} value={name} id={resourceGroupInputId} onChange={onChangeName} />
          </Field>
        </div>
        <Button
          appearance="primary"
          className={styles.exportSummaryConnectionsButton}
          aria-label={intlText.OK}
          disabled={!validation.validName}
          onClick={onClickOk}
        >
          {intlText.OK}
        </Button>
        <Button
          appearance="secondary"
          className={styles.exportSummaryConnectionsButton}
          aria-label={intlText.CANCEL_LABEL}
          onClick={toggleIsCalloutVisible}
        >
          {intlText.CANCEL_LABEL}
        </Button>
      </PopoverSurface>
    </Popover>
  );
};
