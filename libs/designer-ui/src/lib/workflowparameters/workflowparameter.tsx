import { CommandBarButton, IButtonStyles } from '@fluentui/react/lib/Button';
import type { IIconProps } from '@fluentui/react/lib/Icon';
import { FontWeights } from '@fluentui/react/lib/Styling';
import React, { useState } from 'react';
import type { EventHandler } from '../eventhandler';
import { isHighContrastBlackOrInverted } from '../utils/theme';
import { useIntl } from 'react-intl';
import { EditOrDeleteButton } from './workflowparametersButtons';
import { WorkflowparameterField } from './workflowparametersField';

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
  defaultValue?: string;
  id: string;
  isEditable?: boolean;
  name?: string;
  type?: string;
  value?: string;
}

export interface WorkflowParameterProps {
  definition: WorkflowParameterDefinition;
  isReadOnly?: boolean;
  validationErrors?: Record<string, string>;
  onChange?: WorkflowParameterUpdateHandler;
  onDelete?: WorkflowParameterDeleteHandler;
  onRegisterLanguageProvider?: RegisterLanguageHandler;
}

export function WorkflowParameter({ definition, isReadOnly, ...props }: WorkflowParameterProps): JSX.Element {
  const [expanded, setExpanded] = useState(!!definition.isEditable);
  const [isEditable, setIsEditable] = useState(definition.isEditable);
  const [isInverted, setIsInverted] = useState(isHighContrastBlackOrInverted());
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
