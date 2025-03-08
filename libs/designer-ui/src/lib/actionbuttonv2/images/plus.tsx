import { useTheme } from '@fluentui/react';

export const Plus: React.FC = () => {
  const { isInverted } = useTheme();
  const fill = isInverted ? '#3AA0F3' : '#0078D4';

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.65625 6.34375H14V7.65625H7.65625V14H6.34375V7.65625H0V6.34375H6.34375V0H7.65625V6.34375Z" fill={fill} />
    </svg>
  );
};
