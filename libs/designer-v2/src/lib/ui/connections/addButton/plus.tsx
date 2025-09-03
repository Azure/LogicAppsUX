import { tokens } from '@fluentui/react-components';
import { useIsDarkMode } from '../../../core/state/designerOptions/designerOptionsSelectors';

export const Plus: React.FC = () => {
  const isDarkMode = useIsDarkMode();
  const fill = isDarkMode ? tokens.colorNeutralBackground1 : 'var(--colorEdge)';

  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 4H10V6H6V10H4V6H0V4H4V0H6V4Z" fill={fill} />
    </svg>
  );
};
