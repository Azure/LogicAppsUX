import React, { memo, useMemo, useState } from 'react';
import {
  Card,
  CardHeader,
  Button,
  Text,
  Caption1,
  tokens,
  makeStyles,
  shorthands,
  mergeClasses,
  Tooltip,
} from '@fluentui/react-components';
import {
  DocumentRegular,
  ArrowDownloadRegular,
  EyeRegular,
  EyeOffRegular,
  FolderRegular,
  DocumentMultipleRegular,
  ErrorCircleRegular,
  ArrowClockwiseRegular,
} from '@fluentui/react-icons';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import Prism from 'prismjs';
import { AuthenticationMessage } from './AuthenticationMessage';
import { CodeBlockHeader } from './CodeBlockHeader';
import { getUserFriendlyErrorMessage } from '../../utils/errorUtils';
import 'prismjs/themes/prism.css';
// Import all Prism language components
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-scss';

import type { Message as MessageType } from '../../types';
import { downloadFile, getMimeType } from '../../utils/downloadUtils';

// Configure marked with syntax highlighting and custom link renderer
marked.use(
  markedHighlight({
    langPrefix: 'language-',
    highlight(code, lang) {
      if (lang && Prism.languages[lang]) {
        try {
          return Prism.highlight(code, Prism.languages[lang], lang);
        } catch (err) {
          console.error('Prism highlight error:', err);
          return code;
        }
      }
      return code;
    },
  })
);

// Configure marked to open links in new tabs
marked.use({
  renderer: {
    link(href, title, text) {
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  },
});

const useStyles = makeStyles({
  '@keyframes fadeIn': {
    '0%': { opacity: 0, transform: 'translateY(10px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
  },
  messageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: tokens.spacingVerticalL,
    animationName: 'fadeIn',
    animationDuration: tokens.durationSlow,
    animationFillMode: 'both',
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageContainer: {
    maxWidth: '70%',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  messageContainerWithFiles: {
    maxWidth: '85%',
  },
  senderName: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
  },
  messageBubble: {
    position: 'relative',
  },
  userBubble: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
  },
  assistantBubble: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    boxShadow: tokens.shadow2,
  },
  messageTail: {
    position: 'absolute',
    top: '16px',
    left: '-6px',
    width: '0px',
    height: '0px',
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderWidth('8px', '8px', '8px', '0px'),
    ...shorthands.borderColor(
      'transparent',
      tokens.colorNeutralBackground1,
      'transparent',
      'transparent'
    ),
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '-8px',
      left: '-1px',
      width: '0px',
      height: '0px',
      ...shorthands.borderStyle('solid'),
      ...shorthands.borderWidth('8px', '8px', '8px', '0px'),
      ...shorthands.borderColor(
        'transparent',
        tokens.colorNeutralStroke1,
        'transparent',
        'transparent'
      ),
    },
  },
  metadata: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
    alignItems: 'center',
  },
  time: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase100,
  },
  textContent: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
  },
  markdownContent: {
    '& > *:first-child': {
      marginTop: 0,
    },
    '& > *:last-child': {
      marginBottom: 0,
    },
    '& p': {
      marginTop: tokens.spacingVerticalS,
      marginBottom: tokens.spacingVerticalS,
      fontSize: tokens.fontSizeBase300,
      lineHeight: tokens.lineHeightBase300,
    },
    '& ul, & ol': {
      paddingLeft: tokens.spacingHorizontalXL,
      marginTop: tokens.spacingVerticalS,
      marginBottom: tokens.spacingVerticalS,
    },
    '& code': {
      backgroundColor: tokens.colorNeutralBackground3,
      ...shorthands.padding('2px', '4px'),
      ...shorthands.borderRadius(tokens.borderRadiusSmall),
      fontSize: '0.9em',
      fontFamily: 'monospace',
    },
    '& pre': {
      backgroundColor: tokens.colorNeutralBackground3,
      ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
      ...shorthands.borderRadius(tokens.borderRadiusMedium),
      overflowX: 'auto',
      marginTop: tokens.spacingVerticalM,
      marginBottom: tokens.spacingVerticalM,
    },
    '& pre code': {
      backgroundColor: 'transparent',
      ...shorthands.padding(0),
      fontSize: tokens.fontSizeBase300,
    },
    '& blockquote': {
      ...shorthands.borderLeft('4px', 'solid', tokens.colorNeutralStroke1),
      ...shorthands.padding(0, 0, 0, tokens.spacingHorizontalL),
      marginLeft: 0,
      marginRight: 0,
      color: tokens.colorNeutralForeground3,
    },
  },
  artifactCard: {
    marginTop: tokens.spacingVerticalM,
  },
  artifactHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  artifactInfo: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  artifactActions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  artifactContent: {
    marginTop: tokens.spacingVerticalM,
  },
  codeBlock: {
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    overflowX: 'auto',
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase300,
  },
  codeBlockWrapper: {
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.overflow('hidden'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    marginTop: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalM,
  },
  codeBlockContent: {
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground3,
    overflowX: 'auto',
    '& pre': {
      margin: 0,
      padding: 0,
      backgroundColor: 'transparent',
      border: 'none',
    },
    '& code': {
      backgroundColor: 'transparent',
      padding: 0,
    },
  },
  groupedArtifactContainer: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(tokens.spacingVerticalM),
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorPaletteRedBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorPaletteRedBorder1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    marginTop: tokens.spacingVerticalS,
  },
  errorIcon: {
    color: tokens.colorPaletteRedForeground1,
    flexShrink: 0,
  },
  errorMessage: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase300,
    flex: 1,
  },
  retryButton: {
    flexShrink: 0,
  },
  groupedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalM,
  },
  artifactList: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  artifactItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  attachments: {
    marginTop: tokens.spacingVerticalM,
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  attachment: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  fileContainer: {
    marginTop: tokens.spacingVerticalM,
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
    width: '100%',
  },
  imageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
    width: '100%',
  },
  imageFileName: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    textAlign: 'center',
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
  },
  imageContainer: {
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.overflow('hidden'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground3,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalS),
    width: '100%',
  },
  image: {
    display: 'block',
    maxWidth: '600px',
    width: '100%',
    height: 'auto',
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
  },
  fileName: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXS,
  },
});

