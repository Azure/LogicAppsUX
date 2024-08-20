import { TrafficLightDot } from '../card/images/dynamicsvgs/trafficlightsvgs';
import type { EventHandler } from '../eventhandler';
import { EditOrDeleteButton } from './workflowparametersButtons';
import { WorkflowparameterField } from './workflowparametersField';
import { Button } from '@fluentui/react-components';
import { bundleIcon, ChevronRight24Regular, ChevronRight24Filled, ChevronDown24Regular, ChevronDown24Filled } from '@fluentui/react-icons';
import { RUN_AFTER_COLORS } from '@microsoft/logic-apps-shared';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const ExpandIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
const CollapseIcon = bundleIcon(ChevronDown24Regular, ChevronDown24Filled);

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
  required?: boolean;
  description?: string;
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

export function WorkflowParameter({ definition, isReadOnly, useLegacy, isInverted, ...props }: WorkflowParameterProps): JSX.Element {
  const [expanded, setExpanded] = useState(!!definition.isEditable);
  const [isEditable, setIsEditable] = useState(definition.isEditable);
  const [name, setName] = useState(definition.name);

  const intl = useIntl();
  const themeName = isInverted ? 'dark' : 'light';

  const handleToggleExpand = (): void => {
    setExpanded(!expanded);
  };

  const headingTitle = intl.formatMessage({
    defaultMessage: 'New parameter',
    id: 'ss5JPH',
    description: 'Heading Title for a Parameter Without Name',
  });

  return (
    <div className="msla-workflow-parameter">
      <div>
        <div>
          <Button
            appearance="subtle"
            data-testid={`${name}-parameter-heading-button`}
            className="msla-workflow-parameter-heading-button"
            onClick={handleToggleExpand}
            icon={expanded ? <CollapseIcon /> : <ExpandIcon />}
            aria-expanded={expanded}
          >
            {name ? name : headingTitle}
          </Button>
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
      {isReadOnly ? null : (
        <div className="msla-workflow-parameter-edit-or-delete-button">
          <EditOrDeleteButton
            onDelete={props.onDelete}
            showDelete={isEditable}
            definition={definition}
            setIsEditable={setIsEditable}
            setExpanded={setExpanded}
          />
        </div>
      )}
    </div>
  );
}
