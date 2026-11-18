import { Button, Link, makeStyles, Popover, PopoverSurface, tokens } from '@fluentui/react-components';
import { Checkmark20Regular, Dismiss20Regular, Play20Regular } from '@fluentui/react-icons';
import React from 'react';
import type { MapDocument } from '../../../src/model/mapModel';
import type { MapEditorVsCodeApi } from '../../../src/protocol/mapEditorProtocol';
import { VsCodeFluentProvider as FluentProvider } from '../fluentTheme';
import { needsFunctoidLayout } from './functoidAutoLayout';

export interface MapperGuidanceContext {
  isEmptyMap: boolean;
  layoutIssuePages: string[];
  tutorialStep?: MapperTutorialStep;
  tutorialSourceSchema?: string;
  tutorialTargetSchema?: string;
  tutorialError?: string;
}

export type MapperTutorialStep =
  | 'preparing'
  | 'source'
  | 'target'
  | 'functoid'
  | 'sourceLink'
  | 'targetLink'
  | 'testInput'
  | 'testMap'
  | 'publish';

export function getMapperGuidanceContext(map: MapDocument): MapperGuidanceContext {
  return {
    isEmptyMap:
      !map.sourceSchema.location && !map.targetSchema.location && map.pages.every((page) => !page.functoids.length && !page.links.length),
    layoutIssuePages: map.pages.filter((page) => needsFunctoidLayout(page.functoids)).map((page) => page.name),
  };
}

const tutorialSteps: Record<Exclude<MapperTutorialStep, 'preparing'>, { title: string; selector: string; description: string }> = {
  source: {
    title: 'Choose the source schema',
    selector: 'biztalk-empty-schema.source-tree [role="combobox"]',
    description: 'Choose the sample input schema from the source schema dropdown.',
  },
  target: {
    title: 'Choose the target schema',
    selector: 'biztalk-empty-schema.target-tree [role="combobox"]',
    description: 'Choose the sample output schema from the target schema dropdown.',
  },
  functoid: {
    title: 'Select Lowercase',
    selector: '[data-mapper-tutorial="lowercase"]',
    description: 'Select this String Lowercase functoid to add it to the canvas.',
  },
  sourceLink: {
    title: 'Connect the string input',
    selector: '[data-mapper-tutorial="source-name"]',
    description: 'Draw a line from the source Name string connector to the input connector on the left of Lowercase.',
  },
  targetLink: {
    title: 'Connect the string output',
    selector: '[data-mapper-tutorial="target-name"]',
    description: 'Draw a line from the output connector on the right of Lowercase to the target Name string connector.',
  },
  testInput: {
    title: 'Add test input',
    selector: '#mapper-test-input',
    description:
      'Open Test Input to upload XML or generate an instance. You can also enter XML in Input Instance; give Name a mixed-case value.',
  },
  testMap: {
    title: 'Test your map',
    selector: '#btn-test-map',
    description: 'Choose Test Map to compile and run your map. The Name value in the output should be lowercase.',
  },
  publish: {
    title: 'Publish your map',
    selector: '#btn-deploy-logicapp',
    description:
      'Your sample map is ready. Choose Publish to send its artifacts to a local or Azure Logic App. Continue with the documentation:',
  },
};

const useStyles = makeStyles({
  surface: {
    boxSizing: 'border-box',
    width: '360px',
    maxWidth: 'calc(100vw - 32px)',
    border: '2px solid var(--vscode-focusBorder)',
    borderRadius: '8px',
    overflow: 'visible',
    padding: 0,
    '& > :first-child::before': {
      border: '2px solid var(--vscode-focusBorder)',
      margin: '-2px',
    },
  },
  content: {
    boxSizing: 'border-box',
    maxHeight: 'calc(100vh - 100px)',
    overflowY: 'auto',
    borderRadius: '6px',
    padding: tokens.spacingVerticalL,
  },
  invitation: {
    position: 'absolute',
    top: '48px',
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: 'calc(100% - 32px)',
    zIndex: 25,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    boxShadow: tokens.shadow16,
  },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacingHorizontalS },
  title: { margin: 0, fontSize: tokens.fontSizeBase400, fontWeight: tokens.fontWeightSemibold },
  progress: { color: tokens.colorNeutralForeground2, marginTop: tokens.spacingVerticalXS },
  description: { margin: `${tokens.spacingVerticalM} 0`, lineHeight: tokens.lineHeightBase300, overflowWrap: 'anywhere' },
  actions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalS },
});

