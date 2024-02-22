import Constants from '../../constants';
import { getMockStatusString } from '../../utils';
import { Empty } from './empty';
import './mockStatusIcon.less';
import { Succeeded } from './succeeded';
import { isEmptyString } from '@microsoft/utils-logic-apps';

export interface MockStatusIconProps {
  nodeMockResults?: string;
  id: string;
}

export const MockStatusIcon: React.FC<MockStatusIconProps> = ({ nodeMockResults, id }) => {
  const status = nodeMockResults && !isEmptyString(nodeMockResults) ? Constants.MOCKSTATUS.SUCCEEDED : Constants.MOCKSTATUS.EMPTY;
  const tooltipLabel = getMockStatusString(status);

  const getIcon = (status: string) => {
    switch (status) {
      case Constants.MOCKSTATUS.SUCCEEDED:
        return <Succeeded />;
      case Constants.MOCKSTATUS.EMPTY:
      default:
        return <Empty />;
    }
  };

  return (
    <div id={id} aria-label={tooltipLabel} role="status" className="msla-mock-status-icon">
      {getIcon(status)}
    </div>
  );
};
