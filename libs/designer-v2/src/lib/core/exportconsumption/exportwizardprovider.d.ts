import type { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import type React from 'react';
export interface ExportWizardProviderProps {
    theme?: ThemeType;
    locale?: string;
    useExternalRedux?: boolean;
    children: React.ReactNode;
}
export declare const ExportWizardProvider: ({ locale, useExternalRedux, children, theme }: ExportWizardProviderProps) => import("react/jsx-runtime").JSX.Element;
