import type { EventHandler } from '../eventhandler';
import { EditOrDeleteButton } from './workflowparametersButtons';
import { WorkflowparameterField } from './workflowparametersField';
import type { IButtonStyles, IIconProps } from '@fluentui/react';
import { CommandBarButton, FontWeights } from '@fluentui/react';
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
}

export interface WorkflowParameterProps {
  definition: WorkflowParameterDefinition;
  isReadOnly?: boolean;
  validationErrors?: Record<string, string | undefined>;
  isInverted?: boolean;
  onChange?: WorkflowParameterUpdateHandler;
  onDelete?: WorkflowParameterDeleteHandler;
  onRegisterLanguageProvider?: RegisterLanguageHandler;
}

export function WorkflowParameter({ definition, isReadOnly, isInverted, ...props }: WorkflowParameterProps): JSX.Element {
  const [expanded, setExpanded] = useState(!!definition.isEditable);
  const [isEditable, setIsEditable] = useState(definition.isEditable);
  const [name, setName] = useState(definition.name);

  const intl = useIntl();

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
      <div className="msla-workflow-parameter-group">
        <div>
          <CommandBarButton
            data-testid={name + '-parameter-heading-button'}
            className="msla-workflow-parameter-heading-button"
            iconProps={iconProps}
            onClick={handleToggleExpand}
            styles={commandBarStyles}
            text={name ? name : headingTitle}
          />
        </div>
        {expanded ? (
          <WorkflowparameterField
            isEditable={isEditable}
            name={name}
            definition={definition}
            isReadOnly={isReadOnly}
            validationErrors={props.validationErrors}
            setName={setName}
            onChange={props.onChange}
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
