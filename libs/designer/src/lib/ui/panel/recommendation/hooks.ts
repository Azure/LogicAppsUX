import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useDiscoveryPanelFavoriteOperations } from '../../../core/state/panel/panelSelectors';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../core';
import { setFavoriteOperations } from '../../../core/state/panel/panelSlice';

export const useOnFavoriteClick = () => {
  const favorites = useDiscoveryPanelFavoriteOperations();
  const dispatch = useDispatch<AppDispatch>();

  return useCallback(
    (isSelected: boolean, connectorId: string, operationId?: string) => {
      let newFavorites = [...favorites];
      if (isSelected) {
        newFavorites.push({
          connectorId,
          operationId,
        });
      } else {
        newFavorites = newFavorites.filter((favorite) => !(favorite.connectorId === connectorId && favorite.operationId === operationId));
      }
      dispatch(setFavoriteOperations(newFavorites));
      localStorage.setItem('msla-favoriteOperations', JSON.stringify(newFavorites));

      LoggerService().log({
        area: 'favoriteButton.useOnFavoriteClick',
        level: LogEntryLevel.Verbose,
        message: 'Successfully set new favorite connectors/actions for user.',
        args: [
          `connectorId: ${connectorId}`,
          `isSelected: ${isSelected}`,
          `operationId: ${operationId}`,
          `totalFavorites: ${newFavorites.length}`,
        ],
      });
    },
    [dispatch, favorites]
  );
};
