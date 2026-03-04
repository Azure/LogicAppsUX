import { type FormEvent } from 'react';
export declare const LegacyMultiAuthOptions: {
    readonly oauth: 0;
    readonly servicePrincipal: 1;
    readonly managedIdentity: 2;
};
export type LegacyMultiAuthOptions = (typeof LegacyMultiAuthOptions)[keyof typeof LegacyMultiAuthOptions];
export interface LegacyMultiAuthProps {
    isLoading: boolean;
    value: number;
    onChange: (_event: FormEvent<HTMLDivElement>, item: any) => void;
    supportsOAuthConnection?: boolean;
    supportsServicePrincipalConnection: boolean;
    supportsLegacyManagedIdentityConnection: boolean;
}
declare const LegacyMultiAuth: ({ isLoading, value, onChange, supportsOAuthConnection, supportsServicePrincipalConnection, supportsLegacyManagedIdentityConnection, }: LegacyMultiAuthProps) => import("react/jsx-runtime").JSX.Element;
export default LegacyMultiAuth;
