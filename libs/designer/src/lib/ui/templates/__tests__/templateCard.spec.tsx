import { describe, beforeAll, expect, it } from 'vitest';
import type { AppStore } from '../../../core/state/templates/store';
import { setupStore, type RootState } from '../../../core/state/templates/store';
import type { Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../__test__/template-test-utils';
import { screen } from '@testing-library/react';
import { TemplateCard } from '../cards/templateCard';
// biome-ignore lint/correctness/noUnusedImports: <explanation>
import React from 'react';

describe('ui/templates/templatesDesigner', () => {
  let store: AppStore;
  let minimalStoreData: Partial<RootState>;
  let template1Manifest: Template.TemplateManifest;
  let template2Manifest: Template.TemplateManifest;
  let template3Manifest: Template.TemplateManifest;

  beforeAll(() => {
    template1Manifest = {
      id: 'template1Manifest',
      title: 'Template 1',
      summary: 'Template 1 Description',
      skus: ['standard', 'consumption'],
      workflows: {
        default: { name: 'default' },
      },
      details: {
        By: '',
        Type: '',
        Category: '',
      },
      artifacts: [
        {
          type: 'description',
          file: 'description.md',
        },
      ],
    };
    template2Manifest = {
      id: 'template2Manifest',
      title: 'Template 2',
      summary: 'Template 2 Description',
      skus: ['standard', 'consumption'],
      workflows: {
        default: { name: 'default' },
      },
      details: {
        By: '',
        Type: '',
        Category: '',
      },
      artifacts: [
        {
          type: 'description',
          file: 'description.md',
        },
      ],
    };
    template3Manifest = {
      id: 'template3Manifest',
      title: 'Template 3',
      summary: 'Template 3 Description',
      skus: ['standard', 'consumption'],
      workflows: {
        default: { name: 'default' },
      },
      details: {
        By: '',
        Type: '',
        Category: '',
      },
      artifacts: [
        {
          type: 'description',
          file: 'description.md',
        },
      ],
    };
  });

  it('Renders TemplateCard and loads template state correctly on buttons click', async () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1', 'template2'],
        availableTemplates: {
          template1: template1Manifest,
          template2: template2Manifest,
        },
        filters: {
          sortKey: 'a-to-z',
          connectors: undefined,
          detailFilters: {},
          pageNum: 0,
        },
      },
    };
    store = setupStore(minimalStoreData);

    renderWithProviders(<TemplateCard templateName="template1" />, { store });

    expect(screen.getByText('Template 1')).toBeDefined();
    screen.getByText('Template 1').click();
    expect(store.getState().template.templateName).toBe('template1');
  });

  it('Renders TemplateCard and Opens the right panel', async () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1', 'template2', 'template3'],
        availableTemplates: {
          template1: template1Manifest,
          template2: template2Manifest,
          template3: template3Manifest,
        },
        filters: {
          sortKey: 'a-to-z',
          connectors: undefined,
          detailFilters: {},
          pageNum: 0,
        },
      },
    };
    store = setupStore(minimalStoreData);

    renderWithProviders(<TemplateCard templateName="template2" />, { store });

    expect(screen.getByText('Template 2')).toBeDefined();
    screen.getByText('Template 2').click();
    expect(store.getState().panel.isOpen).toBe(true);
    expect(store.getState().panel.currentPanelView).toBe('quickView');
    store.dispatch({ type: 'panel/closePanel' });
    expect(store.getState().panel.isOpen).toBe(false);
  });
});
