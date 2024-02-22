import Constants from '../../constants';
import { Empty } from './empty';
import { Succeeded } from './succeeded';

export interface MockStatusIconProps {
  status: string;
  id: string;
}

export const MockStatusIcon: React.FC<MockStatusIconProps> = ({ status, id }) => {
  const tooltipLabel = 'statusString';

  const getIcon = (status: string) => {
    switch (status) {
      case Constants.STATUS.SUCCEEDED:
        return <Succeeded />;
      default:
        return <Empty />;
    }
  };

  return (
    <div id={id} aria-label={tooltipLabel} role="status">
      {getIcon(status)}
    </div>
  );
};
