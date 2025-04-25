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

const useStyles = makeStyles({
  button: {
    color: tokens.colorBrandForeground2,
    padding: 0,
    minWidth: '20px',
  },
  hoverVisible: {
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
  const styles = useStyles();

  const shouldHideByDefault = (isFavorited && showFilledFavoriteOnlyOnHover) || (!isFavorited && showUnfilledFavoriteOnlyOnHover);

  const buttonClass = mergeClasses(
    styles.button,
    shouldHideByDefault && styles.hoverVisible,
    shouldHideByDefault && 'favorite-button-visible-on-hover'
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteClick(!isFavorited, connectorId, operationId);
  };

  return (
    <Button
      className={buttonClass}
      appearance="transparent"
      onClick={handleClick}
      icon={isFavorited ? <Star12Filled /> : <Star12Regular />}
      title={intl.formatMessage({
        defaultMessage: 'Favorite',
        id: 'MXTnCr',
        description: 'Favorite button text',
      })}
    />
  );
};
