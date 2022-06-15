import type { RunAfterActionDetailsProps } from './runafteractiondetails';
import { RunAfterActionDetails } from './runafteractiondetails';

export * from './runafteractiondetails';

export interface RunAfterProps {
  items: RunAfterActionDetailsProps[];
  readOnly?: boolean;
}

export const RunAfter = ({ items, readOnly = false }: RunAfterProps) => {
  return (
    <div>
      {items.map((item, key) => {
        return <RunAfterActionDetails {...item} key={key} readOnly={readOnly} />;
      })}
    </div>
  );
};
