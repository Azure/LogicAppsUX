import { RecordStopFilled } from '@fluentui/react-icons';
import { animations } from './animations';
import type { IContainerWithProgressBarStyles } from './containerWithProgressBar';
import { ContainerWithProgressBar } from './containerWithProgressBar';
import type { IStyle } from '@fluentui/react';
import { keyframes, mergeStyleSets } from '@fluentui/react';
import type { IButtonStyles } from '@fluentui/react/lib/Button';
import type React from 'react';
import { Button } from '@fluentui/react-components';

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
  const classNames = mergeStyleSets(getStyles(), styles);
  return (
    <div className={animations.progressCardEnter}>
      <ContainerWithProgressBar styles={styles?.containerWithProgressBar} dataAutomationId={dataAutomationId}>
        {progressState}
      </ContainerWithProgressBar>
      {onStopButtonClick && stopButtonLabel && (
        <div className={classNames.stopContainer}>
          <Button
            icon={<RecordStopFilled />}
            appearance="transparent"
            onClick={onStopButtonClick}
            style={{ margin: '8px 0' }}
            size={'small'}
          >
            {stopButtonLabel}
          </Button>
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
      alignItems: 'center',
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
