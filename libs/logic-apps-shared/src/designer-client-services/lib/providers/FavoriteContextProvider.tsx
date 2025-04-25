import { createContext, useContext } from 'react';

type FavoriteContextType = {
  isOperationFavorited: (connectorId: string, operationId?: string) => boolean;
  onFavoriteClick: (isSelected: boolean, connectorId: string, operationId?: string) => void;
};

export const FavoriteContext = createContext<FavoriteContextType | undefined>(undefined);

export const useFavoriteContext = () => {
  const context = useContext(FavoriteContext);
  if (!context) {
    throw new Error('useFavoriteContext must be used within a FavoriteProvider');
  }
  return context;
};
