import type { RunAfterActionDetailsProps } from './runafteractiondetails';
import { RunAfterActionDetails } from './runafteractiondetails';
import { PrimaryButton } from '@fluentui/react';

export * from './runafteractiondetails';

export interface RunAfterProps {
  items: RunAfterActionDetailsProps[];
  readOnly?: boolean;
  onEdgeAddition: (parent: string) => void;
}

export const RunAfter = ({ items, onEdgeAddition, readOnly = false }: RunAfterProps) => {
  return (
    <div>
      {items.map((item, key) => {
        return <RunAfterActionDetails {...item} key={key} readOnly={readOnly} />;
      })}
      {/*This is tempoarary way to test edge addition, adding full support for choosing a predicessor will be in next PR(or the one after deletion)*/}
      <PrimaryButton text="TEMPORARY ADD EDGE" onClick={() => onEdgeAddition('manual')} />
    </div>
  );
};
