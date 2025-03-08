import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, CounterBadge, Text } from '@fluentui/react-components';
import { useReduxActionCounts } from '../../../../core/state/dev/devSelectors';
import { useMemo } from 'react';
import { sortRecord } from '@microsoft/logic-apps-shared';

export const ReduxActionCounts = () => {
  const actionCounts = useReduxActionCounts();
  const sortedActions = useMemo(() => sortRecord(actionCounts, (_k1, v1, _k2, v2) => v2 - v1), [actionCounts]);

  return (
    <Accordion collapsible>
      <AccordionItem value={1}>
        <AccordionHeader>
          <CounterBadge appearance="ghost" style={{ minWidth: '30px', marginRight: '8px' }}>
            {Object.keys(sortedActions).length}
          </CounterBadge>
          <Text>Redux Actions Dispatched</Text>
        </AccordionHeader>
        <AccordionPanel>
          {Object.entries(sortedActions).map(([action, count]) => (
            <div key={action}>
              <CounterBadge appearance="ghost" style={{ minWidth: '30px', marginRight: '8px' }}>
                {count}
              </CounterBadge>
              <Text>{action}</Text>
            </div>
          ))}
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};
