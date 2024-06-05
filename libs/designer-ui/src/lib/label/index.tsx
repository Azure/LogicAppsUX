import { css, Label as FluentLabel } from '@fluentui/react';
import { useIntl } from 'react-intl';

export const RequiredMarkerSide = {
  LEFT: 'left',
  RIGHT: 'right',
} as const;
export type RequiredMarkerSide = (typeof RequiredMarkerSide)[keyof typeof RequiredMarkerSide];
export interface LabelProps {
  children?: JSX.Element;
  className?: string;
  htmlFor?: string;
  id?: string;
  isRequiredField?: boolean;
  text: string;
  tooltip?: string;
  requiredMarkerSide?: RequiredMarkerSide;
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
  disabled,
  requiredMarkerSide = RequiredMarkerSide.LEFT,
}) => {
  return (
    <FluentLabel className={css(className, 'msla-label')} htmlFor={htmlFor} id={id} title={tooltip || text} disabled={disabled}>
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
    id: 'qSt0Sb',
    description: 'Accessibility prefix for the input label',
  });

  return (
    // eslint-disable-next-line react/jsx-no-literals
    <span className={isRight ? 'msla-label-required-parameter-right' : 'msla-label-required-parameter'} aria-label={ariaLabel}>
      *
    </span>
  );
};
