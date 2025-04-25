import { Badge } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

interface OperationRuntimeBadgesProps {
  isBuiltIn?: boolean;
  isTrigger?: boolean;
}

export const OperationRuntimeBadges: React.FC<OperationRuntimeBadgesProps> = ({ isBuiltIn, isTrigger }) => {
  const intl = useIntl();
  const builtInText = intl.formatMessage({
    defaultMessage: 'Built-in',
    id: 'PMMNCI',
    description: 'Built-in badge text',
  });
  const triggerText = intl.formatMessage({
    defaultMessage: 'Trigger',
    id: 'ituHoi',
    description: 'Trigger badge text',
  });
  return (
    <>
      {isBuiltIn ? (
        <Badge appearance="outline" shape="rounded">
          {builtInText}
        </Badge>
      ) : null}
      {isTrigger ? (
        <Badge appearance="outline" shape="rounded">
          {triggerText}
        </Badge>
      ) : null}
    </>
  );
};
