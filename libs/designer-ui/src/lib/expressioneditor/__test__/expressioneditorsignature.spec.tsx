import { ExpressionEditorSignature } from '../expressioneditorsignature';
import type { SignatureInfo } from '../../editor/codemirror/languages/workflow/signature';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('ExpressionEditorSignature', () => {
  const signature: SignatureInfo = {
    functionName: 'concat',
    activeParameter: 1,
    definition: {
      name: 'concat',
      defaultSignature: 'concat(text_1: string, text_2: string)',
      description: 'Combines strings.',
      signatures: [
        {
          definition: 'concat(text_1: string, text_2: string)',
          documentation: 'Combines two or more strings.',
          parameters: [
            { name: 'text_1', type: 'string', documentation: 'First string.' },
            { name: 'text_2', type: 'string', documentation: 'Second string.' },
          ],
        },
      ],
    },
  };

  it('renders the function name, parameters and documentation', () => {
    const { container } = render(<ExpressionEditorSignature signature={signature} />);

    const panel = container.querySelector('[data-automation-id="msla-expression-editor-signature"]');
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain('concat');
    expect(panel?.textContent).toContain('text_1: string');
    expect(panel?.textContent).toContain('text_2: string');
    expect(panel?.textContent).toContain('Combines two or more strings.');
    // Active parameter documentation is shown for the second (active) parameter.
    expect(panel?.textContent).toContain('text_2: Second string.');
  });

  it('returns null when the definition has no signatures', () => {
    const noSignatures: SignatureInfo = {
      ...signature,
      definition: { ...signature.definition, signatures: [] },
    };
    const { container } = render(<ExpressionEditorSignature signature={noSignatures} />);
    expect(container.firstChild).toBeNull();
  });
});
