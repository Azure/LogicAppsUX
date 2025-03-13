import { Button } from '@fluentui/react-components';
import { useCallback, useState } from 'react';
import { CreateConnectionWrapper } from '../../../connectionsPanel/createConnection/createConnectionWrapper';

export const ConnectionInline = () => {
  const [hasConnectionCreated, setHasConnectionCreated] = useState(false);

  const setConnection = useCallback(() => {
    setHasConnectionCreated(true);
  }, []);

  return hasConnectionCreated ? (
    <CreateConnectionWrapper isInline />
  ) : (
    <Button
      className="change-connection-button"
      id="change-connection-button"
      size="small"
      appearance="subtle"
      onClick={setConnection}
      style={{ color: 'var(--colorBrandForeground1)' }}
      // aria-label={`${connectionLabel}, ${openChangeConnectionText}`}
    >
      {'Connect'}
    </Button>
  );
};
