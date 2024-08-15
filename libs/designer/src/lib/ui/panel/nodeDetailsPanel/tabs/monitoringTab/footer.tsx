import constants from '../../../../../common/constants';
import { useActionMetadata, useRunInstance } from '../../../../../core/state/workflow/workflowSelectors';
import type { BoundParameters } from '@microsoft/logic-apps-shared';
import { HostService, isNullOrEmpty, getPropertyValue, equals } from '@microsoft/logic-apps-shared';
import { ValueLink } from '@microsoft/designer-ui';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';

interface FooterProps {
  selectedNodeId: string;
  outputs: BoundParameters;
}

export const Footer: React.FC<FooterProps> = (props) => {
  const { selectedNodeId, outputs } = props;
  const actionMetadata = useActionMetadata(selectedNodeId);

  const nodeType = actionMetadata?.type ?? '';
  const runInstance = useRunInstance();
  const intl = useIntl();

  const intlText = {
    showLogicAppRun: intl.formatMessage({
      defaultMessage: 'Show Logic App run details',
      id: 'y6aoMi',
      description: 'Show Logic App run details text',
    }),
  };

  const getChildRunNameFromOutputs = (outputs: any): string | undefined => {
    if (!isNullOrEmpty(outputs)) {
      const headers = getPropertyValue(outputs, 'headers');
      if (headers && headers.value) {
        return getPropertyValue(headers.value, 'x-ms-workflow-run-id');
      }
    }
    return undefined;
  };

  const showFooterLink = useMemo(() => {
    const runName = getChildRunNameFromOutputs(outputs);
    return !!HostService() && !!HostService()?.openMonitorView && equals(nodeType, constants.NODE.TYPE.WORKFLOW) && !!runName;
  }, [nodeType, outputs]);

  const handleFooterLinkClick = useCallback(() => {
    if (runInstance?.id && runInstance?.properties && !!HostService()) {
      HostService().openMonitorView?.(runInstance.properties.workflow.id, runInstance?.id);
    }
  }, [runInstance]);

  return (
    <div style={{ float: 'right' }}>
      <ValueLink linkText={intlText.showLogicAppRun} visible={showFooterLink} onLinkClick={handleFooterLinkClick} />
    </div>
  );
};
