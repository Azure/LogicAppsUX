/* eslint-disable @typescript-eslint/no-empty-function */
import { memo, useRef } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useIntl } from 'react-intl';
import { MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { parseErrorMessage } from '@microsoft/logic-apps-shared';

const FlowErrorNode = ({ id, data }: NodeProps) => {
  const intl = useIntl();
  const errorTitle = intl.formatMessage({
    defaultMessage: 'Workflow deserialization error',
    id: 'oDwf1e',
    description: 'Text on workflow deserialization error node',
  });

  const ref = useRef<HTMLDivElement>(null);

  return (
    <div id={id} ref={ref} style={{ maxWidth: '360px' }}>
      <MessageBar layout={'multiline'} intent={'error'}>
        <div>
          <MessageBarTitle>{errorTitle}</MessageBarTitle>
          <MessageBarBody>{parseErrorMessage(data.error) as string}</MessageBarBody>
        </div>
      </MessageBar>
    </div>
  );
};

FlowErrorNode.displayName = 'ErrorNode';

export default memo(FlowErrorNode);