interface MessageProps {
  message: MessageType;
  agentName?: string;
  userName?: string;
  onAuthCompleted?: () => void;
  onAuthCanceled?: () => void;
  onRetry?: (messageId: string) => void;
}

function MessageComponent({
  message,
  agentName = 'Agent',
  userName = 'You',
  onAuthCompleted,
  onAuthCanceled,
  onRetry,
}: MessageProps) {
  const styles = useStyles();

  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const senderName = isUser ? userName : isSystem ? 'System' : agentName;
  const isArtifact = message.metadata?.isArtifact;
  const isGroupedArtifact = message.metadata?.isGroupedArtifact;
  const artifactName = message.metadata?.artifactName;
  const [showContent, setShowContent] = useState(!isArtifact && !isGroupedArtifact);
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState<number | null>(null);

  // If this is an authentication message, render it differently
  if (message.authEvent) {
    return (
      <div className={styles.messageWrapper}>
        <AuthenticationMessage
          authParts={message.authEvent.authParts}
          status={message.authEvent.status}
          onAuthenticate={() => {
            // When all services are authenticated, trigger the completion
            // We don't need to check the status here since onAuthenticate
            // is only called when all auth parts are successfully authenticated
            if (onAuthCompleted) {
              onAuthCompleted();
            }
          }}
          onCancel={onAuthCanceled}
        />
      </div>
    );
  }

  const handleDownload = (index?: number) => {
    if (isArtifact && artifactName) {
      const mimeType = getMimeType(artifactName);
      let contentToDownload = message.metadata?.rawContent;

      if (!contentToDownload) {
        const codeBlockMatch = message.content.match(/```[\w]*\n([\s\S]*?)\n```/);
        if (codeBlockMatch) {
          contentToDownload = codeBlockMatch[1];
        } else {
          contentToDownload = message.content.replace(/^\*\*.*?\*\*\n\n/, '');
        }
      }

      downloadFile(contentToDownload, artifactName, mimeType);
    } else if (isGroupedArtifact && typeof index === 'number') {
      const artifact = message.metadata?.artifacts?.[index];
      if (artifact) {
        const mimeType = getMimeType(artifact.name);
        downloadFile(artifact.rawContent, artifact.name, mimeType);
      }
    }
  };

  const handleDownloadAll = () => {
    if (isGroupedArtifact && message.metadata?.artifacts) {
      message.metadata.artifacts.forEach(
        (artifact: { name: string; rawContent: string }, index: number) => {
          setTimeout(() => {
            const mimeType = getMimeType(artifact.name);
            downloadFile(artifact.rawContent, artifact.name, mimeType);
          }, index * 100); // Small delay between downloads
        }
      );
    }
  };

  const toggleContent = () => {
    setShowContent(!showContent);
  };

  const renderContent = () => {
    if (isUser) {
      return <div className={styles.textContent}>{message.content}</div>;
    }

    if (isArtifact && message.metadata?.rawContent) {
      const language = getLanguageFromFilename(artifactName || '');
      if (message.metadata?.isCodeFile && language && Prism.languages[language]) {
        try {
          const highlighted = Prism.highlight(
            message.metadata.rawContent,
            Prism.languages[language],
            language
          );
          return (
            <div className={styles.codeBlockWrapper}>
              <CodeBlockHeader language={language} code={message.metadata.rawContent} />
              <div className={styles.codeBlockContent}>
                <pre>
                  <code
                    className={`language-${language}`}
                    dangerouslySetInnerHTML={{ __html: highlighted }}
                  />
                </pre>
              </div>
            </div>
          );
        } catch (err) {
          console.error('Prism highlight error:', err);
        }
      }
      return (
        <div className={styles.codeBlockWrapper}>
          <CodeBlockHeader language="" code={message.metadata.rawContent} />
          <div className={styles.codeBlockContent}>
            <pre>
              <code>{message.metadata.rawContent}</code>
            </pre>
          </div>
        </div>
      );
    }

    // For regular markdown content, we need to parse and render code blocks with headers
    const processedContent = useMemo(() => {
      // Extract code blocks and render them separately
      const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/g;
      let lastIndex = 0;
      const elements: React.ReactNode[] = [];
      let match;

      while ((match = codeBlockRegex.exec(message.content)) !== null) {
        // Add content before the code block
        if (match.index > lastIndex) {
          const textContent = message.content.slice(lastIndex, match.index);
          const html = marked.parse(textContent, { gfm: true, breaks: true }) as string;
          elements.push(
            <div key={`text-${lastIndex}`} dangerouslySetInnerHTML={{ __html: html }} />
          );
        }

        // Add the code block with header
        const language = match[1] || '';
        const code = match[2];
        let highlighted = code;

        if (language && Prism.languages[language]) {
          try {
            highlighted = Prism.highlight(code, Prism.languages[language], language);
          } catch (err) {
            console.error('Prism highlight error:', err);
          }
        }

        elements.push(
          <div key={`code-${match.index}`} className={styles.codeBlockWrapper}>
            <CodeBlockHeader language={language} code={code} />
            <div className={styles.codeBlockContent}>
              <pre>
                <code
                  className={language ? `language-${language}` : ''}
                  dangerouslySetInnerHTML={{ __html: highlighted }}
                />
              </pre>
            </div>
          </div>
        );

        lastIndex = match.index + match[0].length;
      }

      // Add any remaining content after the last code block
      if (lastIndex < message.content.length) {
        const remainingContent = message.content.slice(lastIndex);
        const html = marked.parse(remainingContent, { gfm: true, breaks: true }) as string;
        elements.push(<div key={`text-${lastIndex}`} dangerouslySetInnerHTML={{ __html: html }} />);
      }

      // If no code blocks were found, just return the parsed markdown
      if (elements.length === 0) {
        const html = marked.parse(message.content, { gfm: true, breaks: true }) as string;
        return <div dangerouslySetInnerHTML={{ __html: html }} />;
      }

      return <>{elements}</>;
    }, [message.content]);

    return <div className={styles.markdownContent}>{processedContent}</div>;
  };

  // Helper function to get language from filename
  const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      cs: 'csharp',
      cpp: 'cpp',
      c: 'c',
      h: 'c',
      hpp: 'cpp',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      r: 'r',
      sql: 'sql',
      sh: 'bash',
      bash: 'bash',
      ps1: 'powershell',
      yaml: 'yaml',
      yml: 'yaml',
      json: 'json',
      xml: 'xml',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      md: 'markdown',
    };
    return languageMap[ext || ''] || '';
  };

  return (
    <div
      className={mergeClasses(
        styles.messageWrapper,
        isUser ? styles.userMessage : styles.assistantMessage
      )}
    >
      <div
        className={mergeClasses(
          styles.messageContainer,
          message.files && message.files.length > 0 && styles.messageContainerWithFiles
        )}
      >
        <Text className={styles.senderName}>{senderName}</Text>
        <div className={styles.messageBubble}>
          <div className={isUser ? styles.userBubble : styles.assistantBubble}>
            {isGroupedArtifact && message.metadata?.artifacts ? (
              <div className={styles.groupedArtifactContainer}>
                <div className={styles.groupedHeader}>
                  <div className={styles.artifactInfo}>
                    <FolderRegular />
                    <Text weight="semibold">
                      {message.metadata.artifacts.length} files generated
                    </Text>
                  </div>
                  <Button
                    appearance="primary"
                    icon={<ArrowDownloadRegular />}
                    onClick={handleDownloadAll}
                  >
                    Download All
                  </Button>
                </div>
                <div className={styles.artifactList}>
                  {message.metadata.artifacts.map(
                    (
                      artifact: { name: string; rawContent: string; isCodeFile?: boolean },
                      index: number
                    ) => (
                      <div key={index} className={styles.artifactItem}>
                        <div className={styles.artifactInfo}>
                          <DocumentRegular />
                          <Text>{artifact.name}</Text>
                        </div>
                        <div className={styles.artifactActions}>
                          <Tooltip content={`Download ${artifact.name}`} relationship="label">
                            <Button
                              appearance="subtle"
                              icon={<ArrowDownloadRegular />}
                              onClick={() => handleDownload(index)}
                            />
                          </Tooltip>
                          <Tooltip
                            content={
                              selectedArtifactIndex === index ? 'Hide content' : 'View content'
                            }
                            relationship="label"
                          >
                            <Button
                              appearance="subtle"
                              icon={
                                selectedArtifactIndex === index ? <EyeOffRegular /> : <EyeRegular />
                              }
                              onClick={() =>
                                setSelectedArtifactIndex(
                                  selectedArtifactIndex === index ? null : index
                                )
                              }
                            />
                          </Tooltip>
                        </div>
                      </div>
                    )
                  )}
                </div>
                {selectedArtifactIndex !== null &&
                  message.metadata.artifacts[selectedArtifactIndex] && (
                    <div className={styles.artifactContent}>
                      {(() => {
                        const artifact = message.metadata.artifacts[selectedArtifactIndex];
                        const language = getLanguageFromFilename(artifact.name);
                        if (artifact.isCodeFile && language && Prism.languages[language]) {
                          try {
                            const highlighted = Prism.highlight(
                              artifact.rawContent,
                              Prism.languages[language],
                              language
                            );
                            return (
                              <div className={styles.codeBlockWrapper}>
                                <CodeBlockHeader language={language} code={artifact.rawContent} />
                                <div className={styles.codeBlockContent}>
                                  <pre>
                                    <code
                                      className={`language-${language}`}
                                      dangerouslySetInnerHTML={{ __html: highlighted }}
                                    />
                                  </pre>
                                </div>
                              </div>
                            );
                          } catch (err) {
                            console.error('Prism highlight error:', err);
                          }
                        }
                        return (
                          <div className={styles.codeBlockWrapper}>
                            <CodeBlockHeader language="" code={artifact.rawContent} />
                            <div className={styles.codeBlockContent}>
                              <pre>
                                <code>{artifact.rawContent}</code>
                              </pre>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
              </div>
            ) : isArtifact && artifactName ? (
              <Card className={styles.artifactCard}>
                <CardHeader
                  image={<DocumentRegular />}
                  header={<Text weight="semibold">{artifactName}</Text>}
                  action={
                    <div className={styles.artifactActions}>
                      <Button
                        appearance="primary"
                        size="small"
                        icon={<ArrowDownloadRegular />}
                        onClick={() => handleDownload()}
                      >
                        Download
                      </Button>
                      <Button
                        appearance="secondary"
                        size="small"
                        icon={showContent ? <EyeOffRegular /> : <EyeRegular />}
                        onClick={toggleContent}
                      >
                        {showContent ? 'Hide' : 'View'}
                      </Button>
                    </div>
                  }
                />
                {showContent && <div className={styles.artifactContent}>{renderContent()}</div>}
              </Card>
            ) : (
              renderContent()
            )}
            {message.files && message.files.length > 0 && (
              <div className={styles.fileContainer}>
                {message.files.map((file, index) => {
                  // Validate that mimeType is a safe image type
                  const allowedImageTypes = [
                    'image/png',
                    'image/jpeg',
                    'image/jpg',
                    'image/gif',
                    'image/webp',
                    'image/svg+xml',
                  ];
                  const isImage =
                    file.mimeType && allowedImageTypes.includes(file.mimeType.toLowerCase());

                  if (isImage) {
                    return (
                      <div key={index} className={styles.imageWrapper}>
                        {file.name && <div className={styles.imageFileName}>{file.name}</div>}
                        <div className={styles.imageContainer}>
                          <img
                            src={`data:${file.mimeType};base64,${file.data}`}
                            alt={file.name || 'Attached image'}
                            className={styles.image}
                          />
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div key={index} className={styles.attachment}>
                        <DocumentRegular fontSize={16} />
                        <Caption1>{file.name || 'Attached file'}</Caption1>
                      </div>
                    );
                  }
                })}
              </div>
            )}
            {message.attachments && message.attachments.length > 0 && (
              <div className={styles.attachments}>
                {message.attachments.map((attachment) => (
                  <div key={attachment.id} className={styles.attachment}>
                    <DocumentMultipleRegular fontSize={16} />
                    <Caption1>{attachment.name}</Caption1>
                    <Caption1>({formatFileSize(attachment.size)})</Caption1>
                  </div>
                ))}
              </div>
            )}
          </div>
          {!isUser && <div className={styles.messageTail} />}
        </div>
        {message.status === 'error' && (
          <div className={styles.errorBanner} role="alert" aria-live="polite">
            <ErrorCircleRegular className={styles.errorIcon} />
            <Text className={styles.errorMessage}>
              {message.error
                ? getUserFriendlyErrorMessage(message.error)
                : 'Failed to send message'}
            </Text>
            {onRetry && (
              <Button
                appearance="subtle"
                size="small"
                icon={<ArrowClockwiseRegular />}
                onClick={() => onRetry(message.id)}
                className={styles.retryButton}
                aria-label="Retry sending message"
              >
                Retry
              </Button>
            )}
          </div>
        )}
        <div className={styles.metadata}>
          <Caption1 className={styles.time}>{formatTime(message.timestamp)}</Caption1>
        </div>
      </div>
    </div>
  );
}

export const Message = memo(MessageComponent);

function formatTime(date: Date | string): string {
  // Handle both Date objects and date strings (from localStorage)
  const dateObject = date instanceof Date ? date : new Date(date);

  // Check if the date is valid
  if (isNaN(dateObject.getTime())) {
    return 'Invalid time';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dateObject);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
