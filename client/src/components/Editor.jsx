import React from 'react';
import Editor from '@monaco-editor/react';

export default function CodeEditor({ code, onChange, language = "javascript" }) {
    return (
        <Editor
            height="100%"
            defaultLanguage={language}
            value={code}
            onChange={onChange}
            theme="vs-dark"
            options={{
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
            }}
        />
    );
}
