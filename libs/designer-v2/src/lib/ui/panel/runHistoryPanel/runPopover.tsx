import { Button, Popover, PopoverTrigger, PopoverSurface } from '@fluentui/react-components';
import type { Run } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

import { bundleIcon, MoreHorizontalFilled, MoreHorizontalRegular } from '@fluentui/react-icons';
import { RunProperty } from './runProperty';
import { useCallback } from 'react';
import type { FilterTypes } from './runHistoryPanel';
import { useRunHistoryPanelStyles } from './runHistoryPanel.styles';

const MoreIcon = bundleIcon(MoreHorizontalFilled, MoreHorizontalRegular);

export const RunPopover = (props: {
  run: Run;
  addFilterCallback: ({ key, value }: { key: FilterTypes; value: string }) => void;
}) => {
  const { run } = props;

  const intl = useIntl();

  const styles = useRunHistoryPanelStyles();

  const runIdentifierText = intl.formatMessage({
    defaultMessage: 'Run identifier',
    description: 'Run identifier text',
    id: 'A5/IqS',
  });

  const workflowVersionText = intl.formatMessage({
    defaultMessage: 'Workflow version',
    description: 'Workflow version text',
    id: '1tmN2o',
  });

  const filterVersionCallback = useCallback(() => {
    const version = (run.properties.workflow as any)?.name;
    props.addFilterCallback({ key: 'workflowVersion', value: version });
  }, [run.properties.workflow, props]);

  return (
    <Popover withArrow positioning={'after'}>
      <PopoverTrigger disableButtonEnhancement>
        <Button icon={<MoreIcon />} appearance={'transparent'} onClick={(e) => e.stopPropagation()} />
      </PopoverTrigger>

      <PopoverSurface tabIndex={-1} className={styles.runActionsPopover}>
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
