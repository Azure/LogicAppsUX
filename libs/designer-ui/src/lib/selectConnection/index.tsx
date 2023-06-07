import type { IColumn } from '@fluentui/react';
import {
  MessageBar,
  MessageBarType,
  Icon,
  TooltipHost,
  MarqueeSelection,
  DefaultButton,
  Spinner,
  SpinnerSize,
  DetailsList,
  SelectionMode,
  DetailsListLayoutMode,
  Selection,
} from '@fluentui/react';
import type { Connection } from '@microsoft/utils-logic-apps';
import { getConnectionErrors, getIdLeaf } from '@microsoft/utils-logic-apps';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

export interface SelectConnectionProps {
  connections: Connection[];
  currentConnectionId?: string;
  isLoading?: boolean;
  showIdentityErrorBanner?: boolean;
  saveSelectionCallback: (connection?: Connection) => void;
  cancelSelectionCallback: () => void;
  createConnectionCallback: () => void;
  isXrmConnectionReferenceMode: boolean;
}

export const SelectConnection = (props: SelectConnectionProps): JSX.Element => {
  const {
    connections,
    currentConnectionId,
    isLoading,
    showIdentityErrorBanner,
    saveSelectionCallback,
    cancelSelectionCallback,
    createConnectionCallback,
    isXrmConnectionReferenceMode,
  } = props;

  const intl = useIntl();

  // We need to flatten the connection to allow the detail list access to nested props
  const flattenedConnections = connections.map((connection) => {
    const errors = getConnectionErrors(connection);
    return {
      ...connection,
      ...connection.properties,
      invalid:
        errors.length > 0 ? (
          <div className="msla-connection-error-icon-container">
            <TooltipHost content={errors.map((error) => error.error?.message).join(', ')}>
              <Icon iconName="Error" className="msla-connection-error-icon" styles={{ root: { color: '#e00202' } }} />
            </TooltipHost>
          </div>
        ) : null,
    };
  });

  const areIdLeavesEqual = (id1?: string, id2?: string): boolean => getIdLeaf(id1) === getIdLeaf(id2);

  const [select, setSelect] = useState(
    new Selection({
      onSelectionChanged: () => {
        const newSelection = select.getSelection()[0] as any;
        if (newSelection) {
          // This if statement avoids the initial selection in the details list
          if (!areIdLeavesEqual(newSelection.id, currentConnectionId)) saveSelectionCallback(newSelection);
        } else cancelSelectionCallback(); // User clicked the existing connection, keep selection the same and return
      },
    })
  );

  // Assign connection on initial load
  useEffect(() => {
    if (currentConnectionId) {
      const index = connections.findIndex((conn) => areIdLeavesEqual(conn.id, currentConnectionId));
      if (index >= 0) {
        setSelect((currentSelect) => {
          currentSelect.setIndexSelected(index, true, false);
          return currentSelect;
        });
      }
    }
  }, [connections, currentConnectionId]);

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
      minWidth: 180,
      maxWidth: 200,
      isResizable: true,
    },
    {
      key: 'name',
      name: isXrmConnectionReferenceMode
        ? intl.formatMessage({
            defaultMessage: 'Logical Name',
            description: 'Column header for connection reference logical name',
          })
        : intl.formatMessage({
            defaultMessage: 'Name',
            description: 'Column header for connection name',
          }),
      ariaLabel: intl.formatMessage({
        defaultMessage: 'Connection name',
        description: 'aria label description for connection name',
      }),
      fieldName: 'name',
      minWidth: 80,
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
      minWidth: 80,
      maxWidth: 100,
    },
  ];

  const componentDescription = isXrmConnectionReferenceMode
    ? intl.formatMessage({
        defaultMessage: 'Select an existing connection reference or create a new one.',
        description: 'Select an existing connection reference or create a new one.',
      })
    : intl.formatMessage({
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

      <MarqueeSelection selection={select}>
        <DetailsList
          className="msla-connections-list"
          items={flattenedConnections}
          columns={columns}
          setKey="set"
          selection={select}
          selectionMode={SelectionMode.single}
          layoutMode={DetailsListLayoutMode.justified}
          isHeaderVisible={true}
          selectionPreservedOnEmptyClick={true}
          enterModalSelectionOnTouch={true}
          checkButtonAriaLabel={checkButtonAriaLabel}
        />
      </MarqueeSelection>

      <div className="msla-select-connection-actions-container">
        <DefaultButton text={buttonAddText} ariaLabel={buttonAddAria} onClick={createConnectionCallback} />
        <DefaultButton text={buttonCancelText} ariaLabel={buttonCancelAria} onClick={cancelSelectionCallback} />
      </div>
    </div>
  );
};
