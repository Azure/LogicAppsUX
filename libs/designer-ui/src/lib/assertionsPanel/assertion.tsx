import type { EventHandler } from '../eventhandler';
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
  index: number;
  value: string | undefined;
}

export interface AssertionDeleteEvent {
  index: number;
}

export type AssertionDeleteHandler = EventHandler<AssertionDeleteEvent>;
export type AssertionUpdateHandler = EventHandler<AssertionUpdateEvent>;

export interface AssertionProps {
  assertion: AssertionDefintion;
  onAssertionDelete: AssertionDeleteHandler;
  onAssertionUpdate: AssertionUpdateHandler;
  isInverted: boolean;
}

export function Assertion({ isInverted, assertion }: AssertionProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [_isEditable, setIsEditable] = useState(false);

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

  const headingTitle = intl.formatMessage({
    defaultMessage: 'New assertion',
    description: 'Heading title for an assertion without name',
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
        </div>
        {expanded ? <h1>{'Hello there'}</h1> : null}
      </div>
      <div className="msla-workflow-parameter-edit-or-delete-button">
        <IconButton ariaLabel={editAssertionText} iconProps={{ iconName: 'Edit' }} onClick={handleEdit} />
        <IconButton ariaLabel={deleteAssertionText} iconProps={{ iconName: 'Delete' }} />
      </div>
    </div>
  );
}
