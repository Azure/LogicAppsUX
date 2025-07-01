import { useCardKeyboardInteraction } from '../hooks';
import AddNodeIcon from './addNodeIcon.svg';
import { Tooltip, mergeClasses } from '@fluentui/react-components';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useAddActionCardStyles } from './addActionCard.styles';
import { getCardStyle } from '../utils';

export const ADD_CARD_TYPE = {
  TRIGGER: 'Trigger',
  ACTION: 'Action',
} as const;
export type ADD_CARD_TYPE = (typeof ADD_CARD_TYPE)[keyof typeof ADD_CARD_TYPE];

export interface AddActionCardProps {
  addCardType: ADD_CARD_TYPE;
  onClick: () => void;
  selected: boolean;
}

export const AddActionCard: React.FC<AddActionCardProps> = ({ addCardType, onClick, selected }) => {
  const intl = useIntl();
  const classes = useAddActionCardStyles();

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.();
  };

  const keyboardInteraction = useCardKeyboardInteraction(onClick);

  const brandColor = '#484F58';
  const cardIcon = (
    <div className={classes.cardContentIconSection}>
      <img
        className={classes.cardIcon}
        src={AddNodeIcon}
        alt=""
        style={{
          background: brandColor,
          padding: '4px',
          width: '16px',
          height: '16px',
        }}
      />
    </div>
  );

  const triggerTitle = intl.formatMessage({
    defaultMessage: 'Add a trigger',
    id: 'q1gfIs',
    description: 'Text on example trigger node',
  });

  const actionTitle = intl.formatMessage({
    defaultMessage: 'Add an action',
    id: '7ZR1xr',
    description: 'Text on example action node',
  });

  const title = addCardType === ADD_CARD_TYPE.TRIGGER ? triggerTitle : actionTitle;

  const triggerTooltipHeading = intl.formatMessage({
    defaultMessage: 'Triggers',
    id: '3GINhd',
    description: 'Heading for a tooltip explaining Triggers',
  });

  const triggerTooltipBody = intl.formatMessage({
    defaultMessage: 'Triggers tell your app when to start running. Each workflow needs at least one trigger.',
    id: 'VbMYd8',
    description: 'Description of what Triggers are, on a tooltip about Triggers',
  });

  const actionTooltipHeading = intl.formatMessage({
    defaultMessage: 'Actions',
    id: 'MYgKHu',
    description: 'Heading for a tooltip explaining Actions',
  });

  const actionTooltipBody = intl.formatMessage({
    defaultMessage: 'Actions perform operations on data, communicate between systems, or run other tasks.',
    id: '1dlfUe',
    description: 'Description of what Actions are, on a tooltip about Actions',
  });

  const tooltipHeading = addCardType === ADD_CARD_TYPE.TRIGGER ? triggerTooltipHeading : actionTooltipHeading;
  const tooltipBody = addCardType === ADD_CARD_TYPE.TRIGGER ? triggerTooltipBody : actionTooltipBody;
  const tooltipId = `placeholder-node-${addCardType}`;
  const tooltipDescriptionId = `${tooltipId}-description`;

  const tooltipContent = (
    <div className={classes.tooltipContent}>
      <h2 className={classes.tooltipHeading}>{tooltipHeading}</h2>
      <p className={classes.tooltipBody}>{tooltipBody}</p>
    </div>
  );

  return (
    <>
      {/* Hidden element for screen readers to access tooltip content */}
      <div id={tooltipDescriptionId} style={{ display: 'none' }}>
        {tooltipHeading}: {tooltipBody}
      </div>
      <Tooltip relationship="description" showDelay={0} hideDelay={0} withArrow content={tooltipContent} positioning="after">
        <div className={classes.root}>
          <div
            aria-label={title}
            aria-describedby={tooltipDescriptionId}
            className={mergeClasses(classes.cardContainer, selected && classes.cardContainerSelected)}
            data-testid={`card-${title}`}
            style={getCardStyle(brandColor)}
            data-automation-id={`card-${replaceWhiteSpaceWithUnderscore(title)}`}
            onClick={handleClick}
            onKeyDown={keyboardInteraction.keyDown}
            onKeyUp={keyboardInteraction.keyUp}
            tabIndex={0}
          >
            <div className={mergeClasses(classes.selectionBox, selected && 'selected')} />
            <div className={classes.cardMain}>
              <div className={classes.cardHeader} role="button">
                <div className={classes.cardContentContainer}>
                  <div className={classes.cardContentGripperSection} />
                  {cardIcon}
                  <div className={classes.cardTopContent}>
                    <div className={classes.cardTitle}>{title}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Tooltip>
    </>
  );
};
