import type { SignatureInfo } from '../editor/codemirror/languages/workflow/signature';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    margin: '4px 16px 8px',
    padding: '4px 8px',
    fontFamily: 'monospace',
    fontSize: '12px',
    lineHeight: '1.4',
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflowWrap: 'anywhere',
  },
  signatureLine: {
    color: tokens.colorNeutralForeground1,
  },
  functionName: {
    fontWeight: tokens.fontWeightSemibold,
  },
  param: {
    color: tokens.colorNeutralForeground2,
  },
  activeParam: {
    fontWeight: tokens.fontWeightSemibold,
    textDecorationLine: 'underline',
    color: tokens.colorNeutralForeground1,
  },
  documentation: {
    display: 'block',
    marginTop: '2px',
    color: tokens.colorNeutralForeground3,
  },
  paramDocumentation: {
    display: 'block',
    marginTop: '2px',
    fontStyle: 'italic',
    color: tokens.colorNeutralForeground2,
  },
});

export interface ExpressionEditorSignatureProps {
  signature: SignatureInfo;
}

/**
 * Renders function signature help for the expression editor as an in-flow panel
 * positioned below the editor box. Rendering it outside of the editor content
 * (rather than as a floating tooltip anchored at the cursor) ensures it never
 * overlaps the text being typed. See issue #9292.
 */
export const ExpressionEditorSignature = ({ signature }: ExpressionEditorSignatureProps): JSX.Element | null => {
  const styles = useStyles();
  const { definition, activeParameter } = signature;
  const signatureDetails = definition.signatures[0];

  if (!signatureDetails) {
    return null;
  }

  const { parameters } = signatureDetails;
  const activeParam = parameters[activeParameter];

  return (
    <div className={styles.container} data-automation-id="msla-expression-editor-signature" aria-live="polite">
      <div className={styles.signatureLine}>
        <span className={styles.functionName}>{definition.name}</span>
        {'('}
        {parameters.map((param, index) => (
          <span key={param.name}>
            <span className={mergeClasses(styles.param, index === activeParameter && styles.activeParam)}>
              {param.type ? `${param.name}: ${param.type}` : param.name}
            </span>
            {index < parameters.length - 1 ? ', ' : ''}
          </span>
        ))}
        {')'}
      </div>
      {signatureDetails.documentation ? <small className={styles.documentation}>{signatureDetails.documentation}</small> : null}
      {activeParam?.documentation ? (
        <em className={styles.paramDocumentation}>
          {activeParam.name}: {activeParam.documentation}
        </em>
      ) : null}
    </div>
  );
};
