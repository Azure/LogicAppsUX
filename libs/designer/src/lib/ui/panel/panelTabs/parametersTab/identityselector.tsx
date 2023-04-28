import constants from '../../../../common/constants';
import { updateIdentityChangeInConection } from '../../../../core/actions/bjsworkflow/connections';
import type { AppDispatch, RootState } from '../../../../core/store';
import { getConnectionReference } from '../../../../core/utils/connectors/connections';
import type { IDropdownOption, IDropdownStyles } from '@fluentui/react';
import { Dropdown, FontSizes, Label } from '@fluentui/react';
import { WorkflowService } from '@microsoft/designer-client-services-logic-apps';
import type { ManagedIdentity } from '@microsoft/utils-logic-apps';
import { ResourceIdentityType, equals } from '@microsoft/utils-logic-apps';
import type { FormEvent } from 'react';
import { useState } from 'react';
import type { IntlShape } from 'react-intl';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const dropdownStyles: Partial<IDropdownStyles> = {
  caretDownWrapper: {
    lineHeight: 26,
    right: 8,
  },
  caretDown: {
    fontSize: FontSizes.small,
  },
  dropdownOptionText: {
    fontSize: FontSizes.small,
  },
  title: {
    border: 'none',
    fontSize: FontSizes.small,
    lineHeight: 26,
  },
};

interface IdentitySelectorProps {
  nodeId: string;
  readOnly: boolean;
}

export const IdentitySelector = (props: IdentitySelectorProps) => {
  const { nodeId, readOnly } = props;

  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const identity = WorkflowService().getAppIdentity?.() as ManagedIdentity;
  const options = getDropdownOptions(identity, intl);

  const selectedIdentity = useSelector((state: RootState) => {
    const { connectionProperties } = getConnectionReference(state.connections, nodeId);
    return equals(connectionProperties?.authentication?.type, 'ManagedServiceIdentity')
      ? connectionProperties?.authentication?.identity ?? constants.SYSTEM_ASSIGNED_MANAGED_IDENTITY
      : undefined;
  });

  const [selectedKey, setSelectedKey] = useState(selectedIdentity);

  const handleUpdateIdentity = (_event: FormEvent, option?: IDropdownOption) => {
    if (option) {
      setSelectedKey(option.key);
      dispatch(updateIdentityChangeInConection({ nodeId, identity: option.key as string }));
    }
  };

  const labelText = intl.formatMessage({
    defaultMessage: 'Managed identity',
    description: 'Text to show label for managed identity selector',
  });
  const placeholderText = intl.formatMessage({
    defaultMessage: 'Select a managed identity',
    description: 'Placeholder text for identity selection',
  });

  return (
    <div className="connection-info">
      {<Label className="label">{labelText}</Label>}
      <Dropdown
        ariaLabel={labelText}
        disabled={readOnly}
        options={options}
        defaultSelectedKey={selectedKey}
        placeholder={placeholderText}
        styles={dropdownStyles}
        onChange={handleUpdateIdentity}
      />
    </div>
  );
};

const getDropdownOptions = (managedIdentity: ManagedIdentity, intl: IntlShape): IDropdownOption[] => {
  const options: IDropdownOption[] = [];
  const { type, userAssignedIdentities } = managedIdentity;
  const systemAssigned = intl.formatMessage({
    defaultMessage: 'System-assigned managed identity',
    description: 'Text for system assigned managed identity',
  });

  if (equals(type, ResourceIdentityType.SYSTEM_ASSIGNED) || equals(type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)) {
    options.push({ key: constants.SYSTEM_ASSIGNED_MANAGED_IDENTITY, text: systemAssigned });
  }

  if (equals(type, ResourceIdentityType.USER_ASSIGNED) || equals(type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)) {
    for (const identity of Object.keys(userAssignedIdentities ?? {})) {
      options.push({ key: identity, text: identity.split('/').at(-1) ?? identity });
    }
  }

  return options;
};
