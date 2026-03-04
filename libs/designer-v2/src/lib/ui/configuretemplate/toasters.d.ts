import { type ToastOffset } from '@fluentui/react-components';
export interface TemplateInfoToasterProps {
    title: string;
    content: string;
    show: boolean;
    offset?: ToastOffset;
}
export declare const TemplateInfoToast: ({ title, content, show, offset }: TemplateInfoToasterProps) => import("react/jsx-runtime").JSX.Element;
