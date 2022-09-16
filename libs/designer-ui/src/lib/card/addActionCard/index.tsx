import { useCardKeyboardInteraction } from '../hooks';
import { getCardStyle } from '../utils';
import AddNodeIcon from './addNodeIcon.svg';
import { TooltipHost, DirectionalHint, css } from '@fluentui/react';
import { useIntl } from 'react-intl';

export enum ADD_CARD_TYPE {
  TRIGGER = 'Trigger',
  ACTION = 'Action',
}

export interface AddActionCardProps {
  addCardType: ADD_CARD_TYPE;
  onClick: () => void;
  selected: boolean;
}

export const AddActionCard: React.FC<AddActionCardProps> = ({ addCardType, onClick, selected }) => {
  const intl = useIntl();

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.();
  };

  const keyboardInteraction = useCardKeyboardInteraction(onClick, []);

  const brandColor = '#484F58';
  const cardIcon = (
    <div className="panel-card-content-icon-section">
      <img
        className="panel-card-icon"
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
    description: 'Text on example trigger node',
  });

  const actionTitle = intl.formatMessage({
    defaultMessage: 'Add an action',
    description: 'Text on example action node',
  });

  const title = addCardType === ADD_CARD_TYPE.TRIGGER ? triggerTitle : actionTitle;

  const triggerTooltipHeading = intl.formatMessage({
    defaultMessage: 'Triggers',
    description: 'Heading for a tooltip explaining Triggers',
  });

  const triggerTooltipBody = intl.formatMessage({
    defaultMessage: 'Triggers tell your app when to start running. Each workflow needs at least one trigger.',
    description: 'Description of what Triggers are, on a tooltip about Triggers',
  });

  const actionTooltipHeading = intl.formatMessage({
    defaultMessage: 'Actions',
    description: 'Heading for a tooltip explaining Actions',
  });

  const actionTooltipBody = intl.formatMessage({
    defaultMessage: 'Actions perform operations on data or communicate between systems to execute.',
    description: 'Description of what Actions are, on a tooltip about Actions',
  });

  const tooltipHeading = addCardType === ADD_CARD_TYPE.TRIGGER ? triggerTooltipHeading : actionTooltipHeading;
  const tooltipBody = addCardType === ADD_CARD_TYPE.TRIGGER ? triggerTooltipBody : actionTooltipBody;

  return (
    <TooltipHost
      id={`placeholder-node-${addCardType}`}
      delay={0}
      directionalHint={DirectionalHint.rightCenter}
      calloutProps={{ gapSpace: 8 }}
      tooltipProps={{
        onRenderContent: () => (
          <div style={{ margin: '-8px 12px 0px', maxWidth: '250px' }}>
            <h2>{tooltipHeading}</h2>
            <p>{tooltipBody}</p>
          </div>
        ),
      }}
    >
      <div style={{ position: 'relative' }}>
        <div
          aria-label={title}
          className={css('msla-panel-card-container', selected && 'msla-panel-card-container-selected')}
          style={getCardStyle(brandColor)}
          data-testid={`card-${title}`}
          onClick={handleClick}
          onKeyDown={keyboardInteraction.keyDown}
          onKeyUp={keyboardInteraction.keyUp}
          tabIndex={0}
        >
          <div className={css('msla-selection-box', selected && 'selected')} />
          <div className="panel-card-main">
            <div className="panel-card-header" role="button">
              <div className="panel-card-content-container">
                <div className={'panel-card-content-gripper-section'} />
                {cardIcon}
                <div className="panel-card-top-content">
                  <div className="panel-msla-title">{title}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipHost>
  );
};
