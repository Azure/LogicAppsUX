import * as React from 'react';
import {
  Button,
  Combobox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  FluentProvider,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Option,
  OptionGroup,
  Radio,
  RadioGroup,
  Spinner,
  tokens,
} from '@fluentui/react-components';
import { Checkmark20Regular, CloudArrowUp20Regular, Code20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import type { AzurePublishQuery, PublishContext, PublishDestination, PublishTarget } from '../../../src/protocol/publishProtocol';
import { getVsCodeFluentTheme } from '../fluentTheme';

interface PublishDialogProps {
  open: boolean;
  onClose(): void;
  loadContext(): Promise<PublishContext>;
  loadAzureResources(query: AzurePublishQuery): Promise<PublishDestination[]>;
  onPublish(target: PublishTarget): Promise<boolean>;
}

const useStyles = makeStyles({
  surface: {
    boxSizing: 'border-box',
    width: 'min(1180px, calc(100vw - 32px))',
    maxWidth: 'calc(100vw - 32px)',
    height: 'min(760px, calc(100vh - 32px))',
    maxHeight: 'calc(100vh - 32px)',
    padding: '0',
  },
  body: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: '0', gap: '0' },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '24px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
  title: { flexGrow: 1, minWidth: '0', overflowWrap: 'anywhere' },
  closeButton: { flexShrink: 0 },
  content: { flex: '1 1 0', minHeight: '0', padding: '24px', overflowY: 'auto' },
  heading: { margin: '0 0 8px', fontSize: tokens.fontSizeBase500, fontWeight: tokens.fontWeightSemibold },
  muted: { color: tokens.colorNeutralForeground2, margin: '0', overflowWrap: 'anywhere' },
  choices: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px',
    marginTop: '24px',
    marginBottom: '20px',
    '@media (max-width: 640px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
  choice: {
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '4px',
    padding: '8px 12px 12px',
    minWidth: '0',
    '& p': { paddingLeft: '32px', fontSize: tokens.fontSizeBase200 },
    '&[data-selected="true"]': {
      border: `1px solid ${tokens.colorBrandStroke1}`,
      backgroundColor: tokens.colorBrandBackground2,
    },
  },
  details: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 280px)',
    gap: '24px',
    alignItems: 'start',
    '@media (max-width: 720px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
  },
  destination: { display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '0' },
  destinationSummary: {
    padding: '16px 0',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  summaryRows: {
    display: 'grid',
    gridTemplateColumns: 'minmax(100px, 140px) minmax(0, 1fr)',
    gap: '12px',
    marginBottom: '0',
    '& dt': { color: tokens.colorNeutralForeground2 },
    '& dd': { margin: '0', overflowWrap: 'anywhere' },
  },
  summary: {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: '4px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: '0',
  },
  file: { display: 'flex', alignItems: 'center', gap: '8px', overflowWrap: 'anywhere' },
  dropdown: { width: '100%', minWidth: '0' },
  projectOption: { display: 'flex', flexDirection: 'column', minWidth: '0', gap: '2px' },
  projectPath: { color: tokens.colorNeutralForeground2, fontSize: tokens.fontSizeBase200, overflowWrap: 'anywhere' },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 24px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
    '@media (max-width: 640px)': { flexWrap: 'wrap' },
  },
});

