import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { useState, useEffect, useCallback } from 'react'
import { Code2, Eye, Trash2 } from 'lucide-react'

let mermaidCounter = 0

function MermaidView({ node, updateAttributes, deleteNode }) {
  const [code, setCode] = useState(node.attrs.code || 'graph TD\n    A[Start] --> B[End]')
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('preview') // 'edit' | 'preview'
  const id = `mermaid-${++mermaidCounter}`

  const render = useCallback(async (src) => {
    try {
      const { default: mermaid } = await import('mermaid')
      mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose', fontFamily: 'Inter, system-ui, sans-serif' })
      const uid = `mermaid-render-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const { svg: rendered } = await mermaid.render(uid, src)
      setSvg(rendered)
      setError(null)
    } catch (e) {
      setError(e.message?.split('\n')[0] || 'Diagram error')
    }
  }, [])

  useEffect(() => { render(code) }, [code, render])

  const handleCodeChange = (e) => {
    const val = e.target.value
    setCode(val)
    updateAttributes({ code: val })
  }

  return (
    <NodeViewWrapper>
      <div
        className="mermaid-node-wrapper my-4 rounded-xl border border-slate-200 overflow-hidden bg-white"
        contentEditable={false}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200">
          <span className="text-xs text-slate-400 font-medium flex-1">Diagram</span>
          <button
            onClick={() => setMode(m => m === 'edit' ? 'preview' : 'edit')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              mode === 'edit' ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {mode === 'edit' ? <><Eye size={12} /> Preview</> : <><Code2 size={12} /> Edit</>}
          </button>
          <button
            onClick={deleteNode}
            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Edit mode */}
        {mode === 'edit' && (
          <textarea
            value={code}
            onChange={handleCodeChange}
            spellCheck={false}
            className="w-full p-3 text-sm font-mono bg-white outline-none resize-none text-slate-700 leading-relaxed"
            style={{ minHeight: 120 }}
            placeholder="graph TD&#10;    A[Start] --> B[End]"
          />
        )}

        {/* Preview mode */}
        {mode === 'preview' && (
          <div
            className="p-4 flex items-center justify-center cursor-pointer group"
            onClick={() => setMode('edit')}
          >
            {svg && !error && (
              <div
                dangerouslySetInnerHTML={{ __html: svg }}
                className="max-w-full overflow-auto"
              />
            )}
            {error && (
              <div className="text-red-500 text-sm font-mono bg-red-50 p-3 rounded w-full">
                {error}
              </div>
            )}
            {!svg && !error && (
              <div className="text-slate-400 text-sm">Rendering…</div>
            )}
            <p className="absolute bottom-2 right-3 text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
              click to edit
            </p>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export const MermaidExtension = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      code: { default: 'graph TD\n    A[Start] --> B[End]' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-mermaid]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-mermaid': node.attrs.code })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidView)
  },
})
