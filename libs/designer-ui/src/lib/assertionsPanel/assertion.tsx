import type { EventHandler } from '../eventhandler';
import { AssertionField } from './assertionField';
import type { IButtonStyles, IIconProps } from '@fluentui/react';
import { CommandBarButton, FontWeights, IconButton } from '@fluentui/react';
import type { AssertionDefintion } from '@microsoft/utils-logic-apps';
import { useState } from 'react';
import { useIntl } from 'react-intl';

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
  onAssertionDelete: AssertionDeleteHandler;
  onAssertionUpdate: AssertionUpdateHandler;
  isInverted: boolean;
}

export function Assertion({ isInverted, assertion, onAssertionUpdate }: AssertionProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [isEditable, setIsEditable] = useState(false);

  const { name } = assertion;

  const handleEdit = (): void => {
    setIsEditable(true);
    setExpanded(true);
  };

  const intl = useIntl();
  // const themeName = isInverted ? 'dark' : 'light';

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

  const deleteAssertionText = intl.formatMessage({
    defaultMessage: 'Delete assertion',
    description: 'Create Assertion Text',
  });

  const editAssertionText = intl.formatMessage({
    defaultMessage: 'Edit assertion',
    description: 'Edit Assertion Text',
  });

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
        <div className="msla-workflow-assertion-header-buttons">
          <IconButton ariaLabel={editAssertionText} iconProps={{ iconName: 'Edit' }} onClick={handleEdit} />
          <IconButton ariaLabel={deleteAssertionText} iconProps={{ iconName: 'Delete' }} />
        </div>
      </div>
      <div className="msla-workflow-assertion-content">
        {expanded ? <AssertionField assertion={assertion} onChange={onAssertionUpdate} isEditable={isEditable} /> : null}
      </div>
    </div>
  );
}
