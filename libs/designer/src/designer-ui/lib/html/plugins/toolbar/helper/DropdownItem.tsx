import { DropDownContext } from './DropdownItems';
import type { ReactNode, MouseEvent } from 'react';
import { useContext, useEffect, useRef } from 'react';

interface DropDownItemProps {
  children: ReactNode;
  className: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
}

export const DropDownItem = ({ children, className, onClick, title }: DropDownItemProps) => {
  const ref = useRef<HTMLButtonElement>(null);

  const dropDownContext = useContext(DropDownContext);

  if (dropDownContext === null) {
    throw new Error('DropDownItem must be used within a DropDown');
  }
  const { registerItem } = dropDownContext;

  useEffect(() => {
    if (ref?.current) {
      registerItem(ref);
    }
  }, [ref, registerItem]);

  return (
    <button
      className={className}
      onClick={(e) => {
        onClick(e);
      }}
      ref={ref}
      title={title}
    >
      {children}
    </button>
  );
};
