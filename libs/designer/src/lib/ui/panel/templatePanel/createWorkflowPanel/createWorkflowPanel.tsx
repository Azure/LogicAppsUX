import { useIntl } from 'react-intl';
import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { DisplayConnections } from '../../../templates/connections/displayConnections';
import { DisplayParameters } from '../../../templates/parameters/displayParameters';
import { ChoiceGroup, Label, TextField } from '@fluentui/react';
import { updateKind, updateWorkflowName } from '../../../../core/state/templates/templateSlice';
import React, { useState } from 'react';
import type { SelectTabData, SelectTabEvent, TabValue } from '@fluentui/react-components';
import { Button, Tab, TabList, Spinner } from '@fluentui/react-components';

export const CreateWorkflowPanel = ({ onCreateClick }: { onCreateClick: () => Promise<void> }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { workflowName, kind, manifest, parameters, connections } = useSelector((state: RootState) => state.template);
  const { workflowName: existingWorkflowName, subscriptionId, location } = useSelector((state: RootState) => state.workflow);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);

  const intlText = {
    STATE_TYPE: intl.formatMessage({
      defaultMessage: 'State Type',
      id: 'X2xiq1',
      description: 'Label for choosing State type',
    }),
    STATEFUL: intl.formatMessage({
      defaultMessage: 'Stateful: Optimized for high reliability, ideal for process business transitional data.',
      id: 'V9EOZ+',
      description: 'Description for Stateful Type',
    }),
    STATELESS: intl.formatMessage({
      defaultMessage: 'Stateless: Optimized for low latency, ideal for request-response and processing IoT events.',
      id: 'mBZnZP',
      description: 'Description for Stateless Type',
    }),
    WORKFLOW_NAME: intl.formatMessage({
      defaultMessage: 'Workflow Name',
      id: '8WZwsC',
      description: 'Label for workflow Name',
    }),
    CREATE_NEW_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Create New Workflow',
      id: '/G8rbe',
      description: 'Create new workflow description',
    }),
    CONFIGURE_CONNECTIONS: intl.formatMessage({
      defaultMessage: 'Configure Connections',
      id: 'D6Gabc',
      description: 'Configure Connections description',
    }),
    CREATE: intl.formatMessage({
      defaultMessage: 'Create',
      id: 'mmph/s',
      description: 'Button text for Creating new workflow from the template',
    }),
  };

  const DisplayNameAndState = () => {
    return (
      <>
        <Label required={true} htmlFor={'workflowName'}>
          {intlText.WORKFLOW_NAME}
        </Label>
        <TextField
          data-testid={'workflowName'}
          id={'workflowName'}
          ariaLabel={intlText.WORKFLOW_NAME}
          value={existingWorkflowName ?? workflowName}
          onChange={(_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) =>
            dispatch(updateWorkflowName(newValue ?? ''))
          }
          disabled={!!existingWorkflowName}
        />
        <ChoiceGroup
          label={intlText.STATE_TYPE}
          options={[
            { key: 'stateful', text: intlText.STATEFUL, disabled: !manifest?.kinds.includes('stateful') },
            {
              key: 'stateless',
              text: intlText.STATELESS,
              disabled: !manifest?.kinds.includes('stateless'),
            },
          ]}
          onChange={(_, option) => {
            if (option?.key) {
              dispatch(updateKind(option?.key));
            }
          }}
          selectedKey={kind}
        />
      </>
    );
  };
  const DisplayReview = () => {
    return <div>here is where we show the review of the workflow</div>;
  };

  const valueOptions: TabValue[] = ['connections', 'parameters', 'name', 'review'];
  const [selectedValue, setSelectedValue] = React.useState<TabValue>('conditions');
  const onTabSelect = (_: SelectTabEvent, data: SelectTabData) => {
    setSelectedValue(data.value);
  };
  const onNext = () => {
    const currentIndex = valueOptions.indexOf(selectedValue);
    setSelectedValue(valueOptions[Math.min(currentIndex + 1, 4)]);
  };
  const onBack = () => {
    if (selectedValue) {
      const currentIndex = valueOptions.indexOf(selectedValue);
      setSelectedValue(valueOptions[Math.max(currentIndex - 1, 0)]);
    }
  };
  return (
    <>
      <b>{intlText.CREATE_NEW_WORKFLOW}</b>
      <TabList defaultSelectedValue="connections" selectedValue={selectedValue} onTabSelect={onTabSelect}>
        {connections && <Tab value="connections">Connections</Tab>}
        {parameters && <Tab value="parameters">Parameters</Tab>}
        <Tab value="name">Name</Tab>
        <Tab value="review">Review and create</Tab>
      </TabList>
      <div>
        {selectedValue === 'connections' && (
          <DisplayConnections connections={connections} subscriptionId={subscriptionId} location={location} />
        )}
        {selectedValue === 'parameters' && <DisplayParameters />}
        {selectedValue === 'name' && <DisplayNameAndState />}
        {selectedValue === 'review' && <DisplayReview />}
      </div>
      <Button onClick={onBack} disabled={selectedValue === 'connections'}>
        Back
      </Button>
      <Button onClick={onNext} disabled={selectedValue === 'review'}>
        Next
      </Button>
      <Button
        appearance="outline"
        onClick={async () => {
          setIsLoadingCreate(true);
          await onCreateClick();
          setIsLoadingCreate(false);
        }}
        disabled={!(existingWorkflowName ?? workflowName) || !kind}
      >
        {isLoadingCreate ? <Spinner size="extra-tiny" /> : intlText.CREATE}
      </Button>
    </>
  );
};
