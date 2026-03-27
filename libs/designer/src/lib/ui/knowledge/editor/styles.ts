import { makeStyles, tokens } from '@fluentui/react-components';

export const useKnowledgeStyles = makeStyles({
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalM,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  sectionLabel: {
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
  },
  link: {
    paddingLeft: tokens.spacingHorizontalXS,
    fontSize: tokens.fontSizeBase200,
    fontStyle: 'italic',
  },
  sectionContent: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: tokens.spacingVerticalXS,
  },
  createButton: {
    minWidth: '80px',
    width: '15%',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
  },
  sourcesRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
  },
  uploadButton: {
    marginTop: tokens.spacingVerticalXL,
  },
  optionRoot: {
    width: '100%',
  },
  optionContainer: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: '-28px',
  },
  artifactsList: {
    padding: '6px 0 0 4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '4px',
    width: '90%',
  },
  artifactItem: {
    display: 'flex',
    paddingRight: '20px',
  },
  artifactName: {
    width: '80%',
    marginTop: '2px',
  },
  statusBadge: {
    height: '100%',
    padding: '2px',
  },
});

export const useConnectionStyles = makeStyles({
  root: {
    height: '100vh',
  },

  container: {
    padding: '10px',
  },

  content: {
    height: '79vh',
  },
});