function useAzureResources(
  enabled: boolean,
  level: AzurePublishQuery['level'],
  load: PublishDialogProps['loadAzureResources'],
  subscriptionId?: string,
  resourceGroup?: string
) {
  const [items, setItems] = React.useState<PublishDestination[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    let active = true;
    setItems([]);
    setError(undefined);
    setLoading(enabled);
    if (!enabled) {
      return;
    }
    load({ level, subscriptionId, resourceGroup })
      .then((result) => {
        if (active) {
          setItems(result);
        }
      })
      .catch((failure: unknown) => {
        if (active) {
          setError(failure instanceof Error ? failure.message : String(failure));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [enabled, level, load, subscriptionId, resourceGroup, attempt]);
  return { items, loading, error, retry: () => setAttempt((value) => value + 1) };
}

function AzureResourcePicker({
  label,
  placeholder,
  resource,
  selectedId,
  disabled,
  onSelect,
}: {
  label: string;
  placeholder: string;
  resource: ReturnType<typeof useAzureResources>;
  selectedId: string;
  disabled: boolean;
  onSelect(id: string): void;
}) {
  const styles = useStyles();
  const [query, setQuery] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);
  const selected = resource.items.find((item) => item.id === selectedId);
  const matching = resource.items.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <>
      <Field label={label} required validationState={resource.error ? 'error' : 'none'} validationMessage={resource.error}>
        <Combobox
          className={styles.dropdown}
          placeholder={expanded ? `Search ${label.toLowerCase()}` : placeholder}
          value={expanded ? query : (selected?.name ?? '')}
          selectedOptions={selectedId ? [selectedId] : []}
          disabled={disabled || resource.loading || !!resource.error}
          open={expanded}
          onOpenChange={(_event, data) => {
            setExpanded(data.open);
            if (!data.open) {
              setQuery('');
            }
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            onSelect('');
          }}
          onOptionSelect={(_event, data) => {
            onSelect(data.optionValue ?? '');
            setQuery('');
          }}
        >
          <OptionGroup label={`${matching.length} matching results`}>
            {matching.map((item) => (
              <Option key={item.id} value={item.id} text={item.name}>
                <span className={styles.projectOption}>
                  <span>{item.name}</span>
                  <span className={styles.projectPath}>{item.description}</span>
                </span>
              </Option>
            ))}
            {!matching.length && <Option disabled>{query ? 'No matching results' : 'No resources found'}</Option>}
          </OptionGroup>
        </Combobox>
      </Field>
      {resource.loading && <Spinner size="small" label={`Loading ${label.toLowerCase()}...`} />}
      {resource.error && (
        <Button onClick={resource.retry} disabled={disabled}>
          Retry
        </Button>
      )}
    </>
  );
}

export function PublishDialog({ open, onClose, loadContext, loadAzureResources, onPublish }: PublishDialogProps): React.ReactElement {
  const styles = useStyles();
  const [context, setContext] = React.useState<PublishContext>();
  const [kind, setKind] = React.useState<PublishTarget['kind']>();
  const [localId, setLocalId] = React.useState('');
  const [projectQuery, setProjectQuery] = React.useState('');
  const [projectPickerOpen, setProjectPickerOpen] = React.useState(false);
  const localDescriptionId = React.useId();
  const [azureTarget, setAzureTarget] = React.useState<PublishDestination>();
  const [subscriptionId, setSubscriptionId] = React.useState('');
  const [resourceGroup, setResourceGroup] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const azureEnabled = open && kind === 'azure';
  const subscriptions = useAzureResources(azureEnabled, 'subscriptions', loadAzureResources);
  const selectedSubscription = subscriptions.items.find((item) => item.id === subscriptionId);
  const resourceGroups = useAzureResources(azureEnabled && !!selectedSubscription, 'resourceGroups', loadAzureResources, subscriptionId);
  const selectedResourceGroup = resourceGroups.items.find((item) => item.id === resourceGroup);
  const logicApps = useAzureResources(
    azureEnabled && !!selectedResourceGroup,
    'logicApps',
    loadAzureResources,
    subscriptionId,
    resourceGroup
  );
  const selecting = subscriptions.loading || resourceGroups.loading || logicApps.loading;

  React.useEffect(() => {
    if (!open) {
      setKind(undefined);
      return;
    }
    let active = true;
    setContext(undefined);
    setKind(undefined);
    setLocalId('');
    setProjectQuery('');
    setProjectPickerOpen(false);
    setAzureTarget(undefined);
    setSubscriptionId('');
    setResourceGroup('');
    setError(undefined);
    setLoading(true);
    loadContext()
      .then((result) => {
        if (active) {
          setContext(result);
        }
      })
      .catch((failure: unknown) => {
        if (active) {
          setError(failure instanceof Error ? failure.message : String(failure));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [open, loadContext]);

  const noLocalProjects = context !== undefined && context.localProjects.length === 0;
  const selectedProject = context?.localProjects.find((project) => project.id === localId);
  const matchingProjects = (context?.localProjects ?? []).filter((project) =>
    `${project.name} ${project.description}`.toLowerCase().includes(projectQuery.trim().toLowerCase())
  );
  const target: PublishTarget | undefined =
    kind === 'local' && selectedProject
      ? { kind, id: selectedProject.id }
      : kind === 'azure' &&
          selectedSubscription &&
          selectedResourceGroup &&
          logicApps.items.some((item) => item.id === azureTarget?.id) &&
          azureTarget
        ? { kind, id: azureTarget.id }
        : undefined;

  const publish = async () => {
    if (!target || publishing) {
      return;
    }
    setPublishing(true);
    setError(undefined);
    try {
      if (await onPublish(target)) {
        onClose();
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <Dialog open={open} onOpenChange={(_event, data) => !data.open && !publishing && onClose()}>
        <DialogSurface className={styles.surface}>
          <DialogBody className={styles.body}>
            <div className={styles.header}>
              <DialogTitle className={styles.title} action={null}>
                Publish Data Map
              </DialogTitle>
              <Button
                className={styles.closeButton}
                appearance="subtle"
                icon={<Dismiss20Regular />}
                aria-label="Close"
                disabled={publishing}
                onClick={onClose}
              />
            </div>
            <DialogContent className={styles.content}>
              <h2 className={styles.heading}>Choose a publishing destination</h2>
              <p className={styles.muted}>
                Publish compiled map and its schemas to a Logic Apps project in your workspace or a Logic Apps Standard resource in Azure.
              </p>
              <RadioGroup
                className={styles.choices}
                value={kind ?? ''}
                disabled={loading || publishing || !context}
                aria-label="Publishing destination"
                onChange={(_event, data) => {
                  setKind(data.value as PublishTarget['kind']);
                  setSubscriptionId('');
                  setResourceGroup('');
                  setAzureTarget(undefined);
                  setError(undefined);
                }}
              >
                <div className={styles.choice} data-selected={kind === 'local'}>
                  <Radio value="local" label="Local Workspace" disabled={noLocalProjects} aria-describedby={localDescriptionId} />
                  <p id={localDescriptionId} className={styles.muted}>
                    {noLocalProjects
                      ? 'Need a Logic Apps project to be present in the workspace.'
                      : 'Publish to a Logic Apps project in the current workspace.'}
                  </p>
                </div>
                <div className={styles.choice} data-selected={kind === 'azure'}>
                  <Radio value="azure" label="Logic Apps Standard in Azure" />
                  <p className={styles.muted}>Publish directly to an existing Logic Apps Standard resource.</p>
                </div>
              </RadioGroup>
              <div className={styles.details}>
                <div className={styles.destination}>
                  {loading && <Spinner size="small" label="Loading publishing destinations..." />}
                  {error && (
                    <MessageBar intent="error">
                      <MessageBarBody>{error}</MessageBarBody>
                    </MessageBar>
                  )}
                  {!kind && !loading && (
                    <MessageBar>
                      <MessageBarBody>
                        Select Local Workspace or Logic Apps Standard in Azure to choose where to publish this map.
                      </MessageBarBody>
                    </MessageBar>
                  )}
                  {kind === 'local' &&
                    context &&
                    (context.localProjects.length ? (
                      <>
                        <Field label="Logic Apps project" required>
                          <Combobox
                            className={styles.dropdown}
                            placeholder={projectPickerOpen ? 'Search projects' : 'Select a project'}
                            selectedOptions={localId ? [localId] : []}
                            value={projectPickerOpen ? projectQuery : (selectedProject?.name ?? '')}
                            open={projectPickerOpen}
                            disabled={publishing}
                            onOpenChange={(_event, data) => {
                              setProjectPickerOpen(data.open);
                              if (!data.open) {
                                setProjectQuery('');
                              }
                            }}
                            onChange={(event) => {
                              setProjectQuery(event.target.value);
                              setLocalId('');
                            }}
                            onOptionSelect={(_event, data) => {
                              setLocalId(data.optionValue ?? '');
                              setProjectQuery('');
                            }}
                          >
                            <OptionGroup label={`${context.localProjects.length} Logic Apps projects in the current workspace`}>
                              {matchingProjects.map((project) => (
                                <Option key={project.id} value={project.id} text={project.name}>
                                  <span className={styles.projectOption}>
                                    <span>{project.name}</span>
                                    <span className={styles.projectPath}>{project.description}</span>
                                  </span>
                                </Option>
                              ))}
                              {!matchingProjects.length && <Option disabled>No matching projects</Option>}
                            </OptionGroup>
                          </Combobox>
                        </Field>
                        {selectedProject && (
                          <>
                            <section className={styles.destinationSummary} aria-label="Publishing destination">
                              <strong className={styles.file}>
                                <Checkmark20Regular />
                                Publishing destination
                              </strong>
                              <dl className={styles.summaryRows}>
                                <dt>Target</dt>
                                <dd>{context.workspaceName ?? 'Local Workspace'}</dd>
                                <dt>Project</dt>
                                <dd>{selectedProject.name}</dd>
                                <dt>Artifacts location</dt>
                                <dd>{selectedProject.artifactsPath}</dd>
                                <dt>Source map</dt>
                                <dd>
                                  {context.projectName} / {context.mapName}
                                </dd>
                              </dl>
                            </section>
                            <MessageBar>
                              <MessageBarBody>
                                The map artifacts will be published to the selected local project. No Azure resource will be changed
                              </MessageBarBody>
                            </MessageBar>
                          </>
                        )}
                      </>
                    ) : (
                      <MessageBar intent="warning">
                        <MessageBarBody>No Logic Apps projects were found in this workspace.</MessageBarBody>
                      </MessageBar>
                    ))}
                  {kind === 'azure' && (
                    <>
                      <AzureResourcePicker
                        label="Subscription"
                        placeholder="Select a subscription"
                        resource={subscriptions}
                        selectedId={subscriptionId}
                        disabled={publishing}
                        onSelect={(id) => {
                          setSubscriptionId(id);
                          setResourceGroup('');
                          setAzureTarget(undefined);
                          setError(undefined);
                        }}
                      />
                      {selectedSubscription && (
                        <AzureResourcePicker
                          key={subscriptionId}
                          label="Resource group"
                          placeholder="Select a resource group"
                          resource={resourceGroups}
                          selectedId={resourceGroup}
                          disabled={publishing}
                          onSelect={(id) => {
                            setResourceGroup(id);
                            setAzureTarget(undefined);
                            setError(undefined);
                          }}
                        />
                      )}
                      {selectedResourceGroup && (
                        <AzureResourcePicker
                          key={`${subscriptionId}/${resourceGroup}`}
                          label="Logic App (Standard)"
                          placeholder="Select a Logic App"
                          resource={logicApps}
                          selectedId={azureTarget?.id ?? ''}
                          disabled={publishing}
                          onSelect={(id) => {
                            setAzureTarget(logicApps.items.find((item) => item.id === id));
                            setError(undefined);
                          }}
                        />
                      )}
                      {target && azureTarget && (
                        <section className={styles.destinationSummary} aria-label="Publishing destination">
                          <strong className={styles.file}>
                            <Checkmark20Regular />
                            Publishing destination
                          </strong>
                          <dl className={styles.summaryRows}>
                            <dt>Target</dt>
                            <dd>Logic Apps Standard in Azure</dd>
                            <dt>Destination</dt>
                            <dd>
                              {selectedSubscription?.name}/{selectedResourceGroup?.name}/{azureTarget.name}/Artifacts
                            </dd>
                            <dt>Resource type</dt>
                            <dd>{azureTarget.description}</dd>
                            <dt>Source map</dt>
                            <dd>
                              {context?.projectName} / {context?.mapName}
                            </dd>
                          </dl>
                        </section>
                      )}
                    </>
                  )}
                </div>
                <aside className={styles.summary}>
                  <strong>Map to publish</strong>
                  <div className={styles.file}>
                    <Code20Regular />
                    <span>{context?.mapName ?? 'Data map'}</span>
                  </div>
                  {context && <p className={styles.muted}>Source project: {context.projectName}</p>}
                </aside>
              </div>
            </DialogContent>
            <div className={styles.footer}>
              <p className={styles.muted} role="status">
                {publishing
                  ? 'Publishing map...'
                  : target
                    ? `Destination selected. Ready to publish ${context?.mapName ?? 'map'}.`
                    : 'Select a destination to enable publishing.'}
              </p>
              <DialogActions>
                <Button appearance="secondary" onClick={onClose} disabled={publishing}>
                  Cancel
                </Button>
                <Button
                  appearance="primary"
                  icon={publishing ? <Spinner size="tiny" /> : <CloudArrowUp20Regular />}
                  disabled={!target || publishing || selecting || loading}
                  onClick={publish}
                >
                  {publishing ? 'Publishing...' : 'Publish'}
                </Button>
              </DialogActions>
            </div>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </FluentProvider>
  );
}
