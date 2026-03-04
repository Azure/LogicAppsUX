import type { Theme } from '@fluentui/react-components';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import type React from 'react';
interface ExtendedTheme extends Theme {
    [key: string]: any;
}
export declare const customTokens: Record<keyof ExtendedTheme, string>;
export interface TemplatesDesignerProviderProps {
    id?: string;
    theme?: ThemeType;
    locale?: string;
    useExternalRedux?: boolean;
    children: React.ReactNode;
}
export declare const TemplatesDesignerProvider: ({ id, theme, locale, useExternalRedux, children, }: TemplatesDesignerProviderProps) => import("react/jsx-runtime").JSX.Element;
export {};
