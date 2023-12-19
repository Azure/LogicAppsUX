import type { EventHandler } from '../eventhandler';
import { IconButton, List, Text, PrimaryButton, TextField } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface AssertionUpdateEvent {
  index: number;
  value: string | undefined;
}

export interface AssertionDeleteEvent {
  index: number;
}

type OnClickHandler = () => void;

export type AssertionUpdateHandler = EventHandler<AssertionUpdateEvent>;
export type AssertionDeleteHandler = EventHandler<AssertionDeleteEvent>;

export interface AssertionsProps {
  assertions: { key: string; value: string }[];
  onDismiss: OnClickHandler;
  onAssertionAdd: OnClickHandler;
  onAssertionUpdate: AssertionUpdateHandler;
  onAssertionDelete: AssertionDeleteHandler;
}

export function Assertions({ assertions, onDismiss, onAssertionAdd, onAssertionUpdate, onAssertionDelete }: AssertionsProps): JSX.Element {
  const intl = useIntl();

  const titleText = intl.formatMessage({
    defaultMessage: 'Assertions',
    description: 'Assertions Panel Title',
  });

  const addAssertionText = intl.formatMessage({
    defaultMessage: 'Create assertion',
    description: 'Create Assertion Text',
  });

  const deleteAssertionText = intl.formatMessage({
    defaultMessage: 'Delete assertion',
    description: 'Create Assertion Text',
  });

  const handleAddAssertion = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (onAssertionAdd) {
      event.stopPropagation();
      onAssertionAdd();
    }
  };

  const renderAssertion = (item: any, index: any): JSX.Element => {
    return (
      <div className="msla-copy-input-control">
        <TextField
          spellCheck={false}
          key={item.key}
          className="msla-copy-input-control-textbox"
          style={{ backgroundColor: '#fff', color: 'black' }} // default for class was grey
          value={item.value}
          onChange={(_, value) => onAssertionUpdate({ index, value })}
        />
        <IconButton ariaLabel={deleteAssertionText} iconProps={{ iconName: 'Delete' }} onClick={() => onAssertionDelete({ index })} />
      </div>
    );
  };

  const onClose = () => onDismiss?.();

  return (
    <div className="msla-workflow-parameters">
      <div className="msla-workflow-parameters-heading">
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
