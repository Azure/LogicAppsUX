import { TransitionsActionSelector } from './transitionsActionSelector';
import type { TransitionsActionDetailsProps } from './transitionsActionDetails';
import { TransitionsActionDetails } from './transitionsActionDetails';

export * from './transitionsActionDetails';

export interface TransitionsProps {
  items: TransitionsActionDetailsProps[];
  readOnly?: boolean;
  onEdgeAddition: (parent: string) => void;
}

export const Transitions = ({ items, readOnly = false }: TransitionsProps) => {
  return (
    <div>
      <TransitionsActionSelector readOnly={readOnly} />
      {items.map((item, key) => (
        <TransitionsActionDetails {...item} key={key} readOnly={readOnly} />
      ))}
    </div>
  );
};
