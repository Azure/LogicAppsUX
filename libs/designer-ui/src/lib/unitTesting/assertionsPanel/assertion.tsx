import { TrafficLightDot } from '../../card/images/dynamicsvgs/trafficlightsvgs';
import type { EventHandler } from '../../eventhandler';
import { AssertionButtons } from './assertionButtons';
import { AssertionField } from './assertionField';
import { Button } from '@fluentui/react-components';
import { bundleIcon, ChevronRight24Regular, ChevronRight24Filled, ChevronDown24Regular, ChevronDown24Filled } from '@fluentui/react-icons';
import { RUN_AFTER_COLORS, type Assertion as AssertionType, type AssertionDefintion } from '@microsoft/logic-apps-shared';
import { useState } from 'react';

const ExpandIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
const CollapseIcon = bundleIcon(ChevronDown24Regular, ChevronDown24Filled);

export interface AssertionUpdateEvent {
  id: string;
  name: string;
  description: string;
  expression: Record<string, any>;
  isEditable: boolean;
}

export interface AssertionDeleteEvent {
  id: string;
}

export interface AssertionAddEvent {
  name: string;
  description: string;
  expression: Record<string, any>;
}

export type AssertionDeleteHandler = EventHandler<AssertionDeleteEvent>;
export type AssertionUpdateHandler = EventHandler<AssertionUpdateEvent>;
export type AssertionAddHandler = EventHandler<AssertionAddEvent>;
export type GetConditionExpressionHandler = (
  editorId: string,
  labelId: string,
  type: string,
  onChange: (value: string) => void
) => JSX.Element;

export interface AssertionProps {
  id: string;
  assertion: AssertionDefintion;
  onAssertionDelete: AssertionDeleteHandler;
  onAssertionUpdate: AssertionUpdateHandler;
  getConditionExpression: GetConditionExpressionHandler;
  isInverted: boolean;
  validationErrors?: Record<string, string | undefined>;
}

export function Assertion({
  id,
  assertion,
  onAssertionDelete,
  getConditionExpression,
  onAssertionUpdate,
  validationErrors,
  isInverted,
}: AssertionProps): JSX.Element {
  const [expanded, setExpanded] = useState(assertion.isEditable);
  const [isEditable, setIsEditable] = useState(assertion.isEditable);
  const [name, setName] = useState(assertion.name);
  const [description, setDescription] = useState(assertion.description);
  const [expression, setExpression] = useState(assertion.expression);

  const themeName = isInverted ? 'dark' : 'light';

  const handleEdit: React.MouseEventHandler<HTMLButtonElement> = (): void => {
    setIsEditable(true);
    setExpanded(true);
  };

  const handleDelete: React.MouseEventHandler<HTMLButtonElement> = (): void => {
    onAssertionDelete({ id: assertion.id });
  };

  const handleToggleExpand = (): void => {
    setExpanded(!expanded);
  };

  const handleUpdate = (newAssertion: AssertionType) => {
    onAssertionUpdate({ ...newAssertion, id: assertion.id, isEditable: isEditable });
  };

  return (
    <div className="msla-workflow-assertion">
      <div className="msla-workflow-assertion-header">
        <Button
          appearance="subtle"
          data-testid={`${name}-assertion-heading-button`}
          onClick={handleToggleExpand}
          icon={expanded ? <CollapseIcon /> : <ExpandIcon />}
        >
          {name}
        </Button>
        {Object.values(validationErrors ?? {}).filter((x) => !!x).length > 0 ? (
          <span className="msla-assertion-error-dot">
            <TrafficLightDot fill={RUN_AFTER_COLORS[themeName]['FAILED']} />
          </span>
        ) : null}
        <AssertionButtons isExpanded={expanded} isEditable={isEditable} onEdit={handleEdit} onDelete={handleDelete} />
      </div>
      <div className="msla-workflow-assertion-content">
        <AssertionField
          id={id}
          name={name}
          description={description}
          expression={expression}
          setName={setName}
          setDescription={setDescription}
          setExpression={setExpression}
          isEditable={isEditable}
          isExpanded={expanded}
          getConditionExpression={getConditionExpression}
          handleUpdate={handleUpdate}
          validationErrors={validationErrors}
        />
      </div>
    </div>
  );
}
