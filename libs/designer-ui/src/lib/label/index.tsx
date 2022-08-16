import { Label as FluentLabel } from '@fluentui/react';
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

export const Label: React.FC<LabelProps> = ({ htmlFor, id, isRequiredField = false, text, tooltip }) => {
  return (
    <FluentLabel htmlFor={htmlFor} id={id} title={tooltip || text}>
      <RequiredParameterMarker isRequiredField={isRequiredField} />
      {text}
    </FluentLabel>
  );
};

const RequiredParameterMarker: React.FC<RequiredParameterMarkerProps> = ({ isRequiredField }) => {
  const intl = useIntl();
  if (!isRequiredField) {
    return null;
  }

  const ariaLabel = intl.formatMessage({
    defaultMessage: 'Required',
    description: 'Accessibility prefix for the input label',
  });

  return (
    // eslint-disable-next-line react/jsx-no-literals
    <span className="msla-label-required-parameter" aria-label={ariaLabel}>
      *
    </span>
  );
};
