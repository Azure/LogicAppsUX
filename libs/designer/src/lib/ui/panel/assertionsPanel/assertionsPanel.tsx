import { CommandBarButton, IconButton, List, Text } from '@fluentui/react';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export const AssertionsPanel = (props: CommonPanelProps) => {
  const intl = useIntl();

  const titleText = intl.formatMessage({
    defaultMessage: 'Assertions',
    description: 'Assertions Panel Title',
  });

  const addAssertionText = intl.formatMessage({
    defaultMessage: 'Create parameter',
    description: 'Create Parameter Text',
  });

  const onClose = () => props.toggleCollapse?.();
  const onAssertionAdd = () => {
    console.log('onAssertionAdd');
  };
  const assertions: string[] = [];

  const renderAssertion = (_item?: any): JSX.Element => {
    // TODO: 12798972 Workflow Parameter
    return <h1>TEXT</h1>;
  };

  return (
    <div className="msla-workflow-parameters">
      <div className="msla-workflow-parameters-heading">
        <Text variant="xLarge">{titleText}</Text>
        <IconButton onClick={onClose} iconProps={{ iconName: 'Cancel' }} />
      </div>
      {assertions.length ? <List items={assertions} onRenderCell={renderAssertion} /> : null}
      <div className="msla-workflow-parameters-add">
        <CommandBarButton text={addAssertionText} onClick={onAssertionAdd} />
      </div>
    </div>
  );
};
