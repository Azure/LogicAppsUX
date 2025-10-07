import { Label as FluentLabel, mergeClasses } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { useIntl } from 'react-intl';
import { useLabelStyles } from './styles';

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
  disabled,
}) => {
  const classes = useLabelStyles();
  return (
    <FluentLabel
      className={mergeClasses(classes.root, className)}
      htmlFor={htmlFor}
      id={id}
      title={tooltip || text}
      disabled={disabled}
      style={{ paddingTop: '8px', paddingBottom: '2px', ...style }}
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
  const classes = useLabelStyles();

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
    <span className={isRight ? classes.requiredParameterRight : classes.requiredParameterLeft} aria-label={ariaLabel}>
      *
    </span>
  );
};
