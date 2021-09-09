import * as React from 'react';

interface AllowDropTargetProps {
  fill: string;
}

export function AllowDropTarget({ fill }: AllowDropTargetProps): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect y="6.125" width="14" height="1.75" fill={fill} />
      <rect x="7.875" width="14" height="1.75" transform="rotate(90 7.875 0)" fill={fill} />
    </svg>
  );
}
