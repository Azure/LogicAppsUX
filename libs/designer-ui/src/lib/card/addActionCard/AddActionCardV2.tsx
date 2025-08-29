import { useCardKeyboardInteraction } from '../hooks';
import { Tooltip, mergeClasses } from '@fluentui/react-components';
import { Add24Regular } from '@fluentui/react-icons';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useAddActionCardV2Styles } from './addActionCardV2.styles';
import { ADD_CARD_TYPE } from '.';

export interface AddActionCardPropsV2 {
  addCardType: ADD_CARD_TYPE;
  onClick: () => void;
  selected: boolean;
}

export const AddActionCardV2: React.FC<AddActionCardPropsV2> = ({ addCardType, onClick, selected }) => {
  const intl = useIntl();
  const classes = useAddActionCardV2Styles();

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.();
  };

  const keyboardInteraction = useCardKeyboardInteraction(onClick);

  const triggerTitle = intl.formatMessage({
    defaultMessage: 'Add Trigger',
    id: 'l5bNjT',
    description: 'Text on example trigger node',
  });

  const actionTitle = intl.formatMessage({
    defaultMessage: 'Add Action',
    id: 'Yskw5t',
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
            data-automation-id={`card-${replaceWhiteSpaceWithUnderscore(title)}`}
            onClick={handleClick}
            onKeyDown={keyboardInteraction.keyDown}
            onKeyUp={keyboardInteraction.keyUp}
            tabIndex={0}
            role="button"
          >
            <Add24Regular className={classes.addIcon} />
          </div>
          <div className={classes.cardTitle}>{title}</div>
        </div>
      </Tooltip>
    </>
  );
};
