import { useAssertions } from '../../../core/state/unitTest/unitTestSelectors';
import { addAssertions } from '../../../core/state/unitTest/unitTestSlice';
import type { AppDispatch } from '../../../core/store';
import {
  type AssertionDeleteEvent,
  type AssertionUpdateEvent,
  Assertions,
  type CommonPanelProps,
  type AssertionAddEvent,
} from '@microsoft/designer-ui';
import type { AssertionDefintion } from '@microsoft/utils-logic-apps';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

const getAssertions = (assertions: string[]): AssertionDefintion[] => {
  return assertions.map((assertion) => {
    return { name: '', description: assertion };
  });
};

export const AssertionsPanel = (props: CommonPanelProps) => {
  const workflowAssertions = useAssertions();
  const [assertions, setAssertions] = useState<AssertionDefintion[]>(getAssertions(workflowAssertions));
  const dispatch = useDispatch<AppDispatch>();

  const onClose = () => {
    dispatch(addAssertions({ assertions: assertions.map(() => ' assertion.value') }));
    props.toggleCollapse?.();
  };

  const onAssertionDelete = (event: AssertionDeleteEvent) => {
    const { index } = event;
    const test = [...assertions];
    test.splice(index, 1);
    setAssertions(test);
  };

  const onAssertionUpdate = (event: AssertionUpdateEvent) => {
    const { name, description } = event;
    console.log('charlie', name, description);
    const newAssertions = [...assertions];
    // newAssertions[index].value = value ?? '';
    setAssertions(newAssertions);
  };

  const onAssertionAdd = (event: AssertionAddEvent) => {
    setAssertions([...assertions, { name: event.name, description: event.description }]);
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
