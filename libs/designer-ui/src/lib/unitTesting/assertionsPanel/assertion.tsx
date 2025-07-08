import { TrafficLightDot } from '../../card/images/dynamicsvgs/trafficlightsvgs';
import type { EventHandler } from '../../eventhandler';
import { AssertionButtons } from './assertionButtons';
import { AssertionField } from './assertionField';
import { Button } from '@fluentui/react-components';
import { bundleIcon, ChevronRight24Regular, ChevronRight24Filled, ChevronDown24Regular, ChevronDown24Filled } from '@fluentui/react-icons';
import { RUN_AFTER_COLORS, type AssertionDefinition } from '@microsoft/logic-apps-shared';
import { useState } from 'react';

const ExpandIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
const CollapseIcon = bundleIcon(ChevronDown24Regular, ChevronDown24Filled);

export interface AssertionUpdateEvent {
  id: string;
  name: string;
  description: string;
  assertionString: string;
  isEditable: boolean;
}

export interface AssertionDeleteEvent {
  id: string;
}

export interface AssertionAddEvent {
  name: string;
  description: string;
  assertionString: string;
}

export type AssertionDeleteHandler = EventHandler<AssertionDeleteEvent>;
export type AssertionUpdateHandler = EventHandler<AssertionUpdateEvent>;
export type AssertionAddHandler = EventHandler<AssertionAddEvent>;
export type GetConditionExpressionHandler = (
  editorId: string,
  labelId: string,
  assertionId: string,
  initialValue: string,
  type: string,
  isReadOnly: boolean
) => JSX.Element;

export interface AssertionProps {
  id: string;
  assertion: AssertionDefinition;
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

  const themeName = isInverted ? 'dark' : 'light';

  const handleEdit: React.MouseEventHandler<HTMLButtonElement> = (): void => {
    onAssertionUpdate({ ...assertion, isEditable: true });
  };

  const handleDelete: React.MouseEventHandler<HTMLButtonElement> = (): void => {
    onAssertionDelete({ id: assertion.id });
  };

  const handleToggleExpand = (): void => {
    setExpanded(!expanded);
  };

  const handleUpdate = (newAssertion: AssertionDefinition) => {
    onAssertionUpdate({ ...newAssertion });
  };

  return (
    <div className="msla-workflow-assertion">
      <div className="msla-workflow-assertion-header">
        <Button
          appearance="subtle"
          data-testid={`${assertion.name}-assertion-heading-button`}
          onClick={handleToggleExpand}
          icon={expanded ? <CollapseIcon /> : <ExpandIcon />}
        >
          {assertion.name}
        </Button>
        {Object.values(validationErrors ?? {}).filter((x) => !!x).length > 0 ? (
          <span className="msla-assertion-error-dot">
            <TrafficLightDot fill={RUN_AFTER_COLORS[themeName]['FAILED']} />
          </span>
        ) : null}
        <AssertionButtons isExpanded={expanded} isEditable={assertion.isEditable} onEdit={handleEdit} onDelete={handleDelete} />
      </div>
      <div className="msla-workflow-assertion-content">
        <AssertionField
          id={id}
          assertion={assertion}
          handleUpdate={handleUpdate}
          isExpanded={expanded}
          getConditionExpression={getConditionExpression}
          validationErrors={validationErrors}
        />
      </div>
    </div>
  );
}
