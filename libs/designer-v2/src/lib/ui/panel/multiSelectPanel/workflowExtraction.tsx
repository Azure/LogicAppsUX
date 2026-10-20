import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  MenuItem,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ArrowExport24Regular } from '@fluentui/react-icons';
import { ProgressStepper, WorkflowPreview } from '@microsoft/designer-ui';
import { guid } from '@microsoft/logic-apps-shared';
import type { Workflow } from '../../../common/models/workflow';
import type {
  WorkflowExtractionBinding,
  WorkflowExtractionRequest,
  WorkflowExtractionResult,
} from '../../../common/models/workflowExtraction';
import { ProviderWrappedContext } from '../../../core/ProviderWrappedContext';
import type { AppDispatch, AppStore, RootState } from '../../../core/store';
import { serializeWorkflow } from '../../../core/actions/bjsworkflow/serializer';
import {
  commitWorkflowExtraction,
  getExtractionSelectedIds,
  workflowExtractionFingerprint,
} from '../../../core/actions/bjsworkflow/workflowExtraction';
import { setWorkflowExtractionDialogOpen } from '../../../core/state/designerView/designerViewSlice';
import { setFocusNode } from '../../../core/state/workflow/workflowSlice';
import { getOrderedSelectedChain, getTopLevelSelectedNodes } from '../../../core/utils/multiselect';
import { buildWorkflowExtractionPlan } from '../../../core/utils/workflowExtraction';
import { getWorkflowExtractionPreview, type WorkflowExtractionPreviewVisuals } from './workflowExtractionPreview';
import {
  extractionSteps,
  getExtractionStep,
  initialExtractionProgress,
  reportExtractionProgress,
  settleExtractionProgress,
  startExtractionAttempt,
  type ExtractionProgress,
} from './workflowExtractionProgress';

