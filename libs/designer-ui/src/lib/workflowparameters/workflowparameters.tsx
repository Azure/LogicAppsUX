import { CommandBarButton } from '@fluentui/react/lib/Button';
import { Icon, IIconProps, IIconStyles } from '@fluentui/react/lib/Icon';
import { Link } from '@fluentui/react/lib/Link';
import { List } from '@fluentui/react/lib/List';
import { IMessageBarStyles, MessageBar } from '@fluentui/react/lib/MessageBar';
import { registerOnThemeChangeCallback, removeOnThemeChangeCallback } from '@fluentui/react/lib/Styling';
import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import ParametersIcon from '../card/images/parameters.svg';
import Constants from '../constants';
import { isHighContrastBlackOrInverted } from '../utils/theme';
import {
  WorkflowParameter,
  WorkflowParameterDefinition,
  WorkflowParameterDeleteHandler,
  WorkflowParameterUpdateHandler,
} from './workflowparameter';

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
  return (
    <div className="msla-workflow-parameters-message-bar">
      <MessageBar isMultiline={true} styles={isInverted ? darkMessageBarStyles : lightMessageBarStyles}>
        <FormattedMessage
          defaultMessage="The parameters will be saved when the workflow is saved. You can edit it here before save or edit it in the parameter page after save."
          description="Text for Info Bar"
        />
      </MessageBar>
    </div>
  );
};

type OnClickHandler = () => void;

export interface WorkflowParametersProps {
  isEditable?: boolean;
  isReadOnly?: boolean;
  parameters: WorkflowParameterDefinition[];
  validationErrors?: Record<string, Record<string, string>>;
  onAddParameter?: OnClickHandler;
  onDeleteParameter?: WorkflowParameterDeleteHandler;
  onManageParameters?: OnClickHandler;
  onRegisterLanguageProvider?: OnClickHandler;
  onUpdateParameter?: WorkflowParameterUpdateHandler;
}

export interface WorkflowParametersState {
  isInverted: boolean;
}

export default function WorkflowParameters({
  parameters = [],
  isReadOnly,
  onManageParameters,
  onAddParameter,
  onDeleteParameter,
  onUpdateParameter,
  validationErrors,
  onRegisterLanguageProvider,
}: WorkflowParametersProps): JSX.Element {
  const [isInverted, setIsInverted] = useState(isHighContrastBlackOrInverted);

  const intl = useIntl();

  const addIcon: IIconProps = { iconName: 'Add' };

  useEffect(() => {
    registerOnThemeChangeCallback(handleThemeChange);
    return () => {
      removeOnThemeChangeCallback(handleThemeChange);
    };
  }, []);

  const handleThemeChange = (): void => {
    setIsInverted(isHighContrastBlackOrInverted());
  };

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

  const renderManageParametersLink = (): JSX.Element => {
    return (
      <footer className="msla-workflow-parameters-link">
        <Link className="msla-workflow-parameters-link-text" onClick={onManageParameters}>
          <FormattedMessage defaultMessage="Edit in JSON" description="Parameter Link Text" />
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
        definition={item ?? { id: 'id' }}
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
  return (
    <div className="msla-workflow-parameters">
      <h3 className="msla-workflow-parameters-create">
        <FormattedMessage defaultMessage="Parameters" description="Create Title" />
      </h3>
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
      {onManageParameters ? renderManageParametersLink() : null}
    </div>
  );
}
