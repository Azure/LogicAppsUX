import InformationImage from './info.svg';
import { MediumText, SmallText } from '../text';
import { Tooltip } from '@fluentui/react-components';

export const InfoDot = (props: any) => {
  const { title, description, style, innerAriaHidden } = props;

  const tooltipContent: JSX.Element = (
    <div className="msla-info-dot-tooltip-content" aria-hidden={innerAriaHidden || 'false'}>
      <MediumText style={{ marginBottom: '8px', display: 'block' }} text={title} />
      <SmallText style={{ display: 'block' }} text={description} />
    </div>
  );

  return (
    <Tooltip relationship="description" content={tooltipContent}>
      <img className="msla-info-dot" alt={`${title} ${description}`} src={InformationImage} style={style} tabIndex={0} />
    </Tooltip>
  );
};
