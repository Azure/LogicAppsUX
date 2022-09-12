import { makeStyles, shorthands, tokens, Tooltip } from '@fluentui/react-components';
import { Info16Regular, Info16Filled } from '@fluentui/react-icons';
import { useState } from 'react';

export interface DMTooltipProps {
  text: string;
}

const tooltipStyles = makeStyles({
  button: {
    ...shorthands.border('0px'),
    height: '16px',
    width: '16px',
    backgroundColor: 'inherit',
    ...shorthands.padding('0px'),
    ':hover': {
      backgroundColor: 'inherit',
    },
  },
});

export const DMTooltip: React.FC<DMTooltipProps> = (props) => {
  const tooltipStyle = tooltipStyles();
  const [isHover, setIsHover] = useState<boolean>(false);
  const iconFill = { primaryFill: tokens.colorNeutralForeground3 };

  return (
    <Tooltip relationship="description" content={props.text} withArrow={true}>
      <div className={tooltipStyle.button} onMouseEnter={() => setIsHover(true)} onMouseLeave={() => setIsHover(false)}>
        {isHover ? <Info16Filled {...iconFill} /> : <Info16Regular {...iconFill} />}
      </div>
    </Tooltip>
  );
};
