import type { Position } from './util';
import { useRef } from 'react';

interface MoveWrapperProps {
  className?: string;
  style?: React.CSSProperties;
  onChange: (position: Position) => void;
  children: JSX.Element;
}

export const MoveWrapper = ({ className, style, onChange, children }: MoveWrapperProps) => {
  const divRef = useRef<HTMLDivElement>(null);

  const move = (e: React.MouseEvent | MouseEvent): void => {
    if (divRef.current) {
      const { current: div } = divRef;
      const { width, height, left, top, right } = div.getBoundingClientRect();

      if (e.clientX <= right && e.clientX >= left) {
        const x = clamp(e.clientX - left, width, 0);
        const y = clamp(e.clientY - top, height, 0);

        onChange({ x, y });
      }
    }
  };

  const onMouseDown = (e: React.MouseEvent): void => {
    if (e.button !== 0) {
      return;
    }

    move(e);

    const onMouseMove = (_e: MouseEvent): void => {
      move(_e);
    };

    const onMouseUp = (_e: MouseEvent): void => {
      document.removeEventListener('mousemove', onMouseMove, false);
      document.removeEventListener('mouseup', onMouseUp, false);

      move(_e);
    };

    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('mouseup', onMouseUp, false);
  };

  return (
    <div ref={divRef} className={className} style={style} onMouseDown={onMouseDown}>
      {children}
    </div>
  );
};
function clamp(value: number, max: number, min: number) {
  return value > max ? max : value < min ? min : value;
}
