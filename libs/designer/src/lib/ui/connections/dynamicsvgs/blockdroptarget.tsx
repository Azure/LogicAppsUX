import * as React from 'react';

interface BlockDropTargetProps {
  fill: string;
}

export function BlockDropTarget({ fill }: BlockDropTargetProps): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12ZM7 14C10.866 14 14 10.866 14 7C14 3.13401 10.866 0 7 0C3.13401 0 0 3.13401 0 7C0 10.866 3.13401 14 7 14Z"
        fill={fill}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.4351 11.8492L1.94977 3.36395L3.36398 1.94974L11.8493 10.435L10.4351 11.8492Z"
        fill={fill}
      />
    </svg>
  );
}
