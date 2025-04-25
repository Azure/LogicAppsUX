import { Button, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { Star12Filled, Star12Regular } from '@fluentui/react-icons';
import { useFavoriteContext } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

export interface IFavoriteButtonProps {
  connectorId: string;
  operationId?: string;
  showFilledFavoriteOnlyOnHover?: boolean;
  showUnfilledFavoriteOnlyOnHover?: boolean;
}

const useFavoriteButtonStyles = makeStyles({
  favoriteButton: {
    color: tokens.colorBrandForeground2,
    padding: '0px',
    minWidth: '20px',
  },
  visibleOnHover: {
    display: 'none',
  },
});

export const FavoriteButton: React.FC<IFavoriteButtonProps> = ({
  connectorId,
  operationId,
  showFilledFavoriteOnlyOnHover,
  showUnfilledFavoriteOnlyOnHover,
}) => {
  const { isOperationFavorited, onFavoriteClick } = useFavoriteContext();
  const isFavorited = isOperationFavorited(connectorId, operationId);

  const intl = useIntl();
  const classNames = useFavoriteButtonStyles();

  const visibleOnHoverClasses = mergeClasses(classNames.visibleOnHover, 'favorite-button-visible-on-hover');
  const favoriteButtonClasses = mergeClasses(
    classNames.favoriteButton,
    ((isFavorited && showFilledFavoriteOnlyOnHover) || (!isFavorited && showUnfilledFavoriteOnlyOnHover)) && visibleOnHoverClasses
  );

  const StarIcon = isFavorited ? Star12Filled : Star12Regular;

  const favoriteButtonText = intl.formatMessage({
    defaultMessage: 'Favorite',
    id: 'MXTnCr',
    description: 'Favorite button text',
  });

  return (
    <Button
      className={favoriteButtonClasses}
      appearance="transparent"
      onClick={(e) => {
        e.stopPropagation();
        onFavoriteClick(!isFavorited, connectorId, operationId);
      }}
      icon={<StarIcon />}
      title={favoriteButtonText}
    />
  );
};
