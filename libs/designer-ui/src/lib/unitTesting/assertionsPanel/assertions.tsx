import type { ValueSegment } from '../../editor';
import { isHighContrastBlack } from '../../utils';
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
import type { AssertionDefintion } from '@microsoft/logic-apps-shared';
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
  tokenMapping: Record<string, ValueSegment>;
  loadParameterValueFromString: (value: string) => ValueSegment[];
  validationErrors?: Record<string, Record<string, string | undefined>>;
}

export function Assertions({
  assertions,
  onDismiss,
  onAssertionAdd,
  onAssertionUpdate,
  onAssertionDelete,
  getTokenPicker,
  tokenMapping,
  loadParameterValueFromString,
  validationErrors,
}: AssertionsProps): JSX.Element {
  const intl = useIntl();
  const theme = useTheme();
  const isInverted = isHighContrastBlack() || theme.isInverted;

  const titleText = intl.formatMessage({
    defaultMessage: 'Assertions',
    id: 'oFq3ng',
    description: 'Assertions Panel Title',
  });

  const addAssertionText = intl.formatMessage({
    defaultMessage: 'New assertion',
    id: 'GX3fkR',
    description: 'New Assertion Text',
  });

  const headingTitle = intl.formatMessage({
    defaultMessage: 'New assertion',
    id: '7PTnxD',
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
        tokenMapping={tokenMapping}
        loadParameterValueFromString={loadParameterValueFromString}
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
