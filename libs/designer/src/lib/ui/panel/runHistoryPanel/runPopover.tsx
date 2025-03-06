import { Button, Popover, PopoverTrigger, PopoverSurface } from '@fluentui/react-components';
import type { Run } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

import { bundleIcon, MoreHorizontalFilled, MoreHorizontalRegular } from '@fluentui/react-icons';
import { RunProperty } from './runProperty';
import { useCallback } from 'react';
import type { FilterTypes } from './runHistoryPanel';

const MoreIcon = bundleIcon(MoreHorizontalFilled, MoreHorizontalRegular);

export const RunPopover = (props: {
  run: Run;
  addFilterCallback: ({ key, value }: { key: FilterTypes; value: string }) => void;
}) => {
  const { run } = props;

  const intl = useIntl();

  const runIdentifierText = intl.formatMessage({
    defaultMessage: 'Run identifier',
    description: 'Run identifier text',
    id: 'ms039fc8a926c8',
  });

  const workflowVersionText = intl.formatMessage({
    defaultMessage: 'Workflow version',
    description: 'Workflow version text',
    id: 'msd6d98dda8818',
  });

  const workflowRunStatusText = intl.formatMessage({
    defaultMessage: 'Workflow run status',
    description: 'Workflow run status text',
    id: 'ms77d442baad12',
  });

  const filterVersionCallback = useCallback(() => {
    const version = (run.properties.workflow as any)?.name;
    props.addFilterCallback({ key: 'workflowVersion', value: version });
  }, [run.properties.workflow, props]);

  return (
    <Popover withArrow positioning={'after'}>
      <PopoverTrigger disableButtonEnhancement>
        <Button icon={<MoreIcon />} appearance={'subtle'} onClick={(e) => e.stopPropagation()} />
      </PopoverTrigger>

      <PopoverSurface tabIndex={-1} className={'run-actions-popover'}>
        <RunProperty label={workflowRunStatusText} text={run.properties.status} />
        <RunProperty label={runIdentifierText} text={run.id.split('/').at(-1) ?? ''} copyable />
        <RunProperty
          label={workflowVersionText}
          text={(run.properties.workflow as any)?.name}
          copyable
          addFilterCallback={filterVersionCallback}
        />
      </PopoverSurface>
    </Popover>
  );
};
