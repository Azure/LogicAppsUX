type DocEntry = {
  title: string;
  description: string;
  parameters: Array<{ name: string; type: string; text: string }>;
  example: string;
};

const DOCS: Record<string, DocEntry> = {
  setName: {
    title: 'setName Function',
    description: "Updates the person's name with the provided values.",
    parameters: [
      { name: 'firstName', type: 'string', text: 'The first name of the person' },
      { name: 'lastName', type: 'string', text: 'The last name of the person' },
    ],
    example: 'setName("John", "Doe")',
  },
  setLastName: {
    title: 'setLastName Function',
    description: "Updates only the person's last name while keeping the first name unchanged.",
    parameters: [{ name: 'lastName', type: 'string', text: 'The last name of the person' }],
    example: 'setLastName("Smith")',
  },
  setAge: {
    title: 'setAge Function',
    description: 'Sets the age of the person.',
    parameters: [{ name: 'age', type: 'number', text: 'The numeric age of the person' }],
    example: 'setAge(25)',
  },
  greet: {
    title: 'greet Function',
    description: 'Returns a personalized greeting.',
    parameters: [
      { name: 'greeting', type: 'string', text: 'Greeting phrase (e.g. "Hello")' },
      { name: 'punctuation', type: 'string', text: 'Optional punctuation (e.g. "!")' },
    ],
    example: 'greet("Hello", "!")',
  },
};

export type DocumentationProps = {
  functionName?: string;
  // Optional: override styles if needed
  style?: React.CSSProperties;
};

export const LanguageServerConnectionView: React.FC<DocumentationProps> = ({ functionName }) => {
  const doc = functionName ? DOCS[functionName] : undefined;

  const baseStyles: React.CSSProperties = {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: 20,
  };

  const CodeInline: React.FC<React.PropsWithChildren> = ({ children }) => (
    <code
      style={{
        background: '#f5f5f5',
        padding: '2px 4px',
        borderRadius: 3,
      }}
    >
      {children}
    </code>
  );

  const PreBlock: React.FC<React.PropsWithChildren> = ({ children }) => (
    <pre
      style={{
        background: '#f8f8f8',
        padding: 10,
        borderRadius: 5,
        overflowX: 'auto',
        marginTop: 8,
      }}
    >
      <code>{children}</code>
    </pre>
  );

  if (!doc) {
    return (
      <div style={baseStyles}>
        <h1 style={{ color: '#007acc' }}>Documentation not found</h1>
        <p>No documentation available for this function.</p>
      </div>
    );
  }

  return (
    <div style={baseStyles}>
      <h1 style={{ color: '#007acc' }}>{doc.title}</h1>
      <p>
        <strong>{doc.description}</strong>
      </p>

      <h2 style={{ color: '#333', marginTop: 20 }}>Parameters</h2>
      <ul style={{ paddingLeft: 20 }}>
        {doc.parameters.map((p) => (
          <li key={p.name} style={{ margin: '5px 0' }}>
            <CodeInline>{p.name}</CodeInline> ({p.type}) – {p.text}
          </li>
        ))}
      </ul>

      <h2 style={{ color: '#333', marginTop: 20 }}>Example</h2>
      <PreBlock>{doc.example}</PreBlock>
    </div>
  );
};

/* Example usage:
<Documentation functionName="setName" />
*/
