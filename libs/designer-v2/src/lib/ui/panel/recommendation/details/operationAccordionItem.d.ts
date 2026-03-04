export interface OperationAccordionItemProps {
    value: string;
    title: string;
    items: any[];
    isLoading: boolean;
    onOperationClick: (id: string, apiId?: string) => void;
    messageText?: string;
    showMessage?: boolean;
}
export declare const OperationAccordionItem: ({ value, title, items, isLoading, onOperationClick, messageText, showMessage, }: OperationAccordionItemProps) => import("react/jsx-runtime").JSX.Element;
