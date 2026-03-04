/// <reference types="react" />
import { MessageLevel } from '@microsoft/designer-ui';
type ErrorCategoryProps = {
    title: string;
    level: MessageLevel;
    numMessages: number;
    children: React.ReactNode;
};
export declare const ErrorCategory: (props: ErrorCategoryProps) => import("react/jsx-runtime").JSX.Element | null;
export {};
