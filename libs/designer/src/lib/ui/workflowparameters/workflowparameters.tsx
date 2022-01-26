import { CommandBarButton, IButtonStyles, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon, IIconProps, IIconStyles } from '@fluentui/react/lib/Icon';
import { Link } from '@fluentui/react/lib/Link';
import { List } from '@fluentui/react/lib/List';
import { IMessageBarStyles, MessageBar } from '@fluentui/react/lib/MessageBar';
import { getTheme, registerOnThemeChangeCallback, removeOnThemeChangeCallback } from '@fluentui/react/lib/Styling';
import React, { useState, useEffect } from 'react';
import { isHighContrastBlackOrInverted } from '../utils/theme';
import {
  WorkflowParameter,
  WorkflowParameterDefinition,
  WorkflowParameterDeleteHandler,
  WorkflowParameterUpdateHandler,
} from './workflowparameter';
import { useIntl, FormattedMessage } from 'react-intl';
import Constants from '../constants';

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
          defaultMessage='The parameters will be saved when the workflow is saved. You can edit it here before save or edit it in the parameter page after save.'
          description='Text for Info Bar'
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
  standardMode?: boolean;
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

export default function WorkflowParameters({ parameters = [], isReadOnly, standardMode, onManageParameters, onAddParameter, onDeleteParameter, onUpdateParameter, validationErrors, onRegisterLanguageProvider }: WorkflowParametersProps): JSX.Element {
  const [isInverted, setIsInverted] = useState(isHighContrastBlackOrInverted);

  const intl = useIntl();

  const addIcon: IIconProps = { iconName: 'Add' };
  const buttonStyles: IButtonStyles = {
    root: {
      backgroundColor: isInverted ? getTheme().palette.themePrimary : Constants.BRAND_COLOR,
    },
  };

  useEffect(() => {
    registerOnThemeChangeCallback(_handleThemeChange);
    return () => {
      removeOnThemeChangeCallback(_handleThemeChange);
    }
  }, []);

  const _handleThemeChange = (): void => {
    setIsInverted(isHighContrastBlackOrInverted());
  };

  const _handleAddParameter = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (onAddParameter) {
      event.stopPropagation();
      onAddParameter();
    }
  };

  const _renderTitleAndDescription = (): JSX.Element => {
    const iconStyles: IIconStyles = {
      root: {
        color: isInverted ? getTheme().palette.themePrimary : Constants.BRAND_COLOR,
        fontSize: 50,
      },
    };

    const descriptionStandard1 = intl.formatMessage({
      defaultMessage: 'Parameters are shared across workflows in a Logic App.',
      description: 'Description for Standard Mode Part 1'
    });
    const descriptionStandard2 = intl.formatMessage({
      defaultMessage: 'To reference a parameter, use the dynamic content list.',
      description: 'Description for Standard Mode Part 2'
    });
    const iconLabel = intl.formatMessage({
      defaultMessage: 'Parameter',
      description: 'Parameter Icon Label'
    });
    const title = intl.formatMessage({
      defaultMessage: 'Parameters',
      description: 'Parameter Title'
    });
    const description1 = intl.formatMessage({
      defaultMessage: 'Create, manage Logic Apps parameters, give it a default value.',
      description: 'Description for nonStandard Mode Part 1'
    });
    const description2 = intl.formatMessage({
      defaultMessage: 'Parameters used in Logic App will be converted into Azure Resource Manager template during deployment template generation.',
      description: 'Description for nonStandard Mode Part 2'
    });


    if (standardMode) {
      return (
        <div className="msla-workflow-parameters-empty">
          {/* TODO: 13091658 Parameters ICON
          <img src={ParametersIcon} alt="" role="presentation" /> 
          */}
          <div className="msla-workflow-parameters-text-standard">
            <p>{descriptionStandard1}</p>
            <p>{descriptionStandard2}</p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="msla-workflow-parameters-empty">
          <Icon iconName="Parameter" styles={iconStyles} ariaLabel={iconLabel} />
          <h1 className="msla-workflow-parameters-title">{title}</h1>
          <div className="msla-workflow-parameters-text">
            <p>{description1}</p>
            <p>{description2}</p>
          </div>
        </div>
      );
    }
  }

  const _renderManageParametersLink = (): JSX.Element => {
    return (
      <footer className="msla-workflow-parameters-link">
        <Link className="msla-workflow-parameters-link-text" onClick={onManageParameters}>
          <FormattedMessage
            defaultMessage='Edit in JSON'
            description='Parameter Link Text'
          />
        </Link>
        <Icon iconName="NavigateExternalInline" styles={navigateIconStyle} className="msla-workflow-parameters-link-icon" />
      </footer>
    );
  }

  const _renderParameter = (item?: WorkflowParameterDefinition): JSX.Element => {
    // TODO render if no item exists
    if (!item) {
      return <div> </div>;
    }
    const parameterErrors = validationErrors ? validationErrors[item.id] : undefined;
    return (
      <WorkflowParameter
        key={item.id}
        definition={item}
        isReadOnly={isReadOnly}
        onChange={onUpdateParameter}
        onDelete={onDeleteParameter}
        onRegisterLanguageProvider={onRegisterLanguageProvider}
        validationErrors={parameterErrors}
        standardMode={standardMode}
      />
    );
  };

  if (standardMode) {
    const createText = intl.formatMessage({
      defaultMessage: 'Create parameter',
      description: 'Create Parameter Text'
    });
    return (
      <div className="msla-workflow-parameters">
        <h3 className="msla-workflow-parameters-create">
          <FormattedMessage
            defaultMessage='Parameters'
            description='Create Title'
          />
        </h3>
        {parameters.length ? <InfoBar isInverted={isInverted} /> : null}
        <div className="msla-workflow-parameters-add-standard">
          <CommandBarButton
            className="msla-workflow-parameters-create-button"
            disabled={isReadOnly}
            text={createText}
            iconProps={addIcon}
            onClick={_handleAddParameter}
          />
        </div>
        {parameters.length ? null : _renderTitleAndDescription()}
        {parameters.length ? <List items={parameters} onRenderCell={_renderParameter} /> : null}
        {onManageParameters ? _renderManageParametersLink() : null}
      </div>
    );
  } else {
    const addText = intl.formatMessage({
      defaultMessage: 'Add Parameter',
      description: 'Add Parameter Text'
    });
    return (
      <div className="msla-workflow-parameters">
        {parameters.length ? null : _renderTitleAndDescription()}
        {parameters.length ? <List items={parameters} onRenderCell={_renderParameter} /> : null}
        <div className="msla-workflow-parameters-add">
          <PrimaryButton text={addText} styles={buttonStyles} onClick={_handleAddParameter} disabled={isReadOnly} />
        </div>
      </div>
    );
  }
}
