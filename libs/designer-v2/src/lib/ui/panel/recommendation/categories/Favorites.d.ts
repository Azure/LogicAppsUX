export interface FavoritesProps {
    onConnectorSelected: (connectorId: string, origin?: string) => void;
    onOperationSelected: (operationId: string, apiId?: string) => void;
}
export declare const Favorites: ({ onConnectorSelected, onOperationSelected }: FavoritesProps) => import("react/jsx-runtime").JSX.Element;
