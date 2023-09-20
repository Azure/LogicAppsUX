import constants from '../constants';
import StopGenerating from '../images/StopGenerating.svg';
import { animations } from './animations';
import type { IContainerWithProgressBarStyles } from './containerWithProgressBar';
import { ContainerWithProgressBar } from './containerWithProgressBar';
import type { IStyle } from '@fluentui/react';
import { keyframes, mergeStyleSets } from '@fluentui/react';
import type { IButtonStyles } from '@fluentui/react/lib/Button';
import { ActionButton } from '@fluentui/react/lib/Button';
import React from 'react';
import { useIntl } from 'react-intl';

export type ProgressCardWithStopButtonProps = {
  progressState: string;
  onStopButtonClick?: () => void;
  stopButtonLabel?: string;
  styles?: Partial<IProgressCardWithStopButtonStyles>;
  dataAutomationId?: string;
};

export const ProgressCardWithStopButton: React.FC<ProgressCardWithStopButtonProps> = ({
  progressState,
  onStopButtonClick,
  stopButtonLabel,
  styles,
  dataAutomationId,
}) => {
  const intl = useIntl();
  const intlText = {
    stopButtonAltText: intl.formatMessage({
      defaultMessage: 'Stop',
      description: 'Chatbot stop generating flow button alt text',
    }),
  };
  const classNames = mergeStyleSets(getStyles(), styles);
  return (
    <div className={animations.progressCardEnter}>
      <ContainerWithProgressBar styles={styles?.containerWithProgressBar} dataAutomationId={dataAutomationId}>
        {progressState}
      </ContainerWithProgressBar>
      {onStopButtonClick && stopButtonLabel && (
        <div className={classNames.stopContainer}>
          <img src={StopGenerating} alt={intlText.stopButtonAltText} />
          <ActionButton
            text={stopButtonLabel}
            iconProps={{ styles: { root: { paddingBottom: 3 } } }}
            styles={mergeStyleSets(getActionButtonStyles(), styles?.actionButton)}
            onClick={onStopButtonClick}
          ></ActionButton>
        </div>
      )}
    </div>
  );
};

export interface IProgressCardWithStopButtonStyles {
  containerWithProgressBar: Partial<IContainerWithProgressBarStyles>;
  stopContainer: IStyle;
  actionButton: Partial<IButtonStyles>;
}

const getStyles = () => {
  return {
    root: {
      animationDuration: '0.8s',
      animationTimingFunction: 'cubic-bezier(0.55,0.55,0,1)',
      animationName: slideAndFadeInFromBottom,
    },
    stopContainer: {
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
    },
  };
};

const getActionButtonStyles = () => {
  return {
    root: {
      color: constants.NEUTRAL_PRIMARY,
      backgroundColor: 'transparent',
    },
    icon: {
      paddingTop: 2,
      color: constants.NEUTRAL_PRIMARY,
    },
    iconPressed: {
      color: constants.NEUTRAL_PRIMARY,
    },
    rootHovered: {
      color: constants.NEUTRAL_PRIMARY_ALT,
      backgroundColor: 'transparent',
    },
    iconHovered: {
      color: constants.NEUTRAL_PRIMARY_ALT,
    },
    rootPressed: {
      backgroundColor: 'transparent',
    },
  };
};

const slideAndFadeInFromBottom = keyframes({
  from: {
    opacity: 0,
    transform: 'translate3d(0px, 10px, 10px)',
  },
  to: {
    opacity: 1,
    transform: 'translate3d(0, 0, 0)',
  },
});
