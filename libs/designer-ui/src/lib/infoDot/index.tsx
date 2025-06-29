import { Tooltip } from '@fluentui/react-components';
import { Info16Regular } from '@fluentui/react-icons';
import type { AriaAttributes } from 'react';
import { MediumText, SmallText } from '../text';
import { useInfoDotStyles } from './styles';

interface InfoDotProps {
  ariaDescribedBy?: AriaAttributes['aria-describedby'];
  description: string | undefined;
  innerAriaHidden?: AriaAttributes['aria-hidden'];
  style?: React.CSSProperties;
  title: string;
  className?: string;
}

export const InfoDot: React.FC<InfoDotProps> = (props) => {
  const { ariaDescribedBy, title, description, style, innerAriaHidden } = props;
  const classes = useInfoDotStyles();

  const tooltipContent: JSX.Element = (
    <div className={classes.tooltipContent} aria-hidden={innerAriaHidden || 'false'}>
      <MediumText style={{ display: 'block' }} text={title} />
      {description ? <SmallText style={{ display: 'block' }} text={description} /> : null}
    </div>
  );

  return (
    <Tooltip relationship="description" content={tooltipContent}>
      <Info16Regular
        aria-label={`${title} ${description}`}
        aria-describedby={ariaDescribedBy}
        className={props.className ?? classes.root}
        style={style}
        tabIndex={0}
      />
    </Tooltip>
  );
};
