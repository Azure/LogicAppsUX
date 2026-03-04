/// <reference types="react" />
import type { PayloadData } from './index';
type PayloadPopoverProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    buttonRef: React.RefObject<HTMLButtonElement>;
    onSubmit: (data: PayloadData) => void;
    isDraftMode?: boolean;
};
export declare const PayloadPopover: ({ open, setOpen, buttonRef, onSubmit, isDraftMode }: PayloadPopoverProps) => import("react/jsx-runtime").JSX.Element;
export {};
