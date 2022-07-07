import { getConnectionErrors } from '../helper';
import INTL_STRINGS from './selectConnectionStrings';
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
      name: intl.formatMessage(INTL_STRINGS.COLUMN_INVALID),
      ariaLabel: intl.formatMessage(INTL_STRINGS.COLUMN_INVALID_ARIA),
      fieldName: 'invalid',
      minWidth: 50,
      maxWidth: 50,
    },
    {
      key: 'displayName',
      name: intl.formatMessage(INTL_STRINGS.COLUMN_DISPLAY_NAME),
      ariaLabel: intl.formatMessage(INTL_STRINGS.COLUMN_DISPLAY_NAME_ARIA),
      fieldName: 'displayName',
      minWidth: 200,
      maxWidth: 200,
      isResizable: true,
    },
    {
      key: 'name',
      name: intl.formatMessage(INTL_STRINGS.COLUMN_NAME),
      ariaLabel: intl.formatMessage(INTL_STRINGS.COLUMN_NAME_ARIA),
      fieldName: 'name',
      minWidth: 100,
      maxWidth: 100,
      isResizable: true,
    },
    {
      key: 'gateway',
      name: intl.formatMessage(INTL_STRINGS.COLUMN_GATEWAY),
      ariaLabel: intl.formatMessage(INTL_STRINGS.COLUMN_GATEWAY_ARIA),
      fieldName: 'gateway',
      minWidth: 100,
      maxWidth: 100,
    },
  ];

  return (
    <div className="msla-select-connections-container">
      <div>{intl.formatMessage(INTL_STRINGS.COMPONENT_DESCRIPTION)}</div>

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
          onItemInvoked={(connection) => saveSelectionCallback(connection.id)}
          enterModalSelectionOnTouch={true}
          checkButtonAriaLabel={intl.formatMessage(INTL_STRINGS.CHECK_BUTTON_ARIA)}
        />
      </MarqueeSelection>

      <div className="msla-select-connection-actions-container">
        <PrimaryButton
          text={intl.formatMessage(INTL_STRINGS.BUTTON_CREATE)}
          ariaLabel={intl.formatMessage(INTL_STRINGS.BUTTON_CREATE_ARIA)}
          onClick={createNewConnectionCallback}
        />
        <div id="action-gap" style={{ flexGrow: 1 }} />
        <PrimaryButton
          text={intl.formatMessage(INTL_STRINGS.BUTTON_SAVE)}
          ariaLabel={intl.formatMessage(INTL_STRINGS.BUTTON_SAVE_ARIA)}
          onClick={() => saveSelectionCallback(selection?.id)}
        />
        <DefaultButton
          text={intl.formatMessage(INTL_STRINGS.BUTTON_CANCEL)}
          ariaLabel={intl.formatMessage(INTL_STRINGS.BUTTON_CANCEL_ARIA)}
          onClick={cancelSelectionCallback}
        />
      </div>
    </div>
  );
};
