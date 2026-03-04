export interface ClientSecretInputProps {
    isLoading: boolean | undefined;
    parameterKey: string;
    setValue: (value: any) => void;
    value: any;
}
export interface IClientCertificateMetadata {
    pfx: string;
    password: string;
}
declare const ClientSecretInput: (props: ClientSecretInputProps) => import("react/jsx-runtime").JSX.Element;
export default ClientSecretInput;
