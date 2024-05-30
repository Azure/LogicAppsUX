import { Icon, TooltipHost } from '@fluentui/react';
import { Label } from '@microsoft/designer-ui';

interface ConnectionParameterRowParameterRowSelfProps {
  parameterKey: string;
  displayName: string;
  tooltip?: string | JSX.Element;
  required?: boolean;
  disabled?: boolean;
  children: JSX.Element;
}

export type ConnectionParameterRowProps = React.PropsWithChildren<ConnectionParameterRowParameterRowSelfProps>;

export const ConnectionParameterRow = ({
  parameterKey,
  displayName,
  tooltip,
  required,
  disabled,
  children,
}: ConnectionParameterRowProps) => (
  <div key={parameterKey} className="param-row">
    <Label className="label" isRequiredField={required} text={displayName ?? parameterKey} htmlFor={parameterKey} disabled={disabled}>
      {tooltip && (
        <TooltipHost content={tooltip}>
          <Icon iconName="Info" style={{ marginLeft: '4px', transform: 'translate(0px, 2px)' }} />
        </TooltipHost>
      )}
    </Label>
    {children}
  </div>
);
