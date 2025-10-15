import { AccordionHeader, AccordionItem, AccordionPanel, Divider, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { Grid } from '@microsoft/designer-ui';
import { useOperationsAccordionStyles } from './styles/OperationsAccordion.styles';

export interface OperationAccordionItemProps {
  value: string;
  title: string;
  items: any[];
  isLoading: boolean;
  onOperationClick: (id: string, apiId?: string) => void;
  messageText?: string;
  showMessage?: boolean;
}

export const OperationAccordionItem = ({
  value,
  title,
  items,
  isLoading,
  onOperationClick,
  messageText,
  showMessage = false,
}: OperationAccordionItemProps) => {
  const classes = useOperationsAccordionStyles();

  return (
    <AccordionItem value={value}>
      <AccordionHeader>
        {title} ({items.length})
      </AccordionHeader>
      <AccordionPanel className={showMessage ? classes.accordionPanelWithMessage : classes.accordionPanel}>
        {showMessage && messageText && (
          <MessageBar className={classes.messageBar} layout="multiline">
            <MessageBarBody>{messageText}</MessageBarBody>
          </MessageBar>
        )}
        <Grid
          isLoading={isLoading}
          items={items}
          onOperationSelected={onOperationClick}
          showEmptyState={false}
          displayRuntimeInfo={false}
        />
      </AccordionPanel>
      <Divider />
    </AccordionItem>
  );
};
