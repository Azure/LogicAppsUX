import { useAssertions } from '../../../core/state/unitTest/unitTestSelectors';
import { updateAssertions } from '../../../core/state/unitTest/unitTestSlice';
import type { AppDispatch } from '../../../core/store';
import {
  type AssertionDeleteEvent,
  type AssertionUpdateEvent,
  Assertions,
  type CommonPanelProps,
  type AssertionAddEvent,
} from '@microsoft/designer-ui';
import { guid, type AssertionDefintion } from '@microsoft/utils-logic-apps';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

const getAssertions = (assertions: string[]): Record<string, AssertionDefintion> => {
  return assertions.reduce((acc, curr) => {
    const id = guid();
    return { ...acc, [id]: { id: id, name: curr, description: '' } };
  }, {});
};

export const AssertionsPanel = (props: CommonPanelProps) => {
  const workflowAssertions = useAssertions();
  console.log(workflowAssertions);
  const [assertions, setAssertions] = useState<Record<string, AssertionDefintion>>(getAssertions([]));
  const dispatch = useDispatch<AppDispatch>();

  const onClose = () => {
    props.toggleCollapse?.();
  };

  const onAssertionDelete = (event: AssertionDeleteEvent) => {
    const { id } = event;
    const newAssertions = { ...assertions };
    delete newAssertions[id];
    setAssertions(newAssertions);
  };

  const onAssertionUpdate = (event: AssertionUpdateEvent) => {
    const newAssertions = { ...assertions };
    const { name, description, id } = event;
    newAssertions[id].name = name;
    newAssertions[id].description = description;
    dispatch(updateAssertions({ assertions: newAssertions }));

    setAssertions(newAssertions);
  };

  const onAssertionAdd = (event: AssertionAddEvent) => {
    const id = guid();
    setAssertions({ ...assertions, [id]: { id: id, name: event.name, description: event.description } });
  };

  return (
    <Assertions
      assertions={Object.values(assertions)}
      onAssertionAdd={onAssertionAdd}
      onDismiss={onClose}
      onAssertionDelete={onAssertionDelete}
      onAssertionUpdate={onAssertionUpdate}
    />
  );
};
