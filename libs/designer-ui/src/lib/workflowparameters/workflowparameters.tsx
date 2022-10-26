import ParametersIcon from '../card/images/parameters.svg';
import Constants from '../constants';
import { isHighContrastBlack } from '../utils/theme';
import type { WorkflowParameterDefinition, WorkflowParameterDeleteHandler, WorkflowParameterUpdateHandler } from './workflowparameter';
import { WorkflowParameter } from './workflowparameter';
import type { IIconProps, IIconStyles, IMessageBarStyles } from '@fluentui/react';
import { CommandBarButton, Icon, Link, List, MessageBar, useTheme } from '@fluentui/react';
import { useIntl } from 'react-intl';

const navigateIconStyle: IIconStyles = {
  root: {
    color: Constants.BRAND_COLOR,
  },
};

const lightMessageBarStyles: IMessageBarStyles = {
  root: {
    backgroundColor: Constants.BACKGROUND_COLOR_LIGHT,
  },
  icon: {
    color: 'gray',
  },
  text: {
    color: Constants.BACKGROUND_COLOR_DARK,
  },
};

const darkMessageBarStyles: IMessageBarStyles = {
  root: {
    backgroundColor: Constants.BACKGROUND_COLOR_DARK,
  },
  icon: {
    color: 'white',
  },
  text: {
    color: 'white',
  },
};

const InfoBar = ({ isInverted }: { isInverted: boolean }) => {
  const intl = useIntl();
  const text = intl.formatMessage({
    defaultMessage:
      'The parameters will be saved when the workflow is saved. You can edit it here before save or edit it in the parameter page after save.',
    description: 'Text for Info Bar',
  });
  return (
    <div className="msla-workflow-parameters-message-bar">
      <MessageBar isMultiline={true} styles={isInverted ? darkMessageBarStyles : lightMessageBarStyles}>
        {text}
      </MessageBar>
    </div>
  );
};

type OnClickHandler = () => void;

export interface WorkflowParametersProps {
  isEditable?: boolean;
  isReadOnly?: boolean;
  parameters: WorkflowParameterDefinition[];
  validationErrors?: Record<string, Record<string, string | undefined>>;
  onAddParameter?: OnClickHandler;
  onDeleteParameter?: WorkflowParameterDeleteHandler;
  onManageParameters?: OnClickHandler;
  onRegisterLanguageProvider?: OnClickHandler;
  onUpdateParameter?: WorkflowParameterUpdateHandler;
}

export interface WorkflowParametersState {
  isInverted: boolean;
}

export function WorkflowParameters({
  parameters = [],
  isReadOnly,
  onManageParameters,
  onAddParameter,
  onDeleteParameter,
  onUpdateParameter,
  validationErrors,
  onRegisterLanguageProvider,
}: WorkflowParametersProps): JSX.Element {
  const theme = useTheme();
  const isInverted = isHighContrastBlack() || theme.isInverted;

  const intl = useIntl();

  const addIcon: IIconProps = { iconName: 'Add' };

  const handleAddParameter = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (onAddParameter) {
      event.stopPropagation();
      onAddParameter();
    }
  };

  const renderTitleAndDescription = (): JSX.Element => {
    const description1 = intl.formatMessage({
      defaultMessage: 'Parameters are shared across workflows in a Logic App.',
      description: 'Description for Workflow Parameters Part 1',
    });
    const description2 = intl.formatMessage({
      defaultMessage: 'To reference a parameter, use the dynamic content list.',
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

  const ManageParametersLink = (): JSX.Element => {
    const intl = useIntl();

    const jsonText = intl.formatMessage({
      defaultMessage: 'Edit in JSON',
      description: 'Parameter Link Text',
    });
    return (
      <footer className="msla-workflow-parameters-link">
        <Link className="msla-workflow-parameters-link-text" onClick={onManageParameters}>
          {jsonText}
        </Link>
        <Icon iconName="NavigateExternalInline" styles={navigateIconStyle} className="msla-workflow-parameters-link-icon" />
      </footer>
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
    description: 'Create Parameter Text',
  });
  const createTitleText = intl.formatMessage({
    defaultMessage: 'Parameters',
    description: 'Create Title',
  });
  return (
    <div className="msla-workflow-parameters">
      <h3 className="msla-workflow-parameters-create">{createTitleText}</h3>
      {parameters.length ? <InfoBar isInverted={isInverted} /> : null}
      <div className="msla-workflow-parameters-add">
        <CommandBarButton
          className="msla-workflow-parameters-create-button"
          disabled={isReadOnly}
          text={createText}
          iconProps={addIcon}
          onClick={handleAddParameter}
        />
      </div>
      {parameters.length ? null : renderTitleAndDescription()}
      {parameters.length ? <List items={parameters} onRenderCell={renderParameter} /> : null}
      {onManageParameters ? <ManageParametersLink /> : null}
    </div>
  );
}
