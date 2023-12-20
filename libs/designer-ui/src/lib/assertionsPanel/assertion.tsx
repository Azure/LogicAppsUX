import type { EventHandler } from '../eventhandler';
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
  name: string;
  description: string;
}

export interface AssertionDeleteEvent {
  index: number;
}

export interface AssertionAddEvent {
  name: string;
  description: string;
}

export type AssertionDeleteHandler = EventHandler<AssertionDeleteEvent>;
export type AssertionUpdateHandler = EventHandler<AssertionUpdateEvent>;
export type AssertionAddHandler = EventHandler<AssertionAddEvent>;

export interface AssertionProps {
  assertion: AssertionDefintion;
  onAssertionDelete: React.MouseEventHandler<HTMLButtonElement>;
  onAssertionUpdate: AssertionUpdateHandler;
  isInverted: boolean;
}

export function Assertion({ isInverted, assertion, onAssertionUpdate, onAssertionDelete }: AssertionProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [isEditable, setIsEditable] = useState(false);
  const [name, setName] = useState(assertion.name);
  const [description, setDescription] = useState(assertion.description);

  const handleEdit: React.MouseEventHandler<HTMLButtonElement> = (): void => {
    setIsEditable(true);
    setExpanded(true);
  };

  const handleSave: React.MouseEventHandler<HTMLButtonElement> = (): void => {
    setIsEditable(false);
    onAssertionUpdate({ name: name, description: description });
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
        <AssertionButtons isEditable={isEditable} onEdit={handleEdit} onSave={handleSave} onDelete={onAssertionDelete} />
      </div>
      <div className="msla-workflow-assertion-content">
        {expanded ? (
          <AssertionField name={name} description={description} setName={setName} setDescription={setDescription} isEditable={isEditable} />
        ) : null}
      </div>
    </div>
  );
}
