import { isHighContrastBlack } from '../utils';
import {
  type AssertionUpdateHandler,
  type AssertionDeleteHandler,
  type AssertionAddHandler,
  Assertion,
  type GetAssertionTokenPickerHandler,
} from './assertion';
import { List, Text, useTheme } from '@fluentui/react';
import { Button } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular, Add24Filled, Add24Regular } from '@fluentui/react-icons';
import type { AssertionDefintion } from '@microsoft/utils-logic-apps';
import { useIntl } from 'react-intl';

type OnClickHandler = () => void;
const CreateIcon = bundleIcon(Add24Filled, Add24Regular);
const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export interface AssertionsProps {
  assertions: AssertionDefintion[];
  onDismiss: OnClickHandler;
  onAssertionAdd: AssertionAddHandler;
  onAssertionUpdate: AssertionUpdateHandler;
  onAssertionDelete: AssertionDeleteHandler;
  getTokenPicker: GetAssertionTokenPickerHandler;
  validationErrors?: Record<string, Record<string, string | undefined>>;
}

export function Assertions({
  assertions,
  onDismiss,
  onAssertionAdd,
  onAssertionUpdate,
  onAssertionDelete,
  getTokenPicker,
  validationErrors,
}: AssertionsProps): JSX.Element {
  const intl = useIntl();
  const theme = useTheme();
  const isInverted = isHighContrastBlack() || theme.isInverted;

  const titleText = intl.formatMessage({
    defaultMessage: 'Assertions',
    description: 'Assertions Panel Title',
  });

  const addAssertionText = intl.formatMessage({
    defaultMessage: 'New assertion',
    description: 'New Assertion Text',
  });

  const headingTitle = intl.formatMessage({
    defaultMessage: 'New assertion',
    description: 'Heading title for an assertion without name',
  });

  const handleAddAssertion = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (onAssertionAdd) {
      event.stopPropagation();
      onAssertionAdd({ name: headingTitle, description: '', expression: {} });
    }
  };

  const renderAssertion = (item?: AssertionDefintion): JSX.Element | null => {
    if (!item) {
      return null;
    }
    const parameterErrors = validationErrors && item ? validationErrors[item.id] : undefined;
    return (
      <Assertion
        key={item.id}
        assertion={item}
        onAssertionDelete={onAssertionDelete}
        onAssertionUpdate={onAssertionUpdate}
        getTokenPicker={getTokenPicker}
        validationErrors={parameterErrors}
        isInverted={isInverted}
      />
    );
  };

  const onClose = () => onDismiss?.();

  return (
    <div className="msla-workflow-assertions">
      <div className="msla-workflow-assertions-heading">
        <Text variant="xLarge">{titleText}</Text>
        <Button appearance="subtle" onClick={onClose} icon={<CloseIcon />} />
      </div>
      {assertions.length > 0 ? <List items={assertions} onRenderCell={renderAssertion} /> : null}
      <div className="msla-workflow-assertions-footer">
        <Button onClick={handleAddAssertion} icon={<CreateIcon />}>
          {addAssertionText}
        </Button>
      </div>
    </div>
  );
}
