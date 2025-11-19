import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateMessageId,
  createMessage,
  getLanguageFromFilename,
  formatCodeContent,
  createArtifactMessage,
  createGroupedArtifactMessage,
} from './messageUtils';

describe('messageUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateMessageId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with expected GUID format', () => {
      const id = generateMessageId();
      // Expect format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      // where x is any hex digit and y is 8, 9, a, or b
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  describe('createMessage', () => {
    it('should create a user message with correct properties', () => {
      const content = 'Hello, world!';
      const message = createMessage(content, 'user');

      expect(message).toMatchObject({
        content,
        sender: 'user',
        status: 'sending',
      });
      expect(message.id).toBeTruthy();
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it('should create an assistant message with correct properties', () => {
      const content = 'Hello, human!';
      const message = createMessage(content, 'assistant');

      expect(message).toMatchObject({
        content,
        sender: 'assistant',
        status: 'sent',
      });
    });

    it('should include attachments when provided', () => {
      const attachments = [
        { id: '1', name: 'file.txt', type: 'text/plain', size: 100, status: 'uploaded' as const },
      ];
      const message = createMessage('Message with attachment', 'user', attachments);

      expect(message.attachments).toEqual(attachments);
    });
  });

  describe('getLanguageFromFilename', () => {
    it('should return correct language for common extensions', () => {
      expect(getLanguageFromFilename('file.js')).toBe('javascript');
      expect(getLanguageFromFilename('file.ts')).toBe('typescript');
      expect(getLanguageFromFilename('file.py')).toBe('python');
      expect(getLanguageFromFilename('file.java')).toBe('java');
      expect(getLanguageFromFilename('file.cs')).toBe('csharp');
    });

    it('should handle uppercase extensions', () => {
      expect(getLanguageFromFilename('FILE.JS')).toBe('javascript');
      expect(getLanguageFromFilename('Script.PY')).toBe('python');
    });

    it('should return empty string for unknown extensions', () => {
      expect(getLanguageFromFilename('file.xyz')).toBe('');
      expect(getLanguageFromFilename('file')).toBe('');
    });

    it('should handle files with multiple dots', () => {
      expect(getLanguageFromFilename('my.component.test.ts')).toBe('typescript');
      expect(getLanguageFromFilename('config.prod.json')).toBe('json');
    });
  });

  describe('formatCodeContent', () => {
    it('should format code content with language tag', () => {
      const content = 'console.log("Hello");';
      const result = formatCodeContent(content, 'script.js');

      expect(result).toBe('```javascript\nconsole.log("Hello");\n```');
    });

    it('should return content as-is for unknown file types', () => {
      const content = 'Some text content';
      const result = formatCodeContent(content, 'file.unknown');

      expect(result).toBe(content);
    });
  });

  describe('createArtifactMessage', () => {
    it('should create artifact message with code formatting', () => {
      const content = 'public class Main {}';
      const message = createArtifactMessage('Main.java', content);

      expect(message.content).toContain('**Main.java**');
      expect(message.content).toContain('```java');
      expect(message.content).toContain(content);
      expect(message.metadata).toEqual({
        isArtifact: true,
        artifactName: 'Main.java',
        rawContent: content,
        isCodeFile: true,
      });
    });

    it('should create artifact message without code formatting for non-code files', () => {
      const content = 'This is a text file';
      const message = createArtifactMessage('readme.txt', content);

      expect(message.content).toBe('**readme.txt**\n\nThis is a text file');
      expect(message.metadata).toEqual({
        isArtifact: true,
        artifactName: 'readme.txt',
        rawContent: content,
        isCodeFile: false,
      });
    });

    it('should have correct message properties', () => {
      const message = createArtifactMessage('test.py', 'print("test")');

      expect(message.sender).toBe('assistant');
      expect(message.status).toBe('sent');
      expect(message.id).toBeTruthy();
      expect(message.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('createGroupedArtifactMessage', () => {
    it('should create grouped artifact message for multiple files', () => {
      const artifacts = [
        { name: 'index.html', content: '<html></html>' },
        { name: 'style.css', content: 'body { margin: 0; }' },
        { name: 'script.js', content: 'console.log("test");' },
      ];

      const message = createGroupedArtifactMessage(artifacts);

      expect(message.content).toContain('**3 files generated**');
      expect(message.content).toContain('• index.html');
      expect(message.content).toContain('• style.css');
      expect(message.content).toContain('• script.js');
      expect(message.metadata).toEqual({
        isGroupedArtifact: true,
        artifacts: [
          { name: 'index.html', rawContent: '<html></html>', isCodeFile: true },
          { name: 'style.css', rawContent: 'body { margin: 0; }', isCodeFile: true },
          { name: 'script.js', rawContent: 'console.log("test");', isCodeFile: true },
        ],
      });
    });

    it('should handle artifacts with explicit isCodeFile property', () => {
      const artifacts = [
        { name: 'code.js', content: 'const x = 1;', isCodeFile: true },
        { name: 'readme.txt', content: 'Hello', isCodeFile: false },
      ];

      const message = createGroupedArtifactMessage(artifacts);

      expect(message.metadata?.artifacts).toEqual([
        { name: 'code.js', rawContent: 'const x = 1;', isCodeFile: true },
        { name: 'readme.txt', rawContent: 'Hello', isCodeFile: false },
      ]);
    });

    it('should have correct message properties', () => {
      const message = createGroupedArtifactMessage([{ name: 'test.txt', content: 'test' }]);

      expect(message.sender).toBe('assistant');
      expect(message.status).toBe('sent');
      expect(message.id).toBeTruthy();
      expect(message.timestamp).toBeInstanceOf(Date);
    });
  });
});
