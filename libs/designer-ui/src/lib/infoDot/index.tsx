import { Tooltip } from '@fluentui/react-components';
import { Info16Regular } from '@fluentui/react-icons';
import type { AriaAttributes } from 'react';
import { MediumText, SmallText } from '../text';

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

  const tooltipContent: JSX.Element = (
    <div className={'msla-info-dot-tooltip-content'} aria-hidden={innerAriaHidden || 'false'}>
      <MediumText style={{ display: 'block' }} text={title} />
      {description ? <SmallText style={{ display: 'block' }} text={description} /> : null}
    </div>
  );

  return (
    <Tooltip relationship="description" content={tooltipContent}>
      <Info16Regular
        aria-label={`${title} ${description}`}
        aria-describedby={ariaDescribedBy}
        className={props.className}
        style={style}
        tabIndex={0}
      />
    </Tooltip>
  );
};
