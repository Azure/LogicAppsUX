import type { ValueSegment } from '../editor';
import type { EventHandler } from '../eventhandler';
import type { TokenPickerMode } from '../tokenpicker';
import { AssertionButtons } from './assertionButtons';
import { AssertionField } from './assertionField';
import { Button } from '@fluentui/react-components';
import { bundleIcon, ChevronRight24Regular, ChevronRight24Filled, ChevronDown24Regular, ChevronDown24Filled } from '@fluentui/react-icons';
import type { AssertionDefintion } from '@microsoft/utils-logic-apps';
import { type Assertion } from '@microsoft/utils-logic-apps';
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
export type GetAssertionTokenPickerHandler = (
  editorId: string,
  labelId: string,
  type: string,
  tokenPickerMode?: TokenPickerMode,
  setIsTokenPickerOpened?: (b: boolean) => void,
  tokenClickedCallback?: (token: ValueSegment) => void
) => JSX.Element;

export interface AssertionProps {
  assertion: AssertionDefintion;
  onAssertionDelete: AssertionDeleteHandler;
  onAssertionUpdate: AssertionUpdateHandler;
  getTokenPicker: GetAssertionTokenPickerHandler;
  tokenMapping: Record<string, ValueSegment>;
  loadParameterValueFromString: (value: string) => ValueSegment[];
}

export function Assertion({
  assertion,
  onAssertionDelete,
  getTokenPicker,
  onAssertionUpdate,
  tokenMapping,
  loadParameterValueFromString,
}: AssertionProps): JSX.Element {
  const [expanded, setExpanded] = useState(assertion.isEditable);
  const [isEditable, setIsEditable] = useState(assertion.isEditable);
  const [name, setName] = useState(assertion.name);
  const [description, setDescription] = useState(assertion.description);
  const [expression, setExpression] = useState(assertion.expression);

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

  const handleUpdate = (newAssertion: Assertion) => {
    onAssertionUpdate({ ...newAssertion, id: assertion.id, isEditable: isEditable });
  };

  return (
    <div className="msla-workflow-assertion">
      <div className="msla-workflow-assertion-header">
        <Button
          appearance="subtle"
          data-testid={name + '-assertion-heading-button'}
          onClick={handleToggleExpand}
          icon={expanded ? <CollapseIcon /> : <ExpandIcon />}
        >
          {name}
        </Button>
        <AssertionButtons isExpanded={expanded} isEditable={isEditable} onEdit={handleEdit} onDelete={handleDelete} />
      </div>
      <div className="msla-workflow-assertion-content">
        <AssertionField
          name={name}
          description={description}
          expression={expression}
          setName={setName}
          setDescription={setDescription}
          setExpression={setExpression}
          isEditable={isEditable}
          isExpanded={expanded}
          getTokenPicker={getTokenPicker}
          handleUpdate={handleUpdate}
          tokenMapping={tokenMapping}
          loadParameterValueFromString={loadParameterValueFromString}
        />
      </div>
    </div>
  );
}
