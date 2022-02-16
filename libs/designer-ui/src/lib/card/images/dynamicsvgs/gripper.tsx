import { useTheme } from '@fluentui/react';

export const Gripper: React.FC = () => {
  const { isInverted } = useTheme();
  const fill = isInverted ? '#9E9E9A' : '#605E5C';
  return (
    <span tabIndex={0}>
      <svg width="8" height="15" viewBox="0 0 2 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 2V0H2V2H0ZM0 6V4H2V6H0ZM0 10V8H2V10H0Z" fill={fill} />
      </svg>
    </span>
  );
};
