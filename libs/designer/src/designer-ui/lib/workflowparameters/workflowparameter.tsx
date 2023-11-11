import { TrafficLightDot } from '../card/images/dynamicsvgs/trafficlightsvgs';
import type { EventHandler } from '../eventhandler';
import { EditOrDeleteButton } from './workflowparametersButtons';
import { WorkflowparameterField } from './workflowparametersField';
import type { IButtonStyles, IIconProps } from '@fluentui/react';
import { CommandBarButton, FontWeights } from '@fluentui/react';
import { RUN_AFTER_COLORS } from '@microsoft/logic-apps-designer';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const commandBarStyles: Partial<IButtonStyles> = {
  label: {
    fontWeight: FontWeights.semibold,
  },
};
export interface WorkflowParameterUpdateEvent {
  id: string;
  newDefinition: WorkflowParameterDefinition;
  useLegacy?: boolean;
}

export interface WorkflowParameterDeleteEvent {
  id: string;
}

export type WorkflowParameterUpdateHandler = EventHandler<WorkflowParameterUpdateEvent>;
export type WorkflowParameterDeleteHandler = EventHandler<WorkflowParameterDeleteEvent>;
export type RegisterLanguageHandler = () => void;

export interface WorkflowParameterDefinition {
  value?: string;
  id: string;
  isEditable?: boolean;
  name?: string;
  type: string;
  defaultValue?: string;
}

export interface WorkflowParameterProps {
  definition: WorkflowParameterDefinition;
  isReadOnly?: boolean;
  useLegacy?: boolean;
  validationErrors?: Record<string, string | undefined>;
  isInverted?: boolean;
  onChange?: WorkflowParameterUpdateHandler;
  onDelete?: WorkflowParameterDeleteHandler;
  onRegisterLanguageProvider?: RegisterLanguageHandler;
}

export function WorkflowParameterComponent({ definition, isReadOnly, useLegacy, isInverted, ...props }: WorkflowParameterProps): JSX.Element {
  const [expanded, setExpanded] = useState(!!definition.isEditable);
  const [isEditable, setIsEditable] = useState(definition.isEditable);
  const [name, setName] = useState(definition.name);

  const intl = useIntl();
  const themeName = isInverted ? 'dark' : 'light';

  const iconProps: IIconProps = {
    iconName: expanded ? 'ChevronDownMed' : 'ChevronRightMed',
    styles: {
      root: {
        fontSize: 14,
        color: isInverted ? 'white' : '#514f4e',
      },
    },
  };

  const handleToggleExpand = (): void => {
    setExpanded(!expanded);
  };

  const headingTitle = intl.formatMessage({
    defaultMessage: 'New parameter',
    description: 'Heading Title for a Parameter Without Name',
  });

  return (
    <div className="msla-workflow-parameter">
      <div>
        <div>
          <CommandBarButton
            data-testid={name + '-parameter-heading-button'}
            className="msla-workflow-parameter-heading-button"
            iconProps={iconProps}
            onClick={handleToggleExpand}
            styles={commandBarStyles}
            text={name ? name : headingTitle}
          />
          {Object.values(props.validationErrors ?? {}).filter((x) => !!x).length > 0 ? (
            <span className="msla-workflow-parameter-error-dot">
              <TrafficLightDot fill={RUN_AFTER_COLORS[themeName]['FAILED']} />
            </span>
          ) : null}
        </div>
        {expanded ? (
          <WorkflowparameterField
            name={name}
            definition={definition}
            validationErrors={props.validationErrors}
            setName={setName}
            onChange={props.onChange}
            isEditable={isEditable}
            isReadOnly={isReadOnly}
            useLegacy={useLegacy}
          />
        ) : null}
      </div>
      {!isReadOnly ? (
        <div className="msla-workflow-parameter-edit-or-delete-button">
          <EditOrDeleteButton
            onDelete={props.onDelete}
            showDelete={isEditable}
            definition={definition}
            setIsEditable={setIsEditable}
            setExpanded={setExpanded}
          />
        </div>
      ) : null}
    </div>
  );
}
