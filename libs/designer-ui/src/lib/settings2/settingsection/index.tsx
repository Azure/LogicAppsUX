export interface SettingSectionComponentProps {
  id: string;
  title: string;
  expanded: boolean;
  renderContent: JSXRenderer;
  onClick: SectionClickHandler;
  isInverted: boolean;
}

type JSXRenderer = (id: string) => JSX.Element;
type SectionClickHandler = (id: string) => void;
