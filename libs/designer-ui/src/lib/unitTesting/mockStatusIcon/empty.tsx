import { useTheme } from '@fluentui/react';

/**
 * Renders an empty status icon.
 */
export const Empty: React.FC = () => {
  const { isInverted } = useTheme();
  const circleFill = isInverted ? '#A19F9D' : '#605E5C';

  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill={circleFill} stroke="#979593" strokeWidth="2" />
    </svg>
  );
};
