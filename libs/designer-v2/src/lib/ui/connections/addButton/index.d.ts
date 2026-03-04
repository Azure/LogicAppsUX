/// <reference types="react" />
export interface AddButtonProps {
    id?: string;
    dataAutomationId?: string;
    className?: string;
    disabled?: boolean;
    title: string;
    tabIndex?: number;
    onClick?(e: React.MouseEvent<HTMLElement>): void;
}
export declare const AddButton: React.FC<AddButtonProps>;
