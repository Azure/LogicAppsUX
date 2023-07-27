import { Label, TooltipHost, Icon } from '@fluentui/react';

interface ConnectionParameterRowParameterRowSelfProps {
  parameterKey: string;
  displayName: string;
  tooltip?: string;
  required?: boolean;
  disabled?: boolean;
  children: JSX.Element;
}

export type ConnectionParameterRowParameterRowProps = React.PropsWithChildren<ConnectionParameterRowParameterRowSelfProps>;

export const ConnectionParameterRow = ({
  parameterKey,
  displayName,
  tooltip,
  required,
  disabled,
  children,
}: ConnectionParameterRowParameterRowProps) => (
  <div key={parameterKey} className="param-row">
    <Label className="label" required={required} htmlFor={parameterKey} disabled={disabled}>
      {displayName ?? parameterKey}
      {tooltip && (
        <TooltipHost content={tooltip}>
          <Icon iconName="Info" style={{ marginLeft: '4px', transform: 'translate(0px, 2px)' }} />
        </TooltipHost>
      )}
    </Label>
    {children}
  </div>
);
