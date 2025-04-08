import { makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { useCallback, useEffect, useRef, useState } from 'react';

const useStyles = makeStyles({
  resizer: {
    ...shorthands.borderLeft('1px', 'solid', tokens.colorNeutralBackground5),

    width: '8px',
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    cursor: 'col-resize',
    resize: 'horizontal',

    ':hover': {
      borderLeftWidth: '4px',
    },
  },

  resizerActive: {
    borderLeftWidth: '4px',
    borderLeftColor: tokens.colorNeutralBackground5Pressed,
  },
});

interface PanelResizerProps {
  minWidth?: number;
  updatePanelWidth: (width: string) => void;
  panelRef?: React.RefObject<HTMLDivElement>;
}

export const PanelResizer = (props: PanelResizerProps): JSX.Element => {
  const { minWidth = 400, updatePanelWidth, panelRef } = props;
  const styles = useStyles();
  const [isResizing, setIsResizing] = useState(false);
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const animationFrame = useRef<number>(0);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) {
        return;
      }
      e.preventDefault();
      const { clientX } = e;

      if (panelRef?.current) {
        const panelRefRect = panelRef.current.getBoundingClientRect();
        // Calculate width as the distance from the mouse to the container's right edge
        const newWidth = Math.max(panelRefRect.right - clientX, minWidth);
        updatePanelWidth(`${newWidth}px`);
      } else {
        animationFrame.current = requestAnimationFrame(() => {
          const newWidth = Math.max(window.innerWidth - clientX, minWidth);
          updatePanelWidth(`${newWidth.toString()}px`);
        });
      }
    },
    [isResizing, minWidth, updatePanelWidth]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);

    return () => {
      cancelAnimationFrame(animationFrame.current);
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);
  return (
    <div
      className={mergeClasses(styles.resizer, isResizing && styles.resizerActive)}
      onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        startResizing();
      }}
    />
  );
};
