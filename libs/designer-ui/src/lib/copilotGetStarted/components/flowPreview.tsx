import { OperationItem } from '../../chatbot/components/flowDiffPreview';
import Constants from '../../constants';
import { getCaseDisplayName, isControlFlowOperation, isVariableOperation, toOperationInfo } from '../helpers/flowPreviewHelper';
import { FontIcon, Icon } from '@fluentui/react/lib/Icon';
import { css } from '@fluentui/react/lib/Utilities';
import React from 'react';
import { useIntl } from 'react-intl';

export interface IFlowDefinition {
  $schema?: string;
  contentVersion?: string;
  description?: string;
  dependencies?: [] | null;

  actions?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  metadata?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  outputs?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  parameters?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  triggers?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface FlowPreviewProps {
  definition: IFlowDefinition;
  /* TODO: Add connection references, etc */
  dataAutomationId?: string;
}

export const FlowPreview: React.FC<FlowPreviewProps> = ({ definition, dataAutomationId }): JSX.Element => {
  const intl = useIntl();
  const intlText = {
    flowPreviewTrigger: intl.formatMessage({
      defaultMessage: 'Trigger',
      id: '+Jryh+',
      description: 'Title for the triggers section in the suggested flow',
    }),
    flowPreviewTriggerDescription: intl.formatMessage({
      defaultMessage: 'The flow starts when this happens',
      id: 'VIN7lB',
      description: 'Description text for triggers in the suggested flow',
    }),
    flowPreviewActions: intl.formatMessage({
      defaultMessage: 'Actions',
      id: '8NFfuB',
      description: 'Title text for actions in the suggested flow',
    }),
    flowPreviewActionsDescription: intl.formatMessage({
      defaultMessage: 'This is what the flow will do',
      id: 'QoPTod',
      description: 'Description text for actions in the suggested flow',
    }),
  };

  const { triggers: trigger, actions: actionsDefinition } = definition;

  return (
    <div className={'msla-flowPreview-root'} data-automation-id={dataAutomationId}>
      {trigger && (
        <>
          <h3 className={'msla-flowPreview-title'}>
            <Icon iconName={'Flag'} className={'msla-flowPreview-titleIcon'} />
            {intlText.flowPreviewTrigger}
          </h3>
          <p className={'msla-flowpreview-description'}>{intlText.flowPreviewTriggerDescription}</p>
          <OperationItem operation={trigger} isAction={false} />
          <FontIcon iconName={'Down'} className={'msla-flowpreview-arrowDown'} />
        </>
      )}

      <h3 className={css('msla-flowPreview-title', 'is-action')}>
        <Icon iconName={'LightningBolt'} className={'msla-flowPreview-titleIcon'} />
        {intlText.flowPreviewActions}
      </h3>
      <p className={'msla-flowpreview-description'}>{intlText.flowPreviewActionsDescription}</p>
      <OperationsPreview
        operations={actionsDefinition}
        options={{ ignoreControlFlowParentOperations: false, ignoreVariablesOperations: false }}
        isAction={true}
        /* TODO: add connection references, etc */
      />
    </div>
  );
};

type PreviewContext = {
  isAction: boolean;
  /* TODO: add connection references, etc */
  options: PreviewOptions;
};

type PreviewOptions = {
  /**
   * Ignore the control flow operations themselves (foreach, etc.) but still include their inner actions.
   */
  ignoreControlFlowParentOperations?: boolean;
  /**
   * Ignore variable-related operations.
   */
  ignoreVariablesOperations?: boolean;
};

/**
 * Represents either a trigger or an action definition contract.
 * * `any` in absence of actual typing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OperationContract = any;

type OperationsPreviewProps = {
  operations: any[]; //Record<string, OperationContract>;
} & PreviewContext;

const OperationsPreview: React.FC<OperationsPreviewProps> = ({ operations, ...context }) => {
  return (
    <>
      {operations.map((operation) => (
        <OperationPreview key={operation.operationName} operationName={operation.operationName} operation={operation} {...context} />
      ))}
    </>
  );
};

type OperationPreviewProps = {
  operationName: string;
  operation: OperationContract;
} & PreviewContext;

const OperationPreview: React.FC<OperationPreviewProps> = ({ operationName, operation, options, ...context }) => {
  const { ignoreControlFlowParentOperations = false, ignoreVariablesOperations = false } = options;

  const operationInfo = toOperationInfo(operationName, operation);
  const intl = useIntl();
  const intlText = {
    flowPreviewConditionTrueLabel: intl.formatMessage({
      defaultMessage: 'True',
      id: 'CBzSJo',
      description: 'Short label to represent when a condition is met.',
    }),
    flowPreviewConditionFalseLabel: intl.formatMessage({
      defaultMessage: 'False',
      id: 'aE+2gr',
      description: 'Short label to represent when a condition is not met.',
    }),
    flowPreviewSwitchDefaultLabel: intl.formatMessage({
      defaultMessage: 'Default',
      id: '9aj+el',
      description: 'Short label to represent the fallback behavior used by default if no other conditions were met.',
    }),
  };

  if (ignoreVariablesOperations && isVariableOperation(operation.type)) {
    return null;
  }

  if (isControlFlowOperation(operation.type)) {
    const subOperations: SubOperations[] = [];

    switch (operation.type) {
      case Constants.NODE.TYPE.FOREACH:
      case Constants.NODE.TYPE.SCOPE:
      case Constants.NODE.TYPE.UNTIL:
        subOperations.push({
          operations: operation.actions,
        });
        break;
      case Constants.NODE.TYPE.IF:
        if (operation.actions) {
          subOperations.push({
            displayName: intlText.flowPreviewConditionTrueLabel,
            operations: operation.actions,
            iconName: 'CheckMark',
          });
        }

        if (operation.else?.actions) {
          subOperations.push({
            displayName: intlText.flowPreviewConditionFalseLabel,
            operations: operation.else.actions,
            iconName: 'Cancel',
          });
        }
        break;
      case Constants.NODE.TYPE.SWITCH:
        subOperations.push(
          ...Object.keys(operation.cases).map((caseName) => ({
            displayName: getCaseDisplayName(caseName),
            operations: operation.cases[caseName].actions || {},
          }))
        );
        if (operation.default?.actions) {
          subOperations.push({
            displayName: intlText.flowPreviewSwitchDefaultLabel,
            operations: operation.default.actions,
          });
        }
        break;

      default:
        break;
    }

    if (ignoreControlFlowParentOperations && subOperations.length === 0) {
      return null;
    }

    return (
      <div className={'msla-operationPreview-blockContainer'}>
        {!ignoreControlFlowParentOperations && <OperationItem operation={operationInfo} {...context} />}
        {subOperations.length > 0 && <SubOperationsPreview subOperations={subOperations} options={options} {...context} />}
      </div>
    );
  }

  return <OperationItem operation={operationInfo} {...context} />;
};

type SubOperations = {
  displayName?: string;
  iconName?: string;
  operations: any[]; // TODO: change once connection references are set up
};

type SubOperationsPreviewProps = { subOperations: SubOperations[] } & PreviewContext;

const SubOperationsPreview: React.FC<SubOperationsPreviewProps> = ({ subOperations, ...context }) => {
  return (
    <div className={'msla-operationPreview-blockSubActionsContainer'}>
      {subOperations.map(({ displayName, iconName, operations }) => {
        return (
          <div key={displayName} className={'msla-operationPreview-blockSubActions'}>
            {(displayName || iconName) && (
              <div className={'msla-operationPreview-blockSubActionsLabel'}>
                {iconName && <FontIcon iconName={iconName} className={'msla-operationPreview-blockSubActionsIcon'} />}
                {displayName}
              </div>
            )}
            <OperationsPreview operations={operations} {...context} />
          </div>
        );
      })}
      {
        // HACK: ensure all sub-actions have the same width by inserting invisible elements taken into account while wrapping and growing
        subOperations.length > 2 &&
          subOperations.map((_, idx) => <div key={idx} className={'msla-operationPreview-blockInvisibleSubActions'} />)
      }
    </div>
  );
};
