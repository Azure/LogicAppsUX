import type { DesignerOptionsState, ServiceOptions } from './state/designerOptions/designerOptionsInterfaces';
import type React from 'react';
export interface DesignerProviderProps {
    key?: string;
    id?: string;
    locale?: string;
    options: Omit<DesignerOptionsState, 'servicesInitialized'> & {
        services: ServiceOptions;
    };
    children: React.ReactNode;
}
export declare const DesignerProvider: ({ id, locale, options, children }: DesignerProviderProps) => import("react/jsx-runtime").JSX.Element;
