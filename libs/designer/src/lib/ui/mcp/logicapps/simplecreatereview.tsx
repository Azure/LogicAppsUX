import { Spinner } from '@fluentui/react-components';
import type { ArmTemplate } from '../../../core/mcp/utils/logicapp';
import { useIntl } from 'react-intl';

export const SimpleCreateReview = ({
  isValidating,
  errorMessage,
}: { isValidating: boolean; template?: ArmTemplate; errorMessage?: string }) => {
  const intl = useIntl();
  const intlTexts = {
    validatingLabel: intl.formatMessage({
      defaultMessage: 'Validating resources...',
      id: '3jL1mR',
      description: 'Label shown when the template is validating',
    }),
  };

  if (isValidating) {
    return <Spinner size="large" label={intlTexts.validatingLabel} labelPosition="below" />;
  }

  if (errorMessage) {
    return <div>{errorMessage}</div>;
  }

  return <div>Hi</div>;
};
