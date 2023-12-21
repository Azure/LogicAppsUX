import { useAssertions } from '../../../core/state/unitTest/unitTestSelectors';
import { updateAssertions, updateAssertion } from '../../../core/state/unitTest/unitTestSlice';
import type { AppDispatch } from '../../../core/store';
import { toConditionViewModel } from '../../../core/utils/parameters/helper';
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

export const AssertionsPanel = (props: CommonPanelProps) => {
  const workflowAssertions = useAssertions();
  const [assertions, setAssertions] = useState<Record<string, AssertionDefintion>>(workflowAssertions);
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
    const { name, description, id } = event;
    const assertionToUpdate = { name: name, description: description, id: id, expression: {} };
    dispatch(updateAssertion({ assertionToUpdate }));

    const newAssertions = { ...assertions };
    newAssertions[id] = assertionToUpdate;
    setAssertions(newAssertions);
  };

  const onAssertionAdd = (event: AssertionAddEvent) => {
    const id = guid();
    const newAssertions = {
      ...assertions,
      [id]: {
        id: id,
        name: event.name,
        description: event.description,
        expression: toConditionViewModel(event.expression),
      },
    };
    setAssertions(newAssertions);
    dispatch(updateAssertions({ assertions: newAssertions }));
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
