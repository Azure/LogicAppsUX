import { tokens, Tooltip } from '@fluentui/react-components';
import { Info16Regular, Info16Filled } from '@fluentui/react-icons';
import { useState } from 'react';

export interface DMTooltipProps {
  text: string;
}

export const DMTooltip: React.FC<DMTooltipProps> = (props) => {
  const [isHover, setIsHover] = useState<boolean>(false);
  const iconFill = { primaryFill: tokens.colorNeutralForeground3 };

  return (
    <Tooltip relationship="description" content={props.text} withArrow={true}>
      <div style={{ height: '16px' }} onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)}>
        {isHover ? <Info16Filled {...iconFill} /> : <Info16Regular {...iconFill} />}
      </div>
    </Tooltip>
  );
};
