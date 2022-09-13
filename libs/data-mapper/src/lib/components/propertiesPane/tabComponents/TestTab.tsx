import type { SelectedOutputNode } from "../../../models";

interface TestTabProps {
  currentNode: SelectedOutputNode;
}

export const TestTab = ({ currentNode }: TestTabProps) => {
  return <div>TODO - Test Tab (output node only - {currentNode.name})</div>;
};
