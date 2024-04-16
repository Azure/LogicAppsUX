import type { IFontIconProps } from '@fluentui/react';
import { FontIcon, css } from '@fluentui/react';
import type React from 'react';
import { useIntl } from 'react-intl';

export interface IFlowDiffPreviewProps {
  onOperationClick?: (operationName: string) => void;
}

export const FlowDiffPreview: React.FC<IFlowDiffPreviewProps> = (/*TODO: add props here */) => {
  const added = true;
  const changed = true;
  const removed = false;
  const intl = useIntl();
  const intlText = {
    checkActions: intl.formatMessage({
      defaultMessage: 'Check these actions to see if any parameters need to be set.',
      id: 'kHs5R4',
      description: 'Chatbot flow preview message reminding user to check workflow actions',
    }),
    updatingFlowCard: {
      addedOperation: intl.formatMessage({
        defaultMessage: 'Added this action',
        id: 'Vx6fwP',
        description: 'Chatbot added operation sentence format',
      }),
      removedOperation: intl.formatMessage({
        defaultMessage: 'Removed this action',
        id: 'LaFlFh',
        description: 'Chatbot removed operation sentence format',
      }),
      changedOperation: intl.formatMessage({
        defaultMessage: 'Updated this action',
        id: '6gblzt',
        description: 'Chatbot changed operation sentence format',
      }),
    },
  };

  return (
    <div>
      {removed && (
        <>
          <div className={'msla-flow-diff-preview-description'}>{intlText.updatingFlowCard.removedOperation}</div>
          <OperationItemsList
            operations={[]} // TODO: hardcoded for now, need to fill with operations
            className={'msla-flow-diff-preview-operation-list'}
          />
        </>
      )}
      {changed && (
        <>
          <div className={'msla-flow-diff-preview-description'}>{intlText.updatingFlowCard.changedOperation}</div>
          <OperationItemsList
            operations={[{ info: { operationName: 'Send an email', connectionName: 'Office 365 Outlook' } }]} // TODO: hardcoded for now, need to fill with operations
            className={'msla-flow-diff-preview-operation-list'}
          />
        </>
      )}
      {added && (
        <>
          <div className={'msla-flow-diff-preview-description'}>{intlText.updatingFlowCard.addedOperation}</div>
          <OperationItemsList
            operations={[{ info: { operationName: 'Get manager', connectionName: 'Office 365 Users' } }]} // TODO: hardcoded for now, need to fill with operations
            className={'msla-flow-diff-preview-operation-list'}
          />
        </>
      )}
      {(changed || added) && <div>{intlText.checkActions}</div>}
    </div>
  );
};

export const OperationItem: React.FC<OperationItemProps> = ({ operation, isAction, onClick, disabled, statusIcon }) => {
  return (
    <div
      className={css('msla-flowpreview-operation', isAction && 'is-action', onClick && 'is-button', disabled && 'is-disabled')}
      style={{
        borderLeftColor: 'white', // TODO: change to match icon color
      }}
      onClick={!disabled && onClick ? onClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-disabled={disabled}
    >
      {/* TODO: Add API icon for action here*/}
      <div className={'msla-flowpreview-operation-label'}>
        <span className={'msla-flowpreview-operation-name'}>{operation.operationName /*getOperationDisplayName(operation)*/}</span>
        <span className={'msla-flowpreview-operation-connection'}>{operation.connectionName /*actionSubtitle*/}</span>
      </div>
      {statusIcon && <FontIcon {...statusIcon} className={css('msla-flowpreview-operation-statusicon', statusIcon.className)} />}
    </div>
  );
};

export const OperationItemsList: React.FC<OperationItemsListProps> = ({ operations, isAction, className }) => (
  <ul className={className}>
    {operations.map((operation) => (
      <li key={operation.info.operationName}>
        <OperationItem
          operation={operation.info}
          isAction={isAction}
          onClick={operation.onClick}
          disabled={operation.disabled}
          statusIcon={operation.statusIcon}
        />
      </li>
    ))}
  </ul>
);

export type OperationInfo = {
  operationName: string;
  operationType?: string;
  operationKind?: string;
  connectionName?: string;
  operationId?: string;
  overrides?: {
    displayName?: string;
    iconUri?: string;
    brandColor?: string;
    operationId?: string;
  };
};

export type OperationInfoItemProps = {
  info: OperationInfo;
  disabled?: boolean;
  statusIcon?: IFontIconProps;
  onClick?: () => void;
};

type OperationItemProps = {
  operation: OperationInfo;
  isAction?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  statusIcon?: IFontIconProps;
};

type OperationItemsListProps = {
  operations: OperationInfoItemProps[];
  isAction?: boolean;
  className?: string;
};