export function MapperGuidance({
  context,
  vscode,
  onStartTutorial,
  onDismissTutorial,
}: {
  context: MapperGuidanceContext;
  vscode: MapEditorVsCodeApi;
  onStartTutorial?: () => void;
  onDismissTutorial?: () => void;
}): React.ReactElement | null {
  const styles = useStyles();
  const titleId = React.useId();
  const [dismissed, setDismissed] = React.useState<string[]>(() => {
    const saved = vscode.getState();
    if (saved && typeof saved === 'object' && 'mapperGuidanceDismissed' in saved && Array.isArray(saved.mapperGuidanceDismissed)) {
      return saved.mapperGuidanceDismissed.filter((value): value is string => typeof value === 'string');
    }
    return [];
  });
  const tutorialStep = context.tutorialStep;
  const mode = tutorialStep
    ? 'tutorial'
    : context.layoutIssuePages.length
      ? 'layout'
      : context.isEmptyMap
        ? 'tutorial-invitation'
        : undefined;
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const visible = !!mode && (mode === 'tutorial' || !dismissed.includes(mode));
  const step = tutorialStep && tutorialStep !== 'preparing' ? tutorialSteps[tutorialStep] : undefined;
  const selector = mode === 'layout' ? '[data-mapper-guidance="fit"]' : step?.selector;
  const feature = mode === 'layout' ? 'fit' : tutorialStep;

  React.useEffect(() => {
    if (!visible || !selector) {
      setAnchor(null);
      return;
    }
    const root = document.querySelector('[data-component="mapper-app"]');
    if (!root) {
      return;
    }
    const findAnchor = (): void => {
      const target = root.querySelector<HTMLElement>(selector);
      if (target && feature) {
        target.dataset.mapperGuidance = feature;
      }
      setAnchor((current) => (current === target ? current : target));
    };
    findAnchor();
    const observer = new MutationObserver(findAnchor);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [visible, selector, feature]);

  React.useEffect(() => {
    if (!visible || !anchor) {
      return;
    }
    const previousOutline = anchor.style.outline;
    const previousOffset = anchor.style.outlineOffset;
    anchor.dataset.mapperGuidanceActive = 'true';
    anchor.style.outline = '2px solid var(--vscode-focusBorder)';
    anchor.style.outlineOffset = '2px';
    return () => {
      delete anchor.dataset.mapperGuidanceActive;
      anchor.style.outline = previousOutline;
      anchor.style.outlineOffset = previousOffset;
    };
  }, [anchor, visible]);

  if (!mode || !visible) {
    return null;
  }
  const layoutTip = mode === 'layout';
  const dismiss = (): void => {
    if (mode === 'tutorial') {
      onDismissTutorial?.();
    }
    const next = [...new Set([...dismissed, mode === 'tutorial' ? 'tutorial-invitation' : mode])];
    const saved = vscode.getState();
    vscode.setState({ ...(saved && typeof saved === 'object' ? saved : {}), mapperGuidanceDismissed: next });
    setDismissed(next);
  };
  const invitation = mode === 'tutorial-invitation' || tutorialStep === 'preparing';
  const documentation = (
    <p className={styles.description}>
      <Link as="button" onClick={() => vscode.postMessage({ type: 'openMapperDocumentation' })}>
        See here
      </Link>{' '}
      for more mapper documentation
    </p>
  );
  const content = (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h3 id={titleId} className={styles.title}>
            {layoutTip ? 'Bring functoids into view' : invitation ? 'Create a sample map' : step?.title}
          </h3>
          {step && (
            <div className={styles.progress}>
              Step {Object.keys(tutorialSteps).indexOf(tutorialStep!) + 1} of {Object.keys(tutorialSteps).length}
            </div>
          )}
        </div>
        <Button
          appearance="subtle"
          icon={<Dismiss20Regular />}
          aria-label="Dismiss map guidance"
          title="Dismiss map guidance"
          onClick={dismiss}
        />
      </div>
      {layoutTip ? (
        <>
          <p className={styles.description}>
            Overlapping functoids or negative coordinates were found on: <strong>{context.layoutIssuePages.join(', ')}</strong>.
          </p>
          <p className={styles.description}>
            Select an affected page, then choose <strong>Fit</strong> in the canvas controls to rearrange its functoids in the current view
            without overlaps. Fit changes the map layout; it does not just zoom.
          </p>
        </>
      ) : invitation ? (
        <>
          <p className={styles.description}>Create a sample map that converts a name to lowercase.</p>
          <Button appearance="primary" icon={<Play20Regular />} disabled={tutorialStep === 'preparing'} onClick={onStartTutorial}>
            {tutorialStep === 'preparing' ? 'Preparing tutorial...' : 'Start Tutorial'}
          </Button>
          {documentation}
          {context.tutorialError && (
            <p role="alert" className={styles.description}>
              {context.tutorialError}
            </p>
          )}
        </>
      ) : (
        <>
          <p className={styles.description}>{step?.description}</p>
          {tutorialStep === 'source' && <p className={styles.description}>{context.tutorialSourceSchema}</p>}
          {tutorialStep === 'target' && <p className={styles.description}>{context.tutorialTargetSchema}</p>}
          {tutorialStep === 'publish' && documentation}
        </>
      )}
      {layoutTip && (
        <div className={styles.actions}>
          <Button appearance="primary" icon={<Checkmark20Regular />} onClick={dismiss}>
            Got it
          </Button>
        </div>
      )}
    </div>
  );

  if (invitation) {
    return (
      <FluentProvider style={{ display: 'contents' }}>
        <div className={`${styles.surface} ${styles.invitation}`} role="dialog" aria-labelledby={titleId}>
          {content}
        </div>
      </FluentProvider>
    );
  }
  if (!anchor) {
    return null;
  }
  return (
    <FluentProvider style={{ display: 'contents' }}>
      <Popover open positioning={{ target: anchor, position: 'below', align: 'start' }} withArrow>
        <PopoverSurface className={styles.surface} role="dialog" aria-labelledby={titleId}>
          {content}
        </PopoverSurface>
      </Popover>
    </FluentProvider>
  );
}
