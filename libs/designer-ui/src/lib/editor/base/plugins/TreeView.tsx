import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TreeView as TreeViewPlugin } from '@lexical/react/LexicalTreeView';

export function TreeView() {
  const [editor] = useLexicalComposerContext();
  return (
    <TreeViewPlugin
      viewClassName="tree-view-output"
      timeTravelPanelClassName="debug-timetravel-panel"
      timeTravelButtonClassName="debug-timetravel-button"
      timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
      timeTravelPanelButtonClassName="debug-timetravel-panel-button"
      editor={editor}
    />
  );
}
