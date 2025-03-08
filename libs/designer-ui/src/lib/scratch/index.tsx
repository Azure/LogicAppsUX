export interface ScratchProps {
  children?: React.ReactNode;
}

export const Scratch = ({ children }: ScratchProps): JSX.Element => {
  return <div className="msla-panel-scratch-container"> {children} </div>;
};
