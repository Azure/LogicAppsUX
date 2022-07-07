import { getConnectionErrors } from '../helper';
import type { IColumn } from '@fluentui/react';
import {
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
  saveSelectionCallback: (selectedConnection?: string) => void;
  cancelSelectionCallback: () => void;
  createNewConnectionCallback: () => void;
}

export const SelectConnection = (props: SelectConnectionProps): JSX.Element => {
  const { connections, isLoading, saveSelectionCallback, cancelSelectionCallback, createNewConnectionCallback } = props;

  const intl = useIntl();

  // We need to flatten the connection to allow the detail list access to nested props
  const flattenedConnections = connections.map((connection) => {
    const errors = getConnectionErrors(connection);

    return {
      ...connection,
      ...connection.properties,
      invalid: errors.length ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <TooltipHost content={errors.map((error) => error.error?.message).join(', ')}>
            <Icon iconName="Error" style={{ fontSize: '18px', color: '#e00202' }} />
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
      name: 'Invalid',
      ariaLabel: 'Is connection invalid',
      fieldName: 'invalid',
      minWidth: 50,
      maxWidth: 50,
    },
    {
      key: 'displayName',
      name: 'Display Name',
      ariaLabel: 'Display Name of the connection',
      fieldName: 'displayName',
      minWidth: 200,
      maxWidth: 200,
      isResizable: true,
    },
    {
      key: 'name',
      name: 'Name',
      ariaLabel: 'Name of the connection',
      fieldName: 'name',
      minWidth: 100,
      maxWidth: 100,
      isResizable: true,
    },
    {
      key: 'gateway',
      name: 'Gateway',
      ariaLabel: 'Gateway of the connection',
      fieldName: 'gateway',
      minWidth: 100,
      maxWidth: 100,
    },
  ];

  const componentDescription = intl.formatMessage({
    defaultMessage: 'Select an existing connection or create a new one.',
    description: 'Select an existing connection or create a new one.',
  });

  return (
    <div className="msla-select-connections-container">
      <div>{componentDescription}</div>

      <MarqueeSelection selection={onSelect}>
        <DetailsList
          className="msla-connections-list"
          items={flattenedConnections}
          columns={columns}
          setKey="connection1"
          selection={onSelect}
          selectionMode={SelectionMode.single}
          layoutMode={DetailsListLayoutMode.justified}
          isHeaderVisible={true}
          selectionPreservedOnEmptyClick={true}
          onItemInvoked={(connection) => saveSelectionCallback(connection.id)}
          enterModalSelectionOnTouch={true}
          ariaLabelForSelectionColumn="Toggle selection"
          checkButtonAriaLabel="Select Connection"
        />
      </MarqueeSelection>

      <div className="msla-select-connection-actions-container">
        <PrimaryButton text={'Create New'} onClick={createNewConnectionCallback} />
        <div id="action-gap" style={{ flexGrow: 1 }} />
        <PrimaryButton text={'Save'} onClick={() => saveSelectionCallback(selection?.id)} />
        <DefaultButton text={'Cancel'} onClick={cancelSelectionCallback} />
      </div>
    </div>
  );
};
