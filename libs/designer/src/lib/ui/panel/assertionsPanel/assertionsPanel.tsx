import { useAssertions } from '../../../core/state/unitTest/unitTestSelectors';
import { addAssertions } from '../../../core/state/unitTest/unitTestSlice';
import type { AppDispatch } from '../../../core/store';
import { type AssertionDeleteEvent, type AssertionUpdateEvent, Assertions, type CommonPanelProps } from '@microsoft/designer-ui';
import { guid } from '@microsoft/utils-logic-apps';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

const getAssertions = (assertions: string[]) => {
  return assertions.map((assertion) => {
    return { key: guid(), value: assertion };
  });
};

export const AssertionsPanel = (props: CommonPanelProps) => {
  const workflowAssertions = useAssertions();
  const [assertions, setAssertions] = useState<{ key: string; value: string }[]>(getAssertions(workflowAssertions));
  const dispatch = useDispatch<AppDispatch>();

  const onClose = () => {
    dispatch(addAssertions({ assertions: assertions.map((assertion) => assertion.value) }));
    props.toggleCollapse?.();
  };

  const onAssertionDelete = (event: AssertionDeleteEvent) => {
    const { index } = event;
    const test = [...assertions];
    test.splice(index, 1);
    setAssertions(test);
  };

  const onAssertionUpdate = (event: AssertionUpdateEvent) => {
    const { index, value } = event;
    const newAssertions = [...assertions];
    newAssertions[index].value = value ?? '';
    setAssertions(newAssertions);
  };

  const onAssertionAdd = () => {
    setAssertions([...assertions, { key: guid(), value: '' }]);
  };

  return (
    <Assertions
      assertions={assertions}
      onAssertionAdd={onAssertionAdd}
      onDismiss={onClose}
      onAssertionDelete={onAssertionDelete}
      onAssertionUpdate={onAssertionUpdate}
    />
  );
};
