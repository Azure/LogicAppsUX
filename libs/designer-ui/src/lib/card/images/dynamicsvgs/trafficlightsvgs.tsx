import * as React from 'react';

interface DotProps {
  fill: string;
}

export function TrafficLightDot({ fill }: DotProps): JSX.Element {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="8" height="8" rx="4" fill={fill} />
    </svg>
  );
}

export function EmptyTrafficLightDot({ fill }: DotProps): JSX.Element {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="8" height="8" rx="4" fill={fill} />
      <rect x="3" y="3" width="2" height="2" rx="1" fill="#605E5C" />
    </svg>
  );
}
