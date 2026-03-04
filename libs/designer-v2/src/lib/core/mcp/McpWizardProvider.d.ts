import type { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import type React from 'react';
export interface McpWizardProviderProps {
    theme?: ThemeType;
    locale?: string;
    useExternalRedux?: boolean;
    children: React.ReactNode;
}
export declare const McpWizardProvider: ({ locale, useExternalRedux, children, theme }: McpWizardProviderProps) => import("react/jsx-runtime").JSX.Element;
