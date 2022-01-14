import { CommandBarButton, IButtonStyles, PrimaryButton } from '@fluentui/react/lib/Button';
import { Icon, IIconProps, IIconStyles } from '@fluentui/react/lib/Icon';
import { Link } from '@fluentui/react/lib/Link';
import { List } from '@fluentui/react/lib/List';
import { IMessageBarStyles, MessageBar } from '@fluentui/react/lib/MessageBar';
import { getTheme, registerOnThemeChangeCallback, removeOnThemeChangeCallback } from '@fluentui/react/lib/Styling';
import * as React from 'react';
// import Resources from 'resources';
// import ParametersIcon from '../card/images/parameters.generated';
import { isHighContrastBlackOrInverted } from '../../utils/theme';
import {
  WorkflowParameter,
  WorkflowParameterDefinition,
  WorkflowParameterDeleteHandler,
  WorkflowParameterUpdateHandler,
} from './_workflowparameter';

const brandColor = '#0058AD';
const backgroundColorLight = '#F3F2F1';
const backgroundColorDark = '#514f4e';

const navigateIconStyle: IIconStyles = {
  root: {
    color: brandColor,
  },
};

const lightMessageBarStyles: IMessageBarStyles = {
  root: {
    backgroundColor: backgroundColorLight,
  },
  icon: {
    color: 'gray',
  },
  text: {
    color: '#514f4e',
  },
};

const darkMessageBarStyles: IMessageBarStyles = {
  root: {
    backgroundColor: backgroundColorDark,
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
        {'Resources.WORKFLOW_PARAMETER_MESSAGE_BAR_TEXT'}
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

export default class WorkflowParameters extends React.Component<WorkflowParametersProps, WorkflowParametersState> {
  static defaultProps: WorkflowParametersProps = {
    parameters: [],
  };

  state: WorkflowParametersState = {
    isInverted: isHighContrastBlackOrInverted(),
  };

  componentDidMount(): void {
    registerOnThemeChangeCallback(this._handleThemeChange);
  }

  componentWillUnmount(): void {
    removeOnThemeChangeCallback(this._handleThemeChange);
  }

  render() {
    const { isReadOnly, onManageParameters, parameters, standardMode } = this.props;
    const addIcon: IIconProps = { iconName: 'Add' };
    const { isInverted } = this.state;
    const buttonStyles: IButtonStyles = {
      root: {
        backgroundColor: isInverted ? getTheme().palette.themePrimary : brandColor,
      },
    };

    if (standardMode) {
      return (
        <div className="msla-workflow-parameters">
          <h3 className="msla-workflow-parameters-create">{'Resources.WORKFLOW_PARAMETERS_CREATE_TITLE'}</h3>
          {parameters.length ? <InfoBar isInverted={isInverted} /> : null}
          <div className="msla-workflow-parameters-add-standard">
            <CommandBarButton
              className="msla-workflow-parameters-create-button"
              disabled={isReadOnly}
              text={'Resources.WORKFLOW_PARAMETERS_CREATE'}
              iconProps={addIcon}
              onClick={this._handleAddParameter}
            />
          </div>
          {parameters.length ? null : this._renderTitleAndDescription()}
          {parameters.length ? <List items={parameters} onRenderCell={this._renderParameter} /> : null}
          {onManageParameters ? this._renderManageParametersLink() : null}
        </div>
      );
    } else {
      return (
        <div className="msla-workflow-parameters">
          {parameters.length ? null : this._renderTitleAndDescription()}
          {parameters.length ? <List items={parameters} onRenderCell={this._renderParameter} /> : null}
          <div className="msla-workflow-parameters-add">
            <PrimaryButton
              text={"Resources.WORKFLOW_PARAMETERS_ADD"}
              styles={buttonStyles}
              onClick={this._handleAddParameter}
              disabled={isReadOnly}
            />
          </div>
        </div>
      );
    }
  }

  private _renderTitleAndDescription(): JSX.Element {
    const { standardMode } = this.props;
    const iconStyles: IIconStyles = {
      root: {
        color: this.state.isInverted ? getTheme().palette.themePrimary : brandColor,
        fontSize: 50,
      },
    };

    if (standardMode) {
      return (
        <div className="msla-workflow-parameters-empty">
          {/* <img src={ParametersIcon} alt="" role="presentation" /> */}
          <div className="msla-workflow-parameters-text-standard">
            <p>{"Resources.WORKFLOW_PARAMETERS_DESCRIPTION_PART1_STANDARD"}</p>
            <p>{"Resources.WORKFLOW_PARAMETERS_DESCRIPTION_PART2_STANDARD"}</p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="msla-workflow-parameters-empty">
          <Icon iconName="Parameter" styles={iconStyles} ariaLabel={"Resources.WORKFLOW_PARAMETERS_PARAMETER_ICON_LABEL"} />
          <h1 className="msla-workflow-parameters-title">{"Resources.WORKFLOW_PARAMETERS_TITLE"}</h1>
          <div className="msla-workflow-parameters-text">
            <p>{"Resources.WORKFLOW_PARAMETERS_DESCRIPTION_PART1"}</p>
            <p>{"Resources.WORKFLOW_PARAMETERS_DESCRIPTION_PART2"}</p>
          </div>
        </div>
      );
    }
  }

  private _renderParameter = (item?: WorkflowParameterDefinition): JSX.Element => {
    // temp to prevent ts error
    if (!item) {
      return <div> </div>;
    }
    const { isReadOnly, onDeleteParameter, onUpdateParameter, standardMode, validationErrors, onRegisterLanguageProvider } = this.props;
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

  private _renderManageParametersLink(): JSX.Element {
    const { onManageParameters } = this.props;

    return (
      <footer className="msla-workflow-parameters-link">
        <Link className="msla-workflow-parameters-link-text" onClick={onManageParameters}>
          {"Resources.WORKFLOW_PARAMETERS_LINK_TEXT"}
        </Link>
        <Icon iconName="NavigateExternalInline" styles={navigateIconStyle} className="msla-workflow-parameters-link-icon" />
      </footer>
    );
  }

  private _handleAddParameter = (event: React.MouseEvent<HTMLButtonElement>): void => {
    const { onAddParameter } = this.props;
    if (onAddParameter) {
      event.stopPropagation();
      onAddParameter();
    }
  };

  private _handleThemeChange = (): void => {
    this.setState({ isInverted: isHighContrastBlackOrInverted() });
  };
}
