import { css, Label as FluentLabel, type ILabelStyleProps, type ILabelStyles, type IStyleFunctionOrObject } from '@fluentui/react';
import type { ReactNode } from 'react';
import { useIntl } from 'react-intl';

export const RequiredMarkerSide = {
  LEFT: 'left',
  RIGHT: 'right',
} as const;
export type RequiredMarkerSide = (typeof RequiredMarkerSide)[keyof typeof RequiredMarkerSide];
export interface LabelProps {
  children?: ReactNode;
  className?: string;
  htmlFor?: string;
  id?: string;
  isRequiredField?: boolean;
  text: string;
  tooltip?: string;
  requiredMarkerSide?: RequiredMarkerSide;
  style?: React.CSSProperties;
  styles?: IStyleFunctionOrObject<ILabelStyleProps, ILabelStyles>;
  disabled?: boolean;
}

interface RequiredParameterMarkerProps {
  isRequiredField: boolean;
  isRight?: boolean;
}

export const Label: React.FC<LabelProps> = ({
  children,
  className,
  htmlFor,
  id,
  isRequiredField = false,
  text,
  tooltip,
  requiredMarkerSide = RequiredMarkerSide.RIGHT,
  style,
  styles,
  disabled,
}) => {
  return (
    <FluentLabel
      className={css(className, 'msla-label')}
      htmlFor={htmlFor}
      id={id}
      title={tooltip || text}
      disabled={disabled}
      style={style}
      styles={styles}
    >
      {requiredMarkerSide === RequiredMarkerSide.LEFT ? <RequiredParameterMarker isRequiredField={isRequiredField} /> : null}
      {text}
      {requiredMarkerSide === RequiredMarkerSide.RIGHT ? (
        <RequiredParameterMarker isRequiredField={isRequiredField} isRight={true} />
      ) : null}
      {children ? children : null}
    </FluentLabel>
  );
};

const RequiredParameterMarker: React.FC<RequiredParameterMarkerProps> = ({ isRequiredField, isRight }) => {
  const intl = useIntl();
  if (!isRequiredField) {
    return null;
  }

  const ariaLabel = intl.formatMessage({
    defaultMessage: 'Required',
    id: 'msa92b7449b158',
    description: 'Accessibility prefix for the input label',
  });

  return (
    // eslint-disable-next-line react/jsx-no-literals
    <span className={isRight ? 'msla-label-required-parameter-right' : 'msla-label-required-parameter'} aria-label={ariaLabel}>
      *
    </span>
  );
};
