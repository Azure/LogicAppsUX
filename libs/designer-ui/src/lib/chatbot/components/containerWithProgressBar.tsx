import constants from '../constants';
import type { IStyle } from '@fluentui/react';
import { keyframes, mergeStyleSets, useTheme } from '@fluentui/react';
import React from 'react';

type ContainerWithProgressBarProps = {
  percentComplete?: number;
  children: React.ReactNode;
  styles?: Partial<IContainerWithProgressBarStyles>;
  dataAutomationId?: string;
};

export const ContainerWithProgressBar: React.FC<ContainerWithProgressBarProps> = ({
  children,
  percentComplete,
  styles,
  dataAutomationId,
}) => {
  const { isInverted } = useTheme();
  const containerClassNames = mergeStyleSets(getContainerStyles(isInverted), styles);
  return (
    <div className={containerClassNames.root} data-automation-id={dataAutomationId}>
      <div className={containerClassNames.content}>{children}</div>
      <ProgressBar percentComplete={percentComplete} styles={styles?.progressBar} />
    </div>
  );
};

const ProgressBar: React.FC<{ percentComplete?: number; styles: IStyle }> = ({ percentComplete, styles }) => {
  const progressBarClassNames = mergeStyleSets(getProgressBarStyles(), styles);
  const isProgressIndeterminate = percentComplete === undefined;
  return (
    <div
      className={progressBarClassNames.root}
      role={'progressbar'}
      aria-valuenow={percentComplete} // mdn: aria-valuenow should be provided and updated unless the value is indeterminate
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={progressBarClassNames.emptyProgressBar}>
        <div
          className={progressBarClassNames.fillingProgressBar}
          style={{
            left: isProgressIndeterminate ? '0%' : `${(percentComplete ?? 0) - 100}%`,
          }}
        />
      </div>
    </div>
  );
};

export interface IContainerWithProgressBarStyles {
  root: IStyle;
  content: IStyle;
  progressBar: IStyle;
}

const getContainerStyles = (isInverted?: boolean) => {
  return {
    root: {
      background: isInverted ? constants.DARK_SECONADRY : constants.WHITE,
      boxShadow: constants.ELEVATION4,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      borderRadius: 8,
      margin: '20px 0 0 0',
      overflow: 'hidden',
    },
    content: {
      flexGrow: 1,
      display: 'flex',
      alignItems: 'center',
      padding: 12,
    },
  };
};

const getProgressBarStyles = () => {
  return {
    root: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      flexDirection: 'column',
    },
    emptyProgressBar: {
      width: '100%',
      backgroundColor: constants.NEUTRAL_LIGHTER,
      borderRadius: 8,
      height: 5,
      position: 'relative',
    },
    fillingProgressBar: {
      background: 'linear-gradient(110deg, #0F6CBD 5%, #46E2FA 30%, #CD75FF 50%, #46E2FA 70% ,#0F6CBD 95%);',
      backgroundSize: '200% 200%',
      borderRadius: 0,
      height: '100%',
      width: '100%',
      position: 'absolute',
      transition: '1s',
      animationName: backgroundMotion,
      animationDuration: '1500ms',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'linear',
    },
  };
};

const backgroundMotion: string = keyframes({
  '0%': { backgroundPosition: '260% 175%' },
  '20%': { backgroundPosition: '175% 150%' },
  '40%': { backgroundPosition: '150% 100%' },
  '60%': { backgroundPosition: '100% 75%' },
  '80%': { backgroundPosition: '75% 50%' },
  '100%': { backgroundPosition: '50% 0%' },
});
