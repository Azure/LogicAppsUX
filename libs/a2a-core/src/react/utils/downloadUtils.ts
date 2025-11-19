/**
 * Utility functions for downloading artifacts as files
 */

/**
 * Downloads content as a file with the specified filename
 * @param content - The content to download
 * @param filename - The name of the file to save as
 * @param mimeType - The MIME type of the file (optional)
 */
export function downloadFile(content: string, filename: string, mimeType?: string) {
  // Create a Blob from the content
  const blob = new Blob([content], { type: mimeType || 'text/plain' });

  // Create a temporary URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Gets the appropriate MIME type based on file extension
 * @param filename - The filename to extract extension from
 * @returns The MIME type string
 */
export function getMimeType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    // Text files
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',

    // Code files
    js: 'text/javascript',
    jsx: 'text/javascript',
    ts: 'text/typescript',
    tsx: 'text/typescript',
    py: 'text/x-python',
    java: 'text/x-java',
    c: 'text/x-c',
    cpp: 'text/x-c++',
    cs: 'text/x-csharp',
    rb: 'text/x-ruby',
    go: 'text/x-go',
    rs: 'text/x-rust',
    php: 'text/x-php',
    swift: 'text/x-swift',
    kt: 'text/x-kotlin',
    scala: 'text/x-scala',
    r: 'text/x-r',
    sh: 'text/x-shellscript',
    bash: 'text/x-shellscript',
    zsh: 'text/x-shellscript',
    fish: 'text/x-shellscript',
    ps1: 'text/x-powershell',
    bat: 'text/x-batch',

    // Web files
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    scss: 'text/x-scss',
    sass: 'text/x-sass',
    less: 'text/x-less',

    // Data files
    json: 'application/json',
    xml: 'text/xml',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    toml: 'text/x-toml',
    ini: 'text/x-ini',
    conf: 'text/x-properties',
    properties: 'text/x-properties',

    // Documentation
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    // Other
    sql: 'text/x-sql',
    dockerfile: 'text/x-dockerfile',
    makefile: 'text/x-makefile',
    rakefile: 'text/x-ruby',
    gemfile: 'text/x-ruby',
    gitignore: 'text/plain',
    env: 'text/plain',
  };

  return mimeTypes[extension || ''] || 'text/plain';
}
