import { getConnectionErrors } from '../helper';
import type { IColumn } from '@fluentui/react';
import {
  MessageBar,
  MessageBarType,
  Icon,
  TooltipHost,
  MarqueeSelection,
  PrimaryButton,
  DefaultButton,
  Spinner,
  SpinnerSize,
  DetailsList,
  SelectionMode,
  DetailsListLayoutMode,
  Selection,
} from '@fluentui/react';
import type { Connection } from '@microsoft-logic-apps/utils';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface SelectConnectionProps {
  connections: Connection[];
  isLoading?: boolean;
  showIdentityErrorBanner?: boolean;
  saveSelectionCallback: (connection?: Connection) => void;
  cancelSelectionCallback: () => void;
  createNewConnectionCallback: () => void;
}

export const SelectConnection = (props: SelectConnectionProps): JSX.Element => {
  const { connections, isLoading, showIdentityErrorBanner, saveSelectionCallback, cancelSelectionCallback, createNewConnectionCallback } =
    props;

  const intl = useIntl();

  // We need to flatten the connection to allow the detail list access to nested props
  const flattenedConnections = connections.map((connection) => {
    const errors = getConnectionErrors(connection);

    return {
      ...connection,
      ...connection.properties,
      invalid: errors.length ? (
        <div className="msla-connection-error-icon-container">
          <TooltipHost content={errors.map((error) => error.error?.message).join(', ')}>
            <Icon iconName="Error" className="msla-connection-error-icon" />
          </TooltipHost>
        </div>
      ) : null,
    };
  });

  const [selection, setSelection] = useState<Connection>();
  const onSelect: Selection = new Selection({
    onSelectionChanged: () => {
      const newSelection = onSelect.getSelection()[0] as any;
      setSelection(newSelection as Connection);
    },
  });

  if (isLoading) {
    return (
      <div className="msla-panel-select-connection-container">
        <Spinner size={SpinnerSize.large} />
      </div>
    );
  }

  const columns: IColumn[] = [
    {
      key: 'invalid',
      name: intl.formatMessage({
        defaultMessage: 'Invalid',
        description: 'Column header for invalid connections',
      }),
      ariaLabel: intl.formatMessage({
        defaultMessage: 'Is connection invalid',
        description: 'aria label description for invalid connections',
      }),
      fieldName: 'invalid',
      minWidth: 50,
      maxWidth: 50,
    },
    {
      key: 'displayName',
      name: intl.formatMessage({
        defaultMessage: 'Display Name',
        description: 'Column header for connection display name',
      }),
      ariaLabel: intl.formatMessage({
        defaultMessage: 'Connection display name',
        description: 'aria label description for connection display name',
      }),
      fieldName: 'displayName',
      minWidth: 200,
      maxWidth: 200,
      isResizable: true,
    },
    {
      key: 'name',
      name: intl.formatMessage({
        defaultMessage: 'Name',
        description: 'Column header for connection name',
      }),
      ariaLabel: intl.formatMessage({
        defaultMessage: 'Connection name',
        description: 'aria label description for connection name',
      }),
      fieldName: 'name',
      minWidth: 100,
      maxWidth: 100,
      isResizable: true,
    },
    {
      key: 'gateway',
      name: intl.formatMessage({
        defaultMessage: 'Gateway',
        description: 'Column header for connection gateway',
      }),
      ariaLabel: intl.formatMessage({
        defaultMessage: 'Connection gateway',
        description: 'aria label description for connection gateway',
      }),
      fieldName: 'gateway',
      minWidth: 100,
      maxWidth: 100,
    },
  ];

  const componentDescription = intl.formatMessage({
    defaultMessage: 'Select an existing connection or create a new one.',
    description: 'Select an existing connection or create a new one.',
  });

  const identityErrorText = intl.formatMessage({
    defaultMessage: 'Invalid connection.',
    description: 'Message shown when the current connection is invalid',
  });

  const checkButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Check to select this connection',
    description: 'aria label description for check button',
  });

  const buttonAddText = intl.formatMessage({
    defaultMessage: 'Add new',
    description: 'Button to add a new connection',
  });

  const buttonAddAria = intl.formatMessage({
    defaultMessage: 'Add a new connection',
    description: 'Aria label description for add button',
  });

  const buttonSaveText = intl.formatMessage({
    defaultMessage: 'Save',
    description: 'Button to save a connection',
  });

  const buttonSaveAria = intl.formatMessage({
    defaultMessage: 'Save the selected connection',
    description: 'Aria label description for save button',
  });

  const buttonCancelText = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Button to cancel a connection',
  });

  const buttonCancelAria = intl.formatMessage({
    defaultMessage: 'Cancel the selection',
    description: 'Aria label description for cancel button',
  });

  return (
    <div className="msla-select-connections-container">
      {showIdentityErrorBanner ? <MessageBar messageBarType={MessageBarType.error}>{identityErrorText}</MessageBar> : null}

      <div>{componentDescription}</div>

      <MarqueeSelection selection={onSelect}>
        <DetailsList
          className="msla-connections-list"
          items={flattenedConnections}
          columns={columns}
          setKey="single"
          selection={onSelect}
          selectionMode={SelectionMode.single}
          layoutMode={DetailsListLayoutMode.justified}
          isHeaderVisible={true}
          selectionPreservedOnEmptyClick={true}
          onItemInvoked={(connection) => saveSelectionCallback(connection)}
          enterModalSelectionOnTouch={true}
          checkButtonAriaLabel={checkButtonAriaLabel}
        />
      </MarqueeSelection>

      <div className="msla-select-connection-actions-container">
        <PrimaryButton text={buttonAddText} ariaLabel={buttonAddAria} onClick={createNewConnectionCallback} />
        <div id="action-gap" style={{ flexGrow: 1 }} />
        <PrimaryButton text={buttonSaveText} ariaLabel={buttonSaveAria} onClick={() => saveSelectionCallback(selection)} />
        <DefaultButton text={buttonCancelText} ariaLabel={buttonCancelAria} onClick={cancelSelectionCallback} />
      </div>
    </div>
  );
};
