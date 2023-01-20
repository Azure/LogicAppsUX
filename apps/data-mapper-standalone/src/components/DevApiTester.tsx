import { Stack, StackItem } from '@fluentui/react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Button, tokens } from '@fluentui/react-components';

export const DevApiTester = () => {
  return (
    <div style={{ marginBottom: '20px', backgroundColor: tokens.colorNeutralBackground2, padding: 4 }}>
      <Accordion collapsible>
        <AccordionItem value="1">
          <AccordionHeader>Dev API Tester</AccordionHeader>
          <AccordionPanel>
            <Stack horizontal tokens={{ childrenGap: '8px' }} wrap>
              <StackItem key={'themeDropDown'} style={{ width: '250px' }}>
                <Button />
              </StackItem>
            </Stack>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
