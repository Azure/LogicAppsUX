import constants from '../constants';
import type { IStyle } from '@fluentui/react';
import { keyframes, mergeStyleSets } from '@fluentui/react';
import type React from 'react';

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
  const containerClassNames = mergeStyleSets(getContainerStyles(), styles);
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

const getContainerStyles = () => {
  return {
    root: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      margin: '20px 0 0 0',
      overflow: 'hidden',
    },
    content: {
      flexGrow: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '4px 8px',
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
      background: 'linear-gradient(90deg, transparent 0%,  #b4a0ff 25%, #7160e8 50%, #b4a0ff 75%, transparent 100%)',
      backgroundSize: '200% 200%',
      borderRadius: 8,
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
  '0%': { backgroundPosition: '200% 0%' },
  '100%': { backgroundPosition: '0% 0%' },
});
