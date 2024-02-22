import { useTheme } from '@fluentui/react';

/**
 * Component for rendering a succeeded status icon.
 */
export const Succeeded: React.FC = () => {
  const { isInverted } = useTheme();
  const circleFill = isInverted ? '#92C353' : '#428000';

  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill={circleFill} stroke="#979593" strokeWidth="2" />
    </svg>
  );
};
