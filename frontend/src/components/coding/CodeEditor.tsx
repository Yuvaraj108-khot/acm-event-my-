import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string | undefined) => void;
}

export function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={onChange}
      theme="vs-dark"
      options={{
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        lineNumbersMinChars: 3,
        padding: { top: 14, bottom: 14 },
        tabSize: 4,
        insertSpaces: true,
        renderWhitespace: 'selection',
        smoothScrolling: true,
        cursorBlinking: 'phase',
        bracketPairColorization: { enabled: true },
        suggest: { showKeywords: true },
      }}
    />
  );
}
