import { useAssertions } from '../../../core/state/unitTest/unitTestSelectors';
import { addAssertions } from '../../../core/state/unitTest/unitTestSlice';
import type { AppDispatch } from '../../../core/store';
import { FocusTrapZone, IconButton, List, PrimaryButton, Text, TextField } from '@fluentui/react';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { guid } from '@microsoft/utils-logic-apps';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

const getAssertions = (assertions: string[]) => {
  return assertions.map((assertion) => {
    return { key: guid(), value: assertion };
  });
};

export const AssertionsPanel = (props: CommonPanelProps) => {
  const intl = useIntl();
  const workflowAssertions = useAssertions();
  const [assertions, setAssertions] = useState<{ key: string; value: string }[]>(getAssertions(workflowAssertions));
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
    dispatch(addAssertions({ assertions: assertions.map((assertion) => assertion.value) }));
    props.toggleCollapse?.();
  };

  const onAssertionDelete = (index: number) => {
    const test = [...assertions];
    test.splice(index, 1);
    setAssertions(test);
  };

  const onAssertionChange = (index: number, value: string | undefined) => {
    const newAssertions = [...assertions];
    newAssertions[index].value = value ?? '';
    setAssertions(newAssertions);
  };

  const onAssertionAdd = () => {
    setAssertions([...assertions, { key: guid(), value: '' }]);
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
          onChange={(_, value) => onAssertionChange(index, value)}
        />
        <IconButton ariaLabel={deleteAssertionText} iconProps={{ iconName: 'Delete' }} onClick={() => onAssertionDelete(index)} />
      </div>
    );
  };

  return (
    <FocusTrapZone>
      <div className="msla-app-action-header">
        <Text variant="xLarge">{titleText}</Text>
        <IconButton onClick={onClose} iconProps={{ iconName: 'Cancel' }} />
      </div>
      {assertions.length > 0 ? <List items={assertions} onRenderCell={renderAssertion} /> : null}
      <div className="assertion-button-container">
        <PrimaryButton text={addAssertionText} onClick={onAssertionAdd} />
      </div>
    </FocusTrapZone>
  );
};
