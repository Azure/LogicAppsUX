/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadFile, getMimeType } from './downloadUtils';

describe('downloadUtils', () => {
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let clickMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock URL methods
    createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    // Mock DOM methods
    clickMock = vi.fn();
    const mockLink = {
      href: '',
      download: '',
      click: clickMock,
    };

    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any) as any;
    appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(() => mockLink as any) as any;
    removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation(() => mockLink as any) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('downloadFile', () => {
    it('should create a blob and trigger download', () => {
      const content = 'Hello, World!';
      const filename = 'test.txt';

      downloadFile(content, filename);

      // Check blob creation
      expect(createObjectURLMock).toHaveBeenCalledWith(
        expect.objectContaining({
          size: content.length,
          type: 'text/plain',
        })
      );

      // Check link creation and properties
      expect(createElementSpy).toHaveBeenCalledWith('a');
      const link = createElementSpy.mock.results[0].value;
      expect(link.href).toBe('blob:mock-url');
      expect(link.download).toBe('test.txt');

      // Check DOM manipulation
      expect(appendChildSpy).toHaveBeenCalledWith(link);
      expect(clickMock).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(link);

      // Check cleanup
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should use provided MIME type', () => {
      const content = 'const x = 1;';
      const filename = 'script.js';
      const mimeType = 'text/javascript';

      downloadFile(content, filename, mimeType);

      expect(createObjectURLMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text/javascript',
        })
      );
    });

    it('should default to text/plain when no MIME type provided', () => {
      downloadFile('content', 'file.unknown');

      expect(createObjectURLMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text/plain',
        })
      );
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types for text files', () => {
      expect(getMimeType('file.txt')).toBe('text/plain');
      expect(getMimeType('README.md')).toBe('text/markdown');
      expect(getMimeType('data.csv')).toBe('text/csv');
    });

    it('should return correct MIME types for code files', () => {
      expect(getMimeType('script.js')).toBe('text/javascript');
      expect(getMimeType('component.jsx')).toBe('text/javascript');
      expect(getMimeType('types.ts')).toBe('text/typescript');
      expect(getMimeType('App.tsx')).toBe('text/typescript');
      expect(getMimeType('main.py')).toBe('text/x-python');
      expect(getMimeType('Main.java')).toBe('text/x-java');
      expect(getMimeType('program.c')).toBe('text/x-c');
      expect(getMimeType('program.cpp')).toBe('text/x-c++');
      expect(getMimeType('Program.cs')).toBe('text/x-csharp');
      expect(getMimeType('app.rb')).toBe('text/x-ruby');
      expect(getMimeType('main.go')).toBe('text/x-go');
      expect(getMimeType('lib.rs')).toBe('text/x-rust');
      expect(getMimeType('index.php')).toBe('text/x-php');
      expect(getMimeType('App.swift')).toBe('text/x-swift');
      expect(getMimeType('Main.kt')).toBe('text/x-kotlin');
      expect(getMimeType('Main.scala')).toBe('text/x-scala');
      expect(getMimeType('analysis.r')).toBe('text/x-r');
      expect(getMimeType('script.sh')).toBe('text/x-shellscript');
      expect(getMimeType('script.bash')).toBe('text/x-shellscript');
      expect(getMimeType('script.ps1')).toBe('text/x-powershell');
      expect(getMimeType('build.bat')).toBe('text/x-batch');
    });

    it('should return correct MIME types for web files', () => {
      expect(getMimeType('index.html')).toBe('text/html');
      expect(getMimeType('page.htm')).toBe('text/html');
      expect(getMimeType('styles.css')).toBe('text/css');
      expect(getMimeType('styles.scss')).toBe('text/x-scss');
      expect(getMimeType('styles.sass')).toBe('text/x-sass');
      expect(getMimeType('styles.less')).toBe('text/x-less');
    });

    it('should return correct MIME types for data files', () => {
      expect(getMimeType('data.json')).toBe('application/json');
      expect(getMimeType('config.xml')).toBe('text/xml');
      expect(getMimeType('config.yaml')).toBe('text/yaml');
      expect(getMimeType('config.yml')).toBe('text/yaml');
      expect(getMimeType('Cargo.toml')).toBe('text/x-toml');
      expect(getMimeType('config.ini')).toBe('text/x-ini');
      expect(getMimeType('app.conf')).toBe('text/x-properties');
      expect(getMimeType('application.properties')).toBe('text/x-properties');
    });

    it('should return correct MIME types for other files', () => {
      expect(getMimeType('query.sql')).toBe('text/x-sql');
      expect(getMimeType('Dockerfile')).toBe('text/x-dockerfile');
      expect(getMimeType('Makefile')).toBe('text/x-makefile');
      expect(getMimeType('Rakefile')).toBe('text/x-ruby');
      expect(getMimeType('Gemfile')).toBe('text/x-ruby');
      expect(getMimeType('.gitignore')).toBe('text/plain');
      expect(getMimeType('.env')).toBe('text/plain');
    });

    it('should handle case-insensitive extensions', () => {
      expect(getMimeType('Script.JS')).toBe('text/javascript');
      expect(getMimeType('STYLES.CSS')).toBe('text/css');
      expect(getMimeType('Data.JSON')).toBe('application/json');
    });

    it('should return text/plain for unknown extensions', () => {
      expect(getMimeType('file.unknown')).toBe('text/plain');
      expect(getMimeType('file.xyz')).toBe('text/plain');
      expect(getMimeType('file')).toBe('text/plain');
    });

    it('should handle files with multiple dots', () => {
      expect(getMimeType('my.component.test.js')).toBe('text/javascript');
      expect(getMimeType('app.module.css')).toBe('text/css');
      expect(getMimeType('data.backup.json')).toBe('application/json');
    });

    it('should handle files without extensions', () => {
      expect(getMimeType('README')).toBe('text/plain');
      expect(getMimeType('LICENSE')).toBe('text/plain');
    });
  });
});
