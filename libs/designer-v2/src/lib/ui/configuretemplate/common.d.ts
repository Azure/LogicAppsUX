/// <reference types="react" />
export declare const DescriptionWithLink: ({ text, linkText, linkUrl, className, }: {
    text: string;
    linkText?: string | undefined;
    linkUrl?: string | undefined;
    className?: string | undefined;
}) => import("react/jsx-runtime").JSX.Element;
export declare const ErrorBar: ({ title, errorMessage, styles, messageInNewline, }: {
    title?: string | undefined;
    errorMessage: string;
    messageInNewline?: boolean | undefined;
    styles?: import("react").CSSProperties | undefined;
}) => import("react/jsx-runtime").JSX.Element;
export declare const tableHeaderStyle: {
    fontWeight: number;
};
