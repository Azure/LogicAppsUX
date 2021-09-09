import * as React from 'react';

interface GripperProps {
  fill: string;
}

export function Gripper({ fill }: GripperProps): JSX.Element {
  return (
    <svg width="2" height="10" viewBox="0 0 2 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 2V0H2V2H0ZM0 6V4H2V6H0ZM0 10V8H2V10H0Z" fill={fill} />
    </svg>
  );
}
