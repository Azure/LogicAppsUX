import { Icon, TooltipHost } from '@fluentui/react';
import { Label } from '@microsoft/designer-ui';
import { mergeClasses } from '@fluentui/react-components';

interface ConnectionParameterRowParameterRowSelfProps {
  parameterKey: string;
  displayName: string;
  tooltip?: string | JSX.Element;
  required?: boolean;
  disabled?: boolean;
  children: JSX.Element;
  cssOverrides?: Record<string, string>;
}

export type ConnectionParameterRowProps = React.PropsWithChildren<ConnectionParameterRowParameterRowSelfProps>;

export const ConnectionParameterRow = ({
  parameterKey,
  displayName,
  tooltip,
  required,
  disabled,
  children,
  cssOverrides,
}: ConnectionParameterRowProps) => (
  <div key={parameterKey} className={mergeClasses('param-row', cssOverrides?.field)}>
    <Label
      className={mergeClasses('label', cssOverrides?.label)}
      isRequiredField={required}
      text={displayName ?? parameterKey}
      htmlFor={parameterKey}
      disabled={disabled}
    >
      {tooltip && (
        <TooltipHost content={tooltip}>
          <Icon iconName="Info" style={{ marginLeft: '4px', transform: 'translate(0px, 2px)' }} />
        </TooltipHost>
      )}
    </Label>
    {children}
  </div>
);
