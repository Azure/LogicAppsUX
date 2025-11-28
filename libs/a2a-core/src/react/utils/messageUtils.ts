import type { Message, Attachment } from '../types';

export function generateMessageId(): string {
  // Generate a UUID v4 format GUID similar to C# Guid.NewGuid()
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where x is any hexadecimal digit and y is one of 8, 9, a, or b

  const hex = '0123456789abcdef';
  let guid = '';

  // Generate random bytes
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);

  // Set version (4) and variant bits
  randomBytes[6]! = (randomBytes[6]! & 0x0f) | 0x40; // Version 4
  randomBytes[8]! = (randomBytes[8]! & 0x3f) | 0x80; // Variant 10

  // Convert to hex string with proper formatting
  for (let i = 0; i < 16; i++) {
    if (i === 4 || i === 6 || i === 8 || i === 10) {
      guid += '-';
    }
    const byte = randomBytes[i]!;
    guid += hex[byte >> 4]! + hex[byte & 0x0f]!;
  }

  return guid;
}

export function createMessage(
  content: string,
  sender: 'user' | 'assistant' | 'system',
  attachments?: Attachment[]
): Message {
  const message: Message = {
    id: generateMessageId(),
    content,
    sender,
    timestamp: new Date(),
    status: sender === 'user' ? 'sending' : 'sent',
  };

  if (attachments !== undefined) {
    message.attachments = attachments;
  }

  return message;
}

export function getLanguageFromFilename(filename: string): string {
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
}

export function formatCodeContent(content: string, filename: string): string {
  const language = getLanguageFromFilename(filename);
  if (language) {
    return `\`\`\`${language}\n${content}\n\`\`\``;
  }
  return content;
}

export function createArtifactMessage(artifactName: string, content: string): Message {
  const isCodeFile =
    /\.(cs|js|ts|tsx|jsx|py|java|cpp|c|h|rb|go|rs|php|swift|kt|scala|r|sql|sh|bash|ps1|yaml|yml|json|xml|html|css|scss|sass|less|md)$/.test(
      artifactName
    );
  const formattedContent = isCodeFile ? formatCodeContent(content, artifactName) : content;

  return {
    id: generateMessageId(),
    content: `**${artifactName}**\n\n${formattedContent}`,
    sender: 'assistant',
    timestamp: new Date(),
    status: 'sent',
    metadata: {
      isArtifact: true,
      artifactName,
      rawContent: content,
      isCodeFile,
    },
  };
}

export interface ArtifactData {
  name: string;
  content: string;
  isCodeFile?: boolean;
}

export function createGroupedArtifactMessage(artifacts: ArtifactData[]): Message {
  // Format content for display (just a summary)
  const content = `**${artifacts.length} files generated**\n\n${artifacts.map((a) => `• ${a.name}`).join('\n')}`;

  return {
    id: generateMessageId(),
    content,
    sender: 'assistant',
    timestamp: new Date(),
    status: 'sent',
    metadata: {
      isGroupedArtifact: true,
      artifacts: artifacts.map((artifact) => ({
        name: artifact.name,
        rawContent: artifact.content,
        isCodeFile:
          artifact.isCodeFile ??
          /\.(cs|js|ts|tsx|jsx|py|java|cpp|c|h|rb|go|rs|php|swift|kt|scala|r|sql|sh|bash|ps1|yaml|yml|json|xml|html|css|scss|sass|less|md)$/.test(
            artifact.name
          ),
      })),
    },
  };
}
