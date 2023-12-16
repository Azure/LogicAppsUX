import { useAssertions } from '../../../core/state/unitTest/unitTestSelectors';
import { addAssertions } from '../../../core/state/unitTest/unitTestSlice';
import type { AppDispatch } from '../../../core/store';
import { IconButton, List, PrimaryButton, Text, TextField } from '@fluentui/react';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { guid } from '@microsoft/utils-logic-apps';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export const AssertionsPanel = (props: CommonPanelProps) => {
  const intl = useIntl();
  const workflowAssertions = useAssertions();
  console.log('workflowAssertions', workflowAssertions);
  const [assertions, setAssertions] = useState<string[]>(workflowAssertions);
  const dispatch = useDispatch<AppDispatch>();

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

  const onClose = () => {
    dispatch(addAssertions({ assertions }));
    props.toggleCollapse?.();
  };

  const onAssertionDelete = (index: number) => {
    const test = [...assertions];
    test.splice(index, 1);
    setAssertions(test);
  };

  const onAssertionChange = (index: number, value: string | undefined) => {
    const newAssertions = [...assertions];
    newAssertions[index] = value ?? '';
    setAssertions(newAssertions);
  };

  const onAssertionAdd = () => {
    setAssertions([...assertions, '']);
  };

  const renderAssertion = (item: any, index: any): JSX.Element => {
    return (
      <div className="msla-copy-input-control" key={guid()}>
        <TextField
          className="msla-copy-input-control-textbox"
          style={{ backgroundColor: '#fff', color: 'black' }} // default for class was grey
          value={item}
          onChange={(_, value) => onAssertionChange(index, value)}
        />
        <IconButton ariaLabel={deleteAssertionText} iconProps={{ iconName: 'Delete' }} onClick={() => onAssertionDelete(index)} />
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
