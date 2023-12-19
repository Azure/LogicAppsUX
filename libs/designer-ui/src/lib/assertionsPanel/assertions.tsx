import { isHighContrastBlack } from '../utils';
import { type AssertionUpdateHandler, type AssertionDeleteHandler, Assertion } from './assertion';
import { IconButton, List, Text, PrimaryButton, useTheme } from '@fluentui/react';
import type { AssertionDefintion } from '@microsoft/utils-logic-apps';
import { useIntl } from 'react-intl';

type OnClickHandler = () => void;

export interface AssertionsProps {
  assertions: AssertionDefintion[];
  onDismiss: OnClickHandler;
  onAssertionAdd: OnClickHandler;
  onAssertionUpdate: AssertionUpdateHandler;
  onAssertionDelete: AssertionDeleteHandler;
}

export function Assertions({ assertions, onDismiss, onAssertionAdd, onAssertionUpdate, onAssertionDelete }: AssertionsProps): JSX.Element {
  const intl = useIntl();
  const theme = useTheme();
  const isInverted = isHighContrastBlack() || theme.isInverted;

  const titleText = intl.formatMessage({
    defaultMessage: 'Assertions',
    description: 'Assertions Panel Title',
  });

  const addAssertionText = intl.formatMessage({
    defaultMessage: 'Create assertion',
    description: 'Create Assertion Text',
  });

  const handleAddAssertion = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (onAssertionAdd) {
      event.stopPropagation();
      onAssertionAdd();
    }
  };

  const renderAssertion = (item?: AssertionDefintion): JSX.Element => {
    if (!item) {
      return <></>;
    }
    return (
      <Assertion assertion={item} onAssertionDelete={onAssertionDelete} onAssertionUpdate={onAssertionUpdate} isInverted={isInverted} />
    );
  };

  const onClose = () => onDismiss?.();

  return (
    <div className="msla-workflow-assertions">
      <div className="msla-workflow-assertions-heading">
        <Text variant="xLarge">{titleText}</Text>
        <IconButton onClick={onClose} iconProps={{ iconName: 'Cancel' }} />
      </div>

      {assertions.length > 0 ? <List items={assertions} onRenderCell={renderAssertion} /> : null}
      <div className="assertion-button-container">
        <PrimaryButton text={addAssertionText} onClick={handleAddAssertion} />
      </div>
    </div>
  );
}
