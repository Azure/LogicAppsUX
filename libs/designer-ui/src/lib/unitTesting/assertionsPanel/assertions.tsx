import { isHighContrastBlack } from '../../utils';
import {
  type AssertionUpdateHandler,
  type AssertionDeleteHandler,
  type AssertionAddHandler,
  Assertion,
  type GetConditionExpressionHandler,
} from './assertion';
import { List, useTheme } from '@fluentui/react';
import { Button } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular, Add24Filled, Add24Regular } from '@fluentui/react-icons';
import type { AssertionDefinition } from '@microsoft/logic-apps-shared';
import { XLargeText } from '../../text';
import { useIntl } from 'react-intl';

type OnClickHandler = () => void;
const CreateIcon = bundleIcon(Add24Filled, Add24Regular);
const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export interface AssertionsProps {
  assertions: AssertionDefinition[];
  onDismiss: OnClickHandler;
  onAssertionAdd: AssertionAddHandler;
  onAssertionUpdate: AssertionUpdateHandler;
  onAssertionDelete: AssertionDeleteHandler;
  getConditionExpression: GetConditionExpressionHandler;
  validationErrors?: Record<string, Record<string, string | undefined>>;
}

export function Assertions({
  assertions,
  onDismiss,
  onAssertionAdd,
  onAssertionUpdate,
  onAssertionDelete,
  getConditionExpression,
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
      onAssertionAdd({ name: headingTitle, description: '', assertionString: '' });
    }
  };

  const renderAssertion = (item?: AssertionDefinition): JSX.Element | null => {
    if (!item) {
      return null;
    }
    const parameterErrors = validationErrors && item ? validationErrors[item.id] : undefined;
    return (
      <Assertion
        key={item.id}
        id={item.id}
        assertion={item}
        onAssertionDelete={onAssertionDelete}
        onAssertionUpdate={onAssertionUpdate}
        getConditionExpression={getConditionExpression}
        validationErrors={parameterErrors}
        isInverted={isInverted}
      />
    );
  };

  const onClose = () => onDismiss?.();

  return (
    <div className="msla-workflow-assertions">
      <div className="msla-workflow-assertions-heading">
        <XLargeText text={titleText} />
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
