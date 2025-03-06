import { Button, Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-components';
import { MoreHorizontalFilled } from '@fluentui/react-icons';
import type React from 'react';
import { useIntl } from 'react-intl';
import type { ConnectionWithFlattenedProperties } from './selectConnection.helpers';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

interface ConnectionTableDetailsButtonProps {
  connection: ConnectionWithFlattenedProperties;
  isXrmConnectionReferenceMode: boolean;
}

export const ConnectionTableDetailsButton = (props: ConnectionTableDetailsButtonProps): React.ReactElement => {
  const { connection, isXrmConnectionReferenceMode } = props;

  const intl = useIntl();

  const detailsHeader = intl.formatMessage({
    defaultMessage: 'Connection details',
    id: '001fb23d03a2',
    description: 'Header for popup containing connection details',
  });

  const connectionNameLabel = isXrmConnectionReferenceMode
    ? intl.formatMessage({
        defaultMessage: 'Logical name',
        id: 'cb172d430aa3',
        description: 'Label for connection reference logical name',
      })
    : intl.formatMessage({
        defaultMessage: 'Name',
        id: '0cd42d16be68',
        description: 'Label for connection name',
      });

  const createdDateLabel = intl.formatMessage({
    defaultMessage: 'Created',
    id: '701c3b4829dd',
    description: 'Label for connection creation date',
  });

  return (
    <Popover
      onOpenChange={(_e, data) => {
        LoggerService().log({
          area: 'ConnectionTableDetailsButton.Popover.onOpenChange',
          args: [`connection:${connection.id}`, `isOpen:${data.open}`],
          level: LogEntryLevel.Verbose,
          message: 'Details popover was toggled.',
        });
      }}
      positioning="before"
      withArrow={true}
    >
      <PopoverTrigger disableButtonEnhancement={true}>
        <Button
          appearance="subtle"
          aria-label="Edit"
          icon={<MoreHorizontalFilled />}
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
      </PopoverTrigger>
      <PopoverSurface
        className="msla-connection-details-popover"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <h3>{detailsHeader}</h3>
        <h4>{connectionNameLabel}</h4>
        <p>{connection.name}</p>
        <h4>{createdDateLabel}</h4>
        <p>{intl.formatDate(connection.createdTime, { dateStyle: 'long', timeStyle: 'short' })}</p>
      </PopoverSurface>
    </Popover>
  );
};
