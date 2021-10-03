import * as React from 'react';
import { useIntl } from 'react-intl';

export interface LabelProps {
  className?: string;
  htmlFor?: string;
  id?: string;
  isRequiredField?: boolean;
  text: string;
  tooltip?: string;
}

interface RequiredParameterMarkerProps {
  isRequiredField: boolean;
}

const RequiredParameterMarker = (props: RequiredParameterMarkerProps) => {
  const intl = useIntl();
  const ariaLabel = intl.formatMessage({
    defaultMessage: 'Required',
    id: 'qSt0Sb',
    description: 'Accessibility prefix for the input label',
  });
  if (props.isRequiredField) {
    return (
      <span className="msla-label-required-parameter" aria-label={ariaLabel}>
        *
      </span>
    );
  } else {
    return null;
  }
};

export const Label: React.FC<LabelProps> = ({ className, htmlFor, id, isRequiredField, text, tooltip }: LabelProps) => {
  const labelClassName = className ? `${className} msla-label` : 'msla-label';
  const title = tooltip || text;

  return (
    <label className={labelClassName} htmlFor={htmlFor} id={id} title={title}>
      <RequiredParameterMarker isRequiredField={isRequiredField ?? false} />
      {text}
    </label>
  );
};
