import Constants from '../../constants';
import { getMockStatusString } from '../../utils';
import { type OutputMock } from '../outputMocks';
import { Completed } from './completed';
import { Empty } from './empty';
import './mockStatusIcon.less';
import { isNullOrEmpty } from '@microsoft/utils-logic-apps';

export interface MockStatusIconProps {
  nodeMockResults?: OutputMock;
  id: string;
}

/**
 * Renders a mock status icon based on the provided node mock results and ID.
 * @param {MockStatusIconProps} props - The component props.
 * @returns {React.ReactElement} The rendered mock status icon.
 */
export const MockStatusIcon: React.FC<MockStatusIconProps> = ({ nodeMockResults, id }) => {
  const status = nodeMockResults && !isNullOrEmpty(nodeMockResults.output) ? Constants.MOCKSTATUS.COMPLETED : Constants.MOCKSTATUS.EMPTY;
  const tooltipLabel = getMockStatusString(status);

  const getIcon = (status: string) => {
    switch (status) {
      case Constants.MOCKSTATUS.COMPLETED:
        return <Completed />;
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
