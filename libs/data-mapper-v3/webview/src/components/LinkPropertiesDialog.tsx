import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  FluentProvider,
  Input,
  Select,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
// biome-ignore lint/style/useImportType: The classic JSX transform requires React at runtime.
import React, { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SourceLinkOption, TargetLinkOption } from '../../../src/model/mapModel';
import { getVsCodeFluentTheme, useTypographyStyles } from '../fluentTheme';

export interface LinkPropertiesResult {
  label?: string;
  sourceLinkOption?: SourceLinkOption;
  targetLinkOption?: TargetLinkOption;
}

export interface LinkPropertiesViewModel extends LinkPropertiesResult {
  source: string;
  target: string;
  selectionCount?: number;
  mixedFields?: { label: boolean; sourceLinkOption: boolean; targetLinkOption: boolean };
}

interface LinkPropertiesCallbacks {
  onSave(result: LinkPropertiesResult): void;
  onCancel(): void;
}

const useStyles = makeStyles({
  surface: { width: '520px', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  body: { flex: 1, minHeight: 0, minWidth: 0, gridTemplateRows: 'auto minmax(0, 1fr) auto' },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minHeight: 0,
    overflowY: 'auto',
  },
});

function LinkPropertiesDialogView({
  model,
  onSave,
  onCancel,
}: { model: LinkPropertiesViewModel } & LinkPropertiesCallbacks): React.ReactElement {
  const styles = useStyles();
  const typographyStyles = useTypographyStyles();
  const [label, setLabel] = useState(model.label ?? '');
  const [sourceLinkOption, setSourceLinkOption] = useState<SourceLinkOption | ''>(
    model.mixedFields?.sourceLinkOption ? '' : (model.sourceLinkOption ?? SourceLinkOption.ValueCopy)
  );
  const [targetLinkOption, setTargetLinkOption] = useState<TargetLinkOption | ''>(
    model.mixedFields?.targetLinkOption ? '' : (model.targetLinkOption ?? TargetLinkOption.Flattening)
  );
  const [labelChanged, setLabelChanged] = useState(false);
  const [sourceChanged, setSourceChanged] = useState(false);
  const [targetChanged, setTargetChanged] = useState(false);
  const bulk = (model.selectionCount ?? 1) > 1;

  return (
    <FluentProvider theme={getVsCodeFluentTheme()} style={{ display: 'contents' }}>
      <Dialog
        open
        modalType="modal"
        onOpenChange={(_event, data) => {
          if (!data.open) {
            onCancel();
          }
        }}
      >
        <DialogSurface className={`${styles.surface} ${typographyStyles.base}`}>
          <DialogBody className={styles.body}>
            <DialogTitle>{bulk ? `Link Properties (${model.selectionCount})` : 'Link Properties'}</DialogTitle>
            <DialogContent className={styles.content}>
              <Field label="Label">
                <Input
                  value={label}
                  placeholder={model.mixedFields?.label ? 'Multiple values' : undefined}
                  onChange={(_event, data) => {
                    setLabel(data.value);
                    setLabelChanged(true);
                  }}
                />
              </Field>
              <Field label="Link source">
                <Input readOnly value={model.source} title={model.source} />
              </Field>
              <Field label="Link target">
                <Input readOnly value={model.target} title={model.target} />
              </Field>
              <Field label="Source link directive">
                <Select
                  value={sourceLinkOption}
                  onChange={(_event, data) => {
                    setSourceLinkOption(data.value as SourceLinkOption);
                    setSourceChanged(true);
                  }}
                >
                  {model.mixedFields?.sourceLinkOption && (
                    <option value="" disabled>
                      Multiple values
                    </option>
                  )}
                  <option value={SourceLinkOption.ValueCopy}>Value Copy</option>
                  <option value={SourceLinkOption.NameCopy}>Name Copy</option>
                  <option value={SourceLinkOption.MixedCopy}>Mixed Copy</option>
                </Select>
              </Field>
              <Field label="Target link directive">
                <Select
                  value={targetLinkOption}
                  onChange={(_event, data) => {
                    setTargetLinkOption(data.value as TargetLinkOption);
                    setTargetChanged(true);
                  }}
                >
                  {model.mixedFields?.targetLinkOption && (
                    <option value="" disabled>
                      Multiple values
                    </option>
                  )}
                  <option value={TargetLinkOption.Flattening}>Flattening</option>
                  <option value={TargetLinkOption.TopDown}>Top Down</option>
                  <option value={TargetLinkOption.BottomUp}>Bottom Up</option>
                </Select>
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={() =>
                  onSave({
                    label: !bulk || labelChanged ? label : undefined,
                    sourceLinkOption: (!bulk || sourceChanged) && sourceLinkOption ? sourceLinkOption : undefined,
                    targetLinkOption: (!bulk || targetChanged) && targetLinkOption ? targetLinkOption : undefined,
                  })
                }
              >
                OK
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </FluentProvider>
  );
}

export class LinkPropertiesDialog extends HTMLElement {
  private reactRoot: Root | null = null;
  private model: LinkPropertiesViewModel | null = null;
  private callbacks: LinkPropertiesCallbacks | null = null;
  private renderVersion = 0;

  public configure(model: LinkPropertiesViewModel, callbacks: LinkPropertiesCallbacks): void {
    this.model = model;
    this.callbacks = callbacks;
    this.renderVersion++;
    this.renderReact();
  }

  public connectedCallback(): void {
    this.renderReact();
  }

  public disconnectedCallback(): void {
    this.reactRoot?.unmount();
    this.reactRoot = null;
  }

  public clear(): void {
    this.reactRoot?.unmount();
    this.reactRoot = null;
    this.model = null;
    this.callbacks = null;
  }

  private renderReact(): void {
    if (!this.isConnected || !this.model || !this.callbacks) {
      return;
    }
    this.reactRoot ??= createRoot(this);
    this.reactRoot.render(<LinkPropertiesDialogView key={this.renderVersion} model={this.model} {...this.callbacks} />);
  }
}

customElements.define('biztalk-link-properties-dialog', LinkPropertiesDialog);

declare global {
  interface HTMLElementTagNameMap {
    'biztalk-link-properties-dialog': LinkPropertiesDialog;
  }
}
