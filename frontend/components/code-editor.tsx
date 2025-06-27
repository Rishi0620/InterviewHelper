"use client"

import { useEffect, useRef } from "react"

interface CodeEditorProps {
  value: string
  onChange: (value: string | undefined) => void
  language: string
  onLanguageChange: (language: string) => void
}

export function CodeEditor({ value, onChange, language, onLanguageChange }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const monacoRef = useRef<any>(null) // type as any to avoid import at top

  useEffect(() => {
    let monaco: typeof import("monaco-editor")
    let editorInstance: any

    if (typeof window === "undefined") return // Only run on client

    let disposed = false

    import("monaco-editor").then((m) => {
      if (disposed) return
      monaco = m

      monaco.editor.defineTheme("interview-theme", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "6a9955", fontStyle: "italic" },
          { token: "keyword", foreground: "569cd6", fontStyle: "bold" },
          { token: "string", foreground: "ce9178" },
          { token: "number", foreground: "b5cea8" },
          { token: "function", foreground: "dcdcaa" },
          { token: "variable", foreground: "9cdcfe" },
        ],
        colors: {
          "editor.background": "#1e293b",
          "editor.foreground": "#e2e8f0",
          "editor.lineHighlightBackground": "#334155",
          "editor.selectionBackground": "#3b82f6",
          "editorCursor.foreground": "#60a5fa",
          "editorCursor.background": "#1e293b",
          "editorLineNumber.foreground": "#64748b",
          "editorLineNumber.activeForeground": "#94a3b8",
          "editorWidget.background": "#1e293b",
          "editorWidget.border": "#1e293b",
          "editor.focusedStackFrameHighlightBackground": "#1e293b",
          "editor.lineHighlightBorder": "#1e293b",
          "editor.selectionHighlightBackground": "#334155",
          "editorWhitespace.foreground": "#334155",
          "editorGutter.background": "#1e293b",
          "editorOverviewRuler.border": "#1e293b",
          "editorSuggestWidget.background": "#1e293b",
          "editorSuggestWidget.border": "#334155",
          "editorSuggestWidget.selectedBackground": "#334155",
          "editorSuggestWidget.highlightForeground": "#3b82f6",
          "editor.selectionHighlightBorder": "#1e293b",
          "editorBracketMatch.background": "#334155",
          "editorBracketMatch.border": "#3b82f6",
          "editor.focusBorder": "#3b82f6",
          "editorIndentGuide.background": "#334155",
          "editorIndentGuide.activeBackground": "#475569",
        },
      })

      if (editorRef.current && !monacoRef.current) {
        editorInstance = monaco.editor.create(editorRef.current, {
          value,
          language,
          theme: "interview-theme",
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: '"Fira Code", "JetBrains Mono", "SF Mono", Consolas, monospace',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: "bounded",
          wordWrapColumn: 80,
          wrappingIndent: "indent",
          wrappingStrategy: "advanced",
          lineNumbers: "on",
          glyphMargin: false,
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          renderLineHighlight: "line",
          contextmenu: true,
          mouseWheelZoom: true,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          cursorWidth: 2,
          cursorStyle: "line",
          selectOnLineNumbers: true,
          selectionClipboard: false,
          readOnly: false,
          domReadOnly: false,
          mouseStyle: "default",
          disableLayerHinting: false,
          disableMonospaceOptimizations: false,
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          autoSurround: "languageDefined",
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          scrollbar: {
            vertical: "visible",
            horizontal: "visible",
            verticalScrollbarSize: 12,
            horizontalScrollbarSize: 12,
            alwaysConsumeMouseWheel: false,
          },
        })

        monacoRef.current = editorInstance

        editorInstance.onDidChangeModelContent(() => {
          const currentValue = editorInstance.getValue()
          onChange(currentValue)
        })

        setTimeout(() => {
          if (editorInstance) {
            editorInstance.focus()
          }
        }, 100)

        monaco.editor.setTheme("interview-theme")
      }
    })

    return () => {
      disposed = true
      if (monacoRef.current) {
        const model = monacoRef.current.getModel()
        monacoRef.current.dispose()
        if (model) {
          model.dispose()
        }
        monacoRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (monacoRef.current && monacoRef.current.getValue() !== value) {
      const currentPosition = monacoRef.current.getPosition()
      monacoRef.current.setValue(value)
      if (currentPosition) {
        const model = monacoRef.current.getModel()
        if (model) {
          const lineCount = model.getLineCount()
          const validPosition = {
            lineNumber: Math.min(currentPosition.lineNumber, lineCount),
            column: Math.min(
              currentPosition.column,
              model.getLineMaxColumn(Math.min(currentPosition.lineNumber, lineCount)),
            ),
          }
          monacoRef.current.setPosition(validPosition)
        }
      }
    }
  }, [value])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (monacoRef.current) {
      const model = monacoRef.current.getModel()
      if (model) {
        import("monaco-editor").then((monaco) => {
          try {
            monaco.editor.setModelLanguage(model, language)
          } catch (error) {
            const currentValue = monacoRef.current.getValue()
            const currentPosition = monacoRef.current.getPosition()
            const newModel = monaco.editor.createModel(currentValue, language)
            monacoRef.current.setModel(newModel)
            if (currentPosition) {
              monacoRef.current.setPosition(currentPosition)
            }
          }
        })
      }
    }
  }, [language])

  return (
    <div className="relative">
      <style>
        {`
          .custom-monaco-editor-container {
            background: #1e293b;
            padding: 0;
            border-radius: 0;
            box-sizing: border-box;
            height: 600px;
            min-height: 600px;
            max-height: 600px;
            width: 100%;
            max-width: 100%;
            overflow: hidden;
            position: relative;
          }
          .custom-monaco-editor-container .monaco-editor,
          .custom-monaco-editor-container .monaco-editor-background,
          .custom-monaco-editor-container .monaco-editor .margin,
          .custom-monaco-editor-container .monaco-editor .monaco-editor-background {
            background: #1e293b !important;
          }
          .custom-monaco-editor-container .monaco-editor .overflow-guard {
            border-radius: 0;
          }
          .custom-monaco-editor-container .monaco-editor .monaco-scrollable-element > .scrollbar > .slider {
            background: rgba(148, 163, 184, 0.3) !important;
          }
          .custom-monaco-editor-container .monaco-editor .monaco-scrollable-element > .scrollbar > .slider:hover {
            background: rgba(148, 163, 184, 0.6) !important;
          }
          .custom-monaco-editor-container .monaco-editor .cursor {
            background: #60a5fa !important;
            border-left: 2px solid #60a5fa !important;
            opacity: 1 !important;
            width: 2px !important;
          }
          .custom-monaco-editor-container .monaco-editor .cursors-layer .cursor {
            background: #60a5fa !important;
            border-left: 2px solid #60a5fa !important;
            opacity: 1 !important;
          }
          .custom-monaco-editor-container .monaco-editor .cursors-layer .cursor.cursor-blink {
            animation: monaco-cursor-smooth-blink 1.2s ease-in-out infinite !important;
          }
          @keyframes monaco-cursor-smooth-blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.2; }
          }
          .custom-monaco-editor-container .monaco-editor {
            pointer-events: auto !important;
          }
          .custom-monaco-editor-container .monaco-editor .view-lines {
            pointer-events: auto !important;
          }
        `}
      </style>
      <div
        ref={editorRef}
        className="custom-monaco-editor-container"
        onClick={() => {
          if (monacoRef.current) {
            monacoRef.current.focus()
          }
        }}
      />
    </div>
  )
}
