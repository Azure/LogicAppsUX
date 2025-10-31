import { useCardKeyboardInteraction } from '../hooks';
import { Text, Tooltip, mergeClasses } from '@fluentui/react-components';
import { Add24Filled } from '@fluentui/react-icons';
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
    defaultMessage: 'Add trigger',
    id: 'vijxB3',
    description: 'Text on example trigger node',
  });

  const actionTitle = intl.formatMessage({
    defaultMessage: 'Add Action',
    id: 'Yskw5t',
    description: 'Text on example action node',
  });

  const title = addCardType === ADD_CARD_TYPE.TRIGGER ? triggerTitle : actionTitle;

  const triggerTooltip = intl.formatMessage({
    defaultMessage: 'Add trigger to start your workflow',
    id: 'WSoSMe',
    description: 'Tooltip for adding a trigger to the workflow',
  });

  const actionTooltip = intl.formatMessage({
    defaultMessage: 'Add actions to define the steps in your workflow',
    id: '+oX/2M',
    description: 'Description of what Actions are, on a tooltip about Actions',
  });

  const tooltipText = addCardType === ADD_CARD_TYPE.TRIGGER ? triggerTooltip : actionTooltip;
  const tooltipId = `placeholder-node-${addCardType}`;
  const tooltipDescriptionId = `${tooltipId}-description`;

  return (
    <>
      {/* Hidden element for screen readers to access tooltip content */}
      <div id={tooltipDescriptionId} style={{ display: 'none' }}>
        {tooltipText}
      </div>
      <div id={'laux-v2-add-trigger-node'} className={classes.root}>
        <Tooltip relationship="description" showDelay={0} hideDelay={0} withArrow content={tooltipText} positioning="before">
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
            <Add24Filled className={classes.addIcon} />
          </div>
        </Tooltip>
        <Text className={classes.cardTitle}>{title}</Text>
      </div>
    </>
  );
};
