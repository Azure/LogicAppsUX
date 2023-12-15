import { IconButton, List, PrimaryButton, Text, TextField } from '@fluentui/react';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export const AssertionsPanel = (props: CommonPanelProps) => {
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

  const onClose = () => props.toggleCollapse?.();
  const onAssertionAdd = () => {
    console.log('onAssertionAdd');
  };
  const assertions: string[] = [];

  const renderAssertion = (item: any, index: any): JSX.Element => {
    return (
      <div key={index} style={{ marginBottom: '1rem' }}>
        <div className="msla-copy-input-control">
          <TextField
            className="msla-copy-input-control-textbox"
            style={{ backgroundColor: '#fff', color: 'black' }} // default for class was grey
            value={item}
            onChange={() => console.log('test')}
          />
          <IconButton ariaLabel={deleteAssertionText} iconProps={{ iconName: 'Delete' }} onClick={() => console.log('test')} />
        </div>
      </div>
    );
  };

  return (
    <div className="msla-workflow-parameters">
      <div className="msla-workflow-parameters-heading">
        <Text variant="xLarge">{titleText}</Text>
        <IconButton onClick={onClose} iconProps={{ iconName: 'Cancel' }} />
      </div>
      {assertions.length ? <List items={assertions} onRenderCell={renderAssertion} /> : null}
      <div className="assertion-button-container">
        <PrimaryButton text={addAssertionText} onClick={onAssertionAdd} />
      </div>
    </div>
  );
};
