import { XLargeText } from '../text';
import ParametersIcon from '../card/images/parameters.svg';
import Constants from '../constants';
import { isHighContrastBlack } from '../utils/theme';
import type { WorkflowParameterDefinition, WorkflowParameterDeleteHandler, WorkflowParameterUpdateHandler } from './workflowparameter';
import { WorkflowParameter } from './workflowparameter';
import { List, useTheme } from '@fluentui/react';
import { Button, MessageBar } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular, Add24Filled, Add24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

const CreateIcon = bundleIcon(Add24Filled, Add24Regular);
const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

const InfoBar = () => {
  const intl = useIntl();
  const text = intl.formatMessage({
    defaultMessage:
      'The parameters will be saved when the workflow is saved. You can edit it here before save or edit it in the parameter page after save.',
    id: 'M6U2LE',
    description: 'Text for Info Bar',
  });
  return (
    <div className="msla-workflow-parameters-message-bar">
      <MessageBar layout="multiline" style={{ padding: '8px 12px' }}>
        {text}
      </MessageBar>
    </div>
  );
};

type OnClickHandler = () => void;

export interface WorkflowParametersProps {
  isEditable?: boolean;
  isReadOnly?: boolean;
  useLegacy?: boolean;
  parameters: WorkflowParameterDefinition[];
  validationErrors?: Record<string, Record<string, string | undefined>>;
  onDismiss?: OnClickHandler;
  onAddParameter?: OnClickHandler;
  onDeleteParameter?: WorkflowParameterDeleteHandler;
  onRegisterLanguageProvider?: OnClickHandler;
  onUpdateParameter?: WorkflowParameterUpdateHandler;
}

export interface WorkflowParametersState {
  isInverted: boolean;
}

export function WorkflowParameters({
  parameters = [],
  isReadOnly,
  useLegacy,
  onDismiss,
  onAddParameter,
  onDeleteParameter,
  onUpdateParameter,
  validationErrors,
  onRegisterLanguageProvider,
}: WorkflowParametersProps): JSX.Element {
  const theme = useTheme();
  const isInverted = isHighContrastBlack() || theme.isInverted;

  const intl = useIntl();

  const handleAddParameter = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (onAddParameter) {
      event.stopPropagation();
      onAddParameter();
    }
  };

  const NoParameters = (): JSX.Element => {
    const description1 = useLegacy
      ? intl.formatMessage({
          defaultMessage: 'Create, manage Logic Apps parameters, give it a default value.',
          id: 'ISaPr+',
          description: 'Description for Workflow Parameters Part 1 for Legacy Parameters mode.',
        })
      : intl.formatMessage({
          defaultMessage: 'Parameters are shared across workflows in a Logic App.',
          id: 'xt5TeT',
          description: 'Description for Workflow Parameters Part 1',
        });
    const description2 = useLegacy
      ? intl.formatMessage({
          defaultMessage:
            'Parameters used in Logic App will be converted into Azure Resource Manager template during deployment template generation.',
          id: '5fmV2Q',
          description: 'Description for Workflow Parameters Part 2 for Legacy Parameters mode.',
        })
      : intl.formatMessage({
          defaultMessage: 'To reference a parameter, use the dynamic content list.',
          id: 'UCNM4L',
          description: 'Description for Workflow Parameters Part 2',
        });

    return (
      <div className="msla-workflow-parameters-empty">
        <img src={ParametersIcon} alt="" role="presentation" />
        <div className="msla-workflow-parameters-text">
          <p>{description1}</p>
          <p>{description2}</p>
        </div>
      </div>
    );
  };

  const renderParameter = (item?: WorkflowParameterDefinition): JSX.Element => {
    // TODO: 12798972 Workflow Parameter
    const parameterErrors = validationErrors && item ? validationErrors[item.id] : undefined;
    return (
      <WorkflowParameter
        key={item?.id}
        definition={item ?? { id: 'id', type: Constants.WORKFLOW_PARAMETER_SERIALIZED_TYPE.ARRAY }}
        isReadOnly={isReadOnly}
        useLegacy={useLegacy}
        isInverted={isInverted}
        onChange={onUpdateParameter}
        onDelete={onDeleteParameter}
        onRegisterLanguageProvider={onRegisterLanguageProvider}
        validationErrors={parameterErrors}
      />
    );
  };

  const createText = intl.formatMessage({
    defaultMessage: 'Create parameter',
    id: 'vwH/XV',
    description: 'Create Parameter Text',
  });
  const titleText = intl.formatMessage({
    defaultMessage: 'Parameters',
    id: 'X7X5ew',
    description: 'Workflow Parameters Title',
  });
  const onClose = () => onDismiss?.();

  const closeButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Close panel',
    id: 'O8Qy7k',
    description: 'Aria label for the close button on the workflow parameters panel',
  });

  return (
    <div className="msla-workflow-parameters">
      <div className="msla-workflow-parameters-heading">
        <XLargeText text={titleText} />
        <Button aria-label={closeButtonAriaLabel} appearance="subtle" onClick={onClose} icon={<CloseIcon />} />
      </div>

      {useLegacy ? null : <InfoBar />}
      <div className="msla-workflow-parameters-add">
        <Button disabled={isReadOnly} onClick={handleAddParameter} icon={<CreateIcon />}>
          {createText}
        </Button>
      </div>
      {parameters.length ? <List items={parameters} onRenderCell={renderParameter} /> : <NoParameters />}
    </div>
  );
}