const useStyles = makeStyles({
  surface: {
    width: '720px',
    maxWidth: 'calc(100vw - 32px)',
    padding: tokens.spacingHorizontalL,
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  body: {
    maxHeight: 'calc(100vh - 80px)',
    '@media (max-height: 480px)': { maxHeight: 'none' },
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minHeight: 0,
    overflowY: 'auto',
    '& > *': { flexShrink: 0 },
  },
  preview: {
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    minHeight: 0,
    minWidth: 0,
    flexShrink: 0,
  },
  previewFrame: {
    boxSizing: 'content-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '320px',
    flexShrink: 0,
    minHeight: 0,
    overflow: 'hidden',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  canvas: { flexGrow: 1, minHeight: 0 },
  previewTitle: {
    position: 'absolute',
    top: tokens.spacingVerticalL,
    left: tokens.spacingHorizontalL,
    zIndex: 6,
    pointerEvents: 'none',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
  },
  bindings: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  previewUnavailable: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    padding: tokens.spacingVerticalL,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  table: {
    width: '100%',
    textAlign: 'left',
    tableLayout: 'fixed',
    borderCollapse: 'collapse',
    '& th, & td': { padding: tokens.spacingVerticalXS, borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, overflowWrap: 'anywhere' },
  },
  footer: {
    gridColumn: '1 / -1',
    gridRow: '3',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minWidth: 0,
  },
  progressArea: {
    boxSizing: 'border-box',
    paddingTop: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalL,
    maxHeight: '40vh',
    minHeight: 0,
    overflowY: 'auto',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalS,
    alignSelf: 'flex-end',
    flexShrink: 0,
    '@media (max-width: 480px)': { alignSelf: 'stretch' },
  },
});

const getExtractionErrorMessage = (cause: unknown, fallback: string): string => {
  const message = cause instanceof Error ? cause.message : cause === null || cause === undefined ? '' : String(cause);
  return message.trim() ? message : fallback;
};

const ExtractionStepper = ({ progress }: { progress: ExtractionProgress }) => {
  const intl = useIntl();
  const labels = {
    preparing: intl.formatMessage({
      id: 'NMQNOk',
      defaultMessage: 'Prepare workflows',
      description: 'Extraction preparation milestone including isolated workflow hydration and validation',
    }),
    'creating-child': intl.formatMessage({
      id: 'kcHo9Y',
      defaultMessage: 'Create child workflow',
      description: 'Extraction child persistence and host readiness step',
    }),
    'updating-parent': intl.formatMessage({
      id: 'uxUj77',
      defaultMessage: 'Update parent workflow',
      description: 'Extraction parent milestone including durable source save, live application and finalization',
    }),
  };
  return (
    <ProgressStepper
      aria-label={intl.formatMessage({
        id: '8qo81q',
        defaultMessage: 'Extraction progress',
        description: 'Connected extraction execution milestones',
      })}
      steps={extractionSteps.map((step) => getExtractionStep(progress, step, labels[step]))}
    />
  );
};

export const WorkflowExtractionAction = ({ variant = 'button', onClick }: { variant?: 'button' | 'menuItem'; onClick?: () => void }) => {
  const service = useContext(ProviderWrappedContext)?.workflowExtractionService;
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { selectedIds, workflow, readOnly, monitoring } = useSelector((state: RootState) => ({
    selectedIds: state.panel.operationContent.selectedNodeIds ?? [],
    workflow: state.workflow,
    readOnly: state.designerOptions.readOnly,
    monitoring: state.designerOptions.isMonitoringView,
  }));
  if (!service || service.hostingPlan !== 'standard' || readOnly || monitoring || selectedIds.length < 2) {
    return null;
  }
  const topLevelIds = getTopLevelSelectedNodes(workflow, selectedIds);
  const valid = topLevelIds.length >= 2 && !!getOrderedSelectedChain(workflow, topLevelIds);
  const label = intl.formatMessage({
    id: 'PHpOlN',
    defaultMessage: 'Extract to new workflow',
    description: 'Extract selected actions command',
  });
  const reason = intl.formatMessage({
    defaultMessage: 'Select a connected, contiguous sequence of actions in the same workflow scope.',
    id: '7+B3BY',
    description: 'Extraction selection connectivity requirement',
  });
  const onExtract = () => {
    onClick?.();
    dispatch(setWorkflowExtractionDialogOpen(true));
  };
  return (
    <Tooltip content={valid ? label : reason} relationship="description">
      {variant === 'menuItem' ? (
        <MenuItem icon={<ArrowExport24Regular />} disabled={!valid} onClick={onExtract}>
          {label}
        </MenuItem>
      ) : (
        <Button icon={<ArrowExport24Regular />} aria-label={label} disabled={!valid} onClick={onExtract}>
          {intl.formatMessage({
            id: '6PWlzT',
            defaultMessage: 'Extract',
            description: 'Short label for the selected actions extraction button',
          })}
        </Button>
      )}
    </Tooltip>
  );
};

const BindingTable = ({ bindings, title }: { bindings: WorkflowExtractionBinding[]; title: string }) => {
  const styles = useStyles();
  const intl = useIntl();
  if (!bindings.length) {
    return null;
  }
  return (
    <section aria-label={title}>
      <Text weight="semibold">{title}</Text>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">
              {intl.formatMessage({
                id: 'yVcmKq',
                defaultMessage: 'Original expression',
                description: 'Extraction original expression column',
              })}
            </th>
            <th scope="col">
              {intl.formatMessage({
                id: 'LiRX1e',
                defaultMessage: 'Replacement',
                description: 'Extraction replacement expression column',
              })}
            </th>
          </tr>
        </thead>
        <tbody>
          {bindings.map((binding) => (
            <tr key={binding.name}>
              <td>
                <code>{binding.expression}</code>
              </td>
              <td>
                <code>{binding.rewrittenExpression}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export const WorkflowExtractionDialog = () => {
  const service = useContext(ProviderWrappedContext)?.workflowExtractionService;
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore() as AppStore;
  const intl = useIntl();
  const styles = useStyles();
  const open = useSelector((state: RootState) => !!state.designerView.workflowExtractionDialogOpen);
  const [source, setSource] = useState<{
    workflow: Workflow;
    ids: string[];
    fingerprint: string;
    visuals: WorkflowExtractionPreviewVisuals;
  }>();
  const [name, setName] = useState('Extracted_workflow');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<'preparing' | 'saving' | 'refreshing'>();
  const [result, setResult] = useState<WorkflowExtractionResult>();
  const [progress, setProgress] = useState<ExtractionProgress>();
  const submitting = useRef(false);
  const request = useRef<WorkflowExtractionRequest>();

  useEffect(() => {
    if (open && !service) {
      dispatch(setWorkflowExtractionDialogOpen(false));
    }
  }, [dispatch, open, service]);

  useEffect(() => {
    if (!open || !service) {
      return;
    }
    let current = true;
    setSource(undefined);
    setResult(undefined);
    setError(undefined);
    setStage(undefined);
    setProgress(undefined);
    setName('Extracted_workflow');
    request.current = undefined;
    const state = store.getState();
    setLoading(true);
    serializeWorkflow(state)
      .then(async (workflow) => {
        const suggestedName = (await service?.getSuggestedName?.('Extracted_workflow')) ?? 'Extracted_workflow';
        if (current) {
          setName(suggestedName);
          setSource({
            workflow,
            ids: getExtractionSelectedIds(state),
            fingerprint: workflowExtractionFingerprint(workflow),
            visuals: Object.fromEntries(
              Object.entries(state.operations.operationMetadata).map(([id, { iconUri, brandColor }]) => [
                state.workflow.idReplacements[id] ?? id,
                { iconUri, brandColor },
              ])
            ),
          });
        }
      })
      .catch((cause: unknown) => {
        if (current) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (current) {
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [open, store, service?.sourceId]);

  const preview = useMemo(() => {
    if (!source || !service) {
      return {};
    }
    try {
      return { plan: buildWorkflowExtractionPlan(source.workflow, source.ids, name, service.createInvocation) };
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : String(cause) };
    }
  }, [source, service, name]);
  const previewGraph = useMemo(
    () => (preview.plan ? getWorkflowExtractionPreview(preview.plan, source?.visuals) : undefined),
    [preview.plan, source?.visuals]
  );
  const nameError = loading || !source ? undefined : service?.validateName(name);
  const busy = !!stage;
  useEffect(() => {
    if (!busy) {
      return;
    }
    const preventNavigation = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', preventNavigation);
    return () => window.removeEventListener('beforeunload', preventNavigation);
  }, [busy]);
  const close = () => {
    if (!submitting.current) {
      dispatch(setWorkflowExtractionDialogOpen(false));
      if (result?.status === 'completed' && request.current) {
        dispatch(setFocusNode(request.current.plan.invocationId));
      }
    }
  };
  const confirm = async () => {
    if (submitting.current || !service || !preview.plan || !source || (nameError && !request.current)) {
      return;
    }
    submitting.current = true;
    setError(undefined);
    setProgress(startExtractionAttempt);
    setStage('preparing');
    request.current ??= { operationId: guid(), sourceFingerprint: source.fingerprint, plan: preview.plan };
    const fallbackError = intl.formatMessage({
      defaultMessage: 'Extraction could not be completed. Review both workflows before continuing.',
      id: 'snw6B2',
      description: 'Extraction failure or partial result without host-provided error or recovery details',
    });
    try {
      const outcome = await commitWorkflowExtraction(store, service, request.current, setStage, (notification) => {
        setProgress((previous) => reportExtractionProgress(previous ?? initialExtractionProgress(), notification));
      });
      const normalizedOutcome =
        outcome.status === 'completed' ? outcome : { ...outcome, message: getExtractionErrorMessage(outcome.message, fallbackError) };
      setProgress((previous) => settleExtractionProgress(previous ?? initialExtractionProgress(), normalizedOutcome));
      setResult(normalizedOutcome);
      if (normalizedOutcome.status !== 'completed') {
        setError(normalizedOutcome.message);
      }
    } catch (cause) {
      const message = getExtractionErrorMessage(cause, fallbackError);
      setProgress((previous) => settleExtractionProgress(previous ?? initialExtractionProgress(), undefined, message));
      setError(message);
    } finally {
      submitting.current = false;
      setStage(undefined);
    }
  };

  if (!service || !open) {
    return null;
  }
  const complete = result?.status === 'completed';
  const terminal = complete || result?.status === 'source-saved';
  return (
    <Dialog
      open={open}
      modalType={busy ? 'alert' : 'modal'}
      onOpenChange={(_, data) => {
        if (!data.open) {
          close();
        }
      }}
    >
      <DialogSurface className={styles.surface}>
        <DialogBody className={styles.body} data-automation-id="extraction-workflow-details">
          <DialogTitle>
            {intl.formatMessage({
              id: 'g6vZmr',
              defaultMessage: 'Extract to new workflow',
              description: 'Extraction dialog title',
            })}
          </DialogTitle>
          <DialogContent className={styles.content}>
            <MessageBar intent="info" layout="multiline">
              <MessageBarBody>{service.persistenceDescription}</MessageBarBody>
            </MessageBar>
            {complete ? null : (
              <Field
                label={intl.formatMessage({
                  id: 'DG3b2e',
                  defaultMessage: 'Workflow name',
                  description: 'Extracted workflow name label',
                })}
                validationMessage={result ? undefined : nameError}
                validationState={nameError && !result ? 'error' : 'none'}
              >
                <Input
                  value={name}
                  disabled={busy || loading || !!result}
                  onChange={(_, data) => {
                    setName(data.value);
                    setError(undefined);
                    setProgress(undefined);
                    request.current = undefined;
                  }}
                />
              </Field>
            )}
            <div className={styles.preview} data-automation-id="extraction-workflow-preview">
              <div className={styles.previewFrame} data-automation-id="extraction-workflow-preview-frame">
                <Text weight="semibold" size={400} className={styles.previewTitle}>
                  {intl.formatMessage({
                    defaultMessage: 'Child workflow preview',
                    id: 'jjPEgA',
                    description: 'Extraction read-only diagram label',
                  })}
                </Text>
                {previewGraph ? (
                  <WorkflowPreview
                    {...previewGraph}
                    className={styles.canvas}
                    ariaLabel={intl.formatMessage({
                      defaultMessage: 'Child workflow preview',
                      id: 'jjPEgA',
                      description: 'Extraction read-only diagram label',
                    })}
                  />
                ) : (
                  <div className={styles.previewUnavailable}>
                    {loading ? (
                      <Spinner />
                    ) : (
                      <Text>
                        {intl.formatMessage({
                          defaultMessage: 'A preview is available once the selection and workflow name are valid.',
                          id: 'ago3bz',
                          description: 'Placeholder when an extraction preview cannot be generated',
                        })}
                      </Text>
                    )}
                  </div>
                )}
              </div>
            </div>
            {!complete && preview.plan && (preview.plan.inputs.length || preview.plan.outputs.length) ? (
              <Accordion collapsible>
                <AccordionItem value="bindings">
                  <AccordionHeader>
                    {intl.formatMessage({
                      id: 'tOS8R9',
                      defaultMessage: 'Input and output bindings',
                      description: 'Collapsible extraction input and output mappings heading',
                    })}
                  </AccordionHeader>
                  <AccordionPanel>
                    <div className={styles.bindings}>
                      <BindingTable
                        bindings={preview.plan.inputs}
                        title={intl.formatMessage({
                          id: 'SS02WP',
                          defaultMessage: 'Inputs',
                          description: 'Extraction inputs heading',
                        })}
                      />
                      <BindingTable
                        bindings={preview.plan.outputs}
                        title={intl.formatMessage({
                          id: 'mkFJu5',
                          defaultMessage: 'Outputs',
                          description: 'Extraction outputs heading',
                        })}
                      />
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            ) : null}
            {!progress && (error || preview.error) ? (
              <MessageBar intent="error" layout="multiline">
                <MessageBarBody>{error ?? preview.error}</MessageBarBody>
              </MessageBar>
            ) : null}
          </DialogContent>
          <div className={styles.footer}>
            <div
              className={styles.progressArea}
              role="region"
              tabIndex={0}
              aria-label={intl.formatMessage({
                id: '5N/tfe',
                defaultMessage: 'Extraction progress details',
                description: 'Keyboard-scrollable extraction milestones and contextual recovery details',
              })}
            >
              <ExtractionStepper progress={progress ?? initialExtractionProgress()} />
            </div>
            {complete ? (
              <MessageBar intent="success" layout="multiline" data-automation-id="extraction-workflow-success">
                <MessageBarBody>
                  {intl.formatMessage({
                    defaultMessage: 'The child workflow was created and the source workflow was saved.',
                    id: 'VVtXY/',
                    description: 'Extraction completed',
                  })}
                </MessageBarBody>
              </MessageBar>
            ) : null}
            <DialogActions className={styles.actions}>
              {result ? (
                <Button
                  as="a"
                  href={result.child.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  appearance="secondary"
                  title={intl.formatMessage({
                    defaultMessage: 'Opens in a new tab',
                    id: '/nKih3',
                    description: 'Accessible description for the extracted child workflow navigation action',
                  })}
                >
                  {intl.formatMessage({
                    id: 'vuOf8W',
                    defaultMessage: 'Open child workflow',
                    description: 'Open the extracted child workflow in a new browser tab',
                  })}
                </Button>
              ) : null}
              {terminal ? (
                <Button appearance="primary" onClick={close}>
                  {intl.formatMessage({ id: 'jLPSdk', defaultMessage: 'Close', description: 'Close extraction dialog' })}
                </Button>
              ) : (
                <>
                  <Button
                    appearance="primary"
                    onClick={confirm}
                    disabled={busy || loading || !preview.plan || (!!nameError && !request.current)}
                  >
                    {result
                      ? intl.formatMessage({
                          id: 'o3W99k',
                          defaultMessage: 'Retry source update',
                          description: 'Retry partially completed extraction',
                        })
                      : intl.formatMessage({
                          id: 'qEm9sp',
                          defaultMessage: 'Confirm',
                          description: 'Confirm workflow extraction',
                        })}
                  </Button>
                  <Button onClick={close} disabled={busy}>
                    {intl.formatMessage({
                      id: 'n2PLrh',
                      defaultMessage: 'Cancel',
                      description: 'Cancel workflow extraction',
                    })}
                  </Button>
                </>
              )}
            </DialogActions>
          </div>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
