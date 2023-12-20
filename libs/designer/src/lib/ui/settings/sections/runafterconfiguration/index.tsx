import { RunAfterActionSelector } from './runafterActionSelector';
import type { RunAfterActionDetailsProps } from './runafteractiondetails';
import { RunAfterActionDetails } from './runafteractiondetails';

export * from './runafteractiondetails';

export interface RunAfterProps {
  items: RunAfterActionDetailsProps[];
  readOnly?: boolean;
  onEdgeAddition: (parent: string) => void;
}

export const RunAfter = ({ items, readOnly = false }: RunAfterProps) => {
  return (
    <div>
      <RunAfterActionSelector readOnly={readOnly} />
      {items.map((item, key) => (
        <RunAfterActionDetails {...item} key={key} readOnly={readOnly} />
      ))}
    </div>
  );
};
