import type { Position } from './util';
import { useRef } from 'react';

interface MoveWrapperProps {
  children: JSX.Element;
  className?: string;
  onChange: (position: Position) => void;
  style?: React.CSSProperties;
  value: Position;
}

const keyMoveMap: Record<string, Position> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

export const MoveWrapper = ({ children, className, onChange, style, value }: MoveWrapperProps) => {
  const divRef = useRef<HTMLDivElement>(null);

  const getBoundingClientRect = (): DOMRect | undefined => {
    return divRef.current?.getBoundingClientRect();
  };

  const move = (e: React.MouseEvent | MouseEvent): void => {
    const rect = getBoundingClientRect();
    if (rect) {
      const { width, height, left, top, right } = rect;

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

  const onKeyDown = (e: React.KeyboardEvent): void => {
    const { key } = e;
    const rect = getBoundingClientRect();

    if (rect && key in keyMoveMap) {
      const { width, height } = rect;
      const multiplier = e.shiftKey ? 10 : 1;
      const offset = keyMoveMap[key];

      onChange({
        x: clamp(value.x + multiplier * offset.x, width, 0),
        y: clamp(value.y + multiplier * offset.y, height, 0),
      });

      e.preventDefault();
    }
  };

  return (
    <div ref={divRef} className={className} style={style} tabIndex={0} onMouseDown={onMouseDown} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
};
function clamp(value: number, max: number, min: number) {
  return value > max ? max : value < min ? min : value;
}
