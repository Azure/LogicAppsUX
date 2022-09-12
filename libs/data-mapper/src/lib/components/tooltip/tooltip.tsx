import { Button, makeStyles, shorthands, Tooltip } from '@fluentui/react-components';
import { bundleIcon, Info16Regular, Info16Filled } from '@fluentui/react-icons';

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
  const Icon = bundleIcon(Info16Filled, Info16Regular);
  return (
    <Tooltip relationship="description" content={props.text}>
      <Button icon={<Icon />} className={tooltipStyle.button}></Button>
    </Tooltip>
  );
};
