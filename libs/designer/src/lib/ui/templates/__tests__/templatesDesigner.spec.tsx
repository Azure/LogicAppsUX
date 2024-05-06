import { describe, beforeAll, expect, it } from 'vitest';
import type { AppStore } from '../../../core/state/templates/store';
import { setupStore, type RootState } from '../../../core/state/templates/store';
import type { Template } from '@microsoft/logic-apps-shared';
import { renderWithProviders } from '../../../__test__/template-test-utils';
import { TemplatesDesigner } from '../TemplatesDesigner';
import { screen } from '@testing-library/react';

describe('ui/templates/templatesDesigner', () => {
  let store: AppStore;
  let minimalStoreData: Partial<RootState>;
  let template1Manifest: Template.Manifest;
  let template2Manifest: Template.Manifest;

  beforeAll(() => {
    template1Manifest = {
      title: 'Template 1',
      description: 'Template 1 Description',
      skus: ['standard'],
      kinds: ['stateful'],
      artifacts: [
        {
          type: 'workflow',
          file: 'workflow.json',
        },
        {
          type: 'description',
          file: 'description.md',
        },
      ],
      connections: [
        {
          id: 'connection example 1',
        },
        {
          id: 'connection example 2',
        },
      ],
      parameters: [],
    };
    template2Manifest = {
      title: 'Template 2',
      description: 'Template 2 Description',
      skus: ['standard', 'consumption'],
      kinds: ['stateful', 'stateless'],
      artifacts: [
        {
          type: 'workflow',
          file: 'workflow.json',
        },
        {
          type: 'description',
          file: 'description.md',
        },
      ],
      connections: [
        {
          id: 'connection example 1',
        },
      ],
      parameters: [],
    };
  });

  it('Fetches templates and display the title and description', async () => {
    minimalStoreData = {
      manifest: {
        availableTemplateNames: ['template1', 'template2'],
        availableTemplates: {
          template1: template1Manifest,
          template2: template2Manifest,
        },
      },
    };
    store = setupStore(minimalStoreData);

    renderWithProviders(<TemplatesDesigner />, { store });

    expect(screen.getByText(/Template 1/i)).toBeDefined();
    expect(screen.getByText(/Template 1 Description/i)).toBeDefined();
    expect(screen.getByText(/Template 2/i)).toBeDefined();
    expect(screen.getByText(/Template 2 Description/i)).toBeDefined();
  });
});
