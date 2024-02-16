import InformationImage from './info.svg';
import { Text, TooltipHost } from '@fluentui/react';

export const InfoDot = (props: any) => {
  const { alt = '', title, description, style, innerAriaHidden } = props;

  const tooltipProps = {
    onRenderContent: () => (
      <div className="msla-info-dot-tooltip-content" aria-hidden={innerAriaHidden || 'false'}>
        <Text block variant="xLarge" style={{ marginBottom: '8px' }}>
          {title}
        </Text>
        <Text block variant="small">
          {description}
        </Text>
      </div>
    ),
  };

  return (
    <TooltipHost tooltipProps={tooltipProps}>
      <img className="msla-info-dot" alt={alt} src={InformationImage} style={style} tabIndex={0} />
    </TooltipHost>
  );
};
