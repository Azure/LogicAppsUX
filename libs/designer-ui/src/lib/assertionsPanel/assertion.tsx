import type { ValueSegment } from '../editor';
import type { EventHandler } from '../eventhandler';
import type { TokenPickerMode } from '../tokenpicker';
import { AssertionButtons } from './assertionButtons';
import { AssertionField } from './assertionField';
import type { IButtonStyles, IIconProps } from '@fluentui/react';
import { CommandBarButton, FontWeights } from '@fluentui/react';
import type { AssertionDefintion } from '@microsoft/utils-logic-apps';
import { useState } from 'react';

const commandBarStyles: Partial<IButtonStyles> = {
  label: {
    fontWeight: FontWeights.semibold,
  },
};

export interface AssertionUpdateEvent {
  id: string;
  name: string;
  description: string;
  expression: any; //TODO: Change to condition object type
}

export interface AssertionDeleteEvent {
  id: string;
}

export interface AssertionAddEvent {
  name: string;
  description: string;
  expression: any; //TODO: Change to condition object type
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
  isInverted: boolean;
  getTokenPicker: GetAssertionTokenPickerHandler;
}

export function Assertion({ isInverted, assertion, onAssertionUpdate, onAssertionDelete, getTokenPicker }: AssertionProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [name, setName] = useState(assertion.name);
  const [description, setDescription] = useState(assertion.description);
  const [expression, setExpression] = useState(assertion.expression);

  const handleEdit: React.MouseEventHandler<HTMLButtonElement> = (): void => {
    setIsEditable(true);
    setExpanded(true);
  };

  const handleSave: React.MouseEventHandler<HTMLButtonElement> = (): void => {
    setIsEditable(false);
    onAssertionUpdate({ name: name, description: description, id: assertion.id, expression: expression });
  };

  const handleDelete: React.MouseEventHandler<HTMLButtonElement> = (): void => {
    onAssertionDelete({ id: assertion.id });
  };

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

  return (
    <div className="msla-workflow-assertion">
      <div className="msla-workflow-assertion-header">
        <CommandBarButton
          data-testid={name + '-assertion-heading-button'}
          iconProps={iconProps}
          onClick={handleToggleExpand}
          styles={commandBarStyles}
          text={name}
        />
        <AssertionButtons isEditable={isEditable} onEdit={handleEdit} onSave={handleSave} onDelete={handleDelete} />
      </div>
      <div className="msla-workflow-assertion-content">
        {expanded ? (
          <AssertionField
            name={name}
            description={description}
            expression={expression}
            setName={setName}
            setDescription={setDescription}
            setExpression={setExpression}
            isEditable={isEditable}
            getTokenPicker={getTokenPicker}
          />
        ) : null}
      </div>
    </div>
  );
}
