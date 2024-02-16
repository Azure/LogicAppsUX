import constants from '../../../../../common/constants';
import { updateIdentityChangeInConnection } from '../../../../../core/actions/bjsworkflow/connections';
import { ErrorLevel, updateErrorDetails } from '../../../../../core/state/operation/operationMetadataSlice';
import { setIsWorkflowDirty } from '../../../../../core/state/workflow/workflowSlice';
import type { AppDispatch, RootState } from '../../../../../core/store';
import { getConnectionReference, isIdentityPresentInLogicApp } from '../../../../../core/utils/connectors/connections';
import type { IDropdownOption, IDropdownStyles } from '@fluentui/react';
import { Dropdown, FontSizes, Label } from '@fluentui/react';
import { WorkflowService } from '@microsoft/logic-apps-shared';
import type { ManagedIdentity } from '@microsoft/logic-apps-shared';
import { isIdentityAssociatedWithLogicApp, equals, getIdentityDropdownOptions } from '@microsoft/logic-apps-shared';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
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
  const options = getIdentityDropdownOptions(identity, intl);

  const selectedIdentity = useSelector((state: RootState) => {
    const { connectionProperties } = getConnectionReference(state.connections, nodeId);
    return equals(connectionProperties?.authentication?.type, 'ManagedServiceIdentity')
      ? connectionProperties?.authentication?.identity ?? constants.SYSTEM_ASSIGNED_MANAGED_IDENTITY
      : undefined;
  });

  const [selectedKey, setSelectedKey] = useState(selectedIdentity);

  useEffect(() => {
    if (!isIdentityPresentInLogicApp(selectedKey, identity)) {
      dispatch(
        updateErrorDetails({
          id: nodeId,
          errorInfo: {
            level: ErrorLevel.Connection,
            message: isIdentityAssociatedWithLogicApp(identity)
              ? intl.formatMessage({
                  defaultMessage:
                    'The managed identity used with this operation no longer exists. To continue, select an available identity or change the connection.',
                  description: 'Erorr mesade when managed identity is not present in logic apps',
                })
              : intl.formatMessage({
                  defaultMessage:
                    'The managed identity used with this operation no longer exists. To continue, set up an identity or change the connection.',
                  description: 'Error message when logic app doesnt have managed identities',
                }),
          },
        })
      );
    }
  }, [identity, dispatch, selectedKey, nodeId, intl]);

  const handleUpdateIdentity = (_event: FormEvent, option?: IDropdownOption) => {
    dispatch(setIsWorkflowDirty(true));
    if (option) {
      setSelectedKey(option.key);
      dispatch(updateIdentityChangeInConnection({ nodeId, identity: option.key as string }));
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
    <div className="identity-selector">
      <Label className="label">{labelText}</Label>
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
