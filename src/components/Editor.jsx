import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Code, Sparkles,
  Wand2, AlignLeft, List, Loader2, CheckSquare, ChevronDown
} from 'lucide-react'
import { MermaidExtension } from './MermaidExtension'

// ── Slash command definitions ──────────────────────────────────────────────────
const SLASH_COMMANDS = [
  { id: 'h1',      icon: 'H1',  label: 'Heading 1',   hint: 'Big section heading',    action: e => e.chain().focus().setParagraph().toggleHeading({ level: 1 }).run() },
  { id: 'h2',      icon: 'H2',  label: 'Heading 2',   hint: 'Medium heading',         action: e => e.chain().focus().setParagraph().toggleHeading({ level: 2 }).run() },
  { id: 'h3',      icon: 'H3',  label: 'Heading 3',   hint: 'Small heading',          action: e => e.chain().focus().setParagraph().toggleHeading({ level: 3 }).run() },
  { id: 'todo',    icon: '☑',   label: 'To-do',       hint: 'Trackable checklist',    action: e => e.chain().focus().toggleTaskList().run() },
  { id: 'bullet',  icon: '•',   label: 'Bullet list', hint: 'Unordered list',         action: e => e.chain().focus().toggleBulletList().run() },
  { id: 'num',     icon: '1.',  label: 'Numbered',    hint: 'Ordered list',           action: e => e.chain().focus().toggleOrderedList().run() },
  { id: 'quote',   icon: '❝',   label: 'Quote',       hint: 'Blockquote',             action: e => e.chain().focus().toggleBlockquote().run() },
  { id: 'code',    icon: '</>',  label: 'Code block',  hint: 'Monospace code',         action: e => e.chain().focus().toggleCodeBlock().run() },
  { id: 'divider', icon: '—',   label: 'Divider',     hint: 'Horizontal separator',   action: e => e.chain().focus().setHorizontalRule().run() },
  { id: 'diagram', icon: '◇',   label: 'Diagram',     hint: 'Mermaid flowchart',      action: e => e.chain().focus().insertContent({ type: 'mermaid', attrs: { code: 'graph TD\n    A[Start] --> B[End]' } }).run() },
  { id: 'ai',      icon: '✦',   label: 'AI Write…',   hint: 'Generate with AI',       action: null },
]

const TEXT_SIZES = [
  { label: 'Heading 1', action: e => e.chain().focus().setParagraph().toggleHeading({ level: 1 }).run(), isActive: e => e.isActive('heading', { level: 1 }) },
  { label: 'Heading 2', action: e => e.chain().focus().setParagraph().toggleHeading({ level: 2 }).run(), isActive: e => e.isActive('heading', { level: 2 }) },
  { label: 'Heading 3', action: e => e.chain().focus().setParagraph().toggleHeading({ level: 3 }).run(), isActive: e => e.isActive('heading', { level: 3 }) },
  { label: 'Regular',   action: e => e.chain().focus().setParagraph().run(),                             isActive: e => e.isActive('paragraph') },
]

const FONTS = [
  { label: 'Default',  value: null },
  { label: 'Serif',    value: "'Lora', Georgia, serif" },
  { label: 'Mono',     value: "'JetBrains Mono', 'Fira Code', monospace" },
]

const COLORS = [
  { label: 'Default', value: null },
  { label: 'Slate',   value: '#475569' },
  { label: 'Violet',  value: '#7c3aed' },
  { label: 'Blue',    value: '#2563eb' },
  { label: 'Green',   value: '#16a34a' },
  { label: 'Red',     value: '#dc2626' },
  { label: 'Orange',  value: '#ea580c' },
  { label: 'Pink',    value: '#db2777' },
]

// ── Divider ───────────────────────────────────────────────────────────────────
function Sep() {
  return <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0" />
}

// ── Formatting Bubble ─────────────────────────────────────────────────────────
function FormattingBubble({ editor, onAITransform, aiLoading }) {
  const [showSizes, setShowSizes] = useState(false)
  const [showFonts, setShowFonts] = useState(false)
  const [showColors, setShowColors] = useState(false)

  const activeSize = TEXT_SIZES.find(s => s.isActive(editor))
  const activeFont = FONTS.find(f => f.value && editor.isActive('textStyle', { fontFamily: f.value }))

  function closeAll() { setShowSizes(false); setShowFonts(false); setShowColors(false) }

  function toggleDropdown(name) {
    setShowSizes(name === 'sizes' ? s => !s : false)
    setShowFonts(name === 'fonts' ? s => !s : false)
    setShowColors(name === 'colors' ? s => !s : false)
  }

  return (
    <div className="relative select-none" onMouseDown={e => e.preventDefault()}>
      <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-2xl shadow-slate-200/80 text-slate-700">

        {/* Text size */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('sizes')}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg hover:bg-slate-50 text-xs font-semibold transition-colors min-w-[64px]"
          >
            <span className="truncate">{activeSize?.label || 'Regular'}</span>
            <ChevronDown size={10} className="text-slate-400 shrink-0" />
          </button>
          {showSizes && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 min-w-[120px]">
              {TEXT_SIZES.map(s => (
                <button key={s.label} onClick={() => { s.action(editor); closeAll() }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-violet-50 hover:text-violet-700 transition-colors rounded-lg ${s.isActive(editor) ? 'text-violet-700 bg-violet-50' : 'text-slate-700'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Sep />

        {/* Font family */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('fonts')}
            className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            <span>{activeFont?.label || 'Default'}</span>
            <ChevronDown size={10} className="text-slate-400 shrink-0" />
          </button>
          {showFonts && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 min-w-[110px]">
              {FONTS.map(f => (
                <button key={f.label}
                  onClick={() => {
                    if (f.value) editor.chain().focus().setFontFamily(f.value).run()
                    else editor.chain().focus().unsetFontFamily().run()
                    closeAll()
                  }}
                  style={{ fontFamily: f.value || 'inherit' }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-violet-50 hover:text-violet-700 transition-colors rounded-lg ${(!f.value && !activeFont) || (activeFont?.value === f.value) ? 'text-violet-700 bg-violet-50' : 'text-slate-700'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Sep />

        {/* Bold / Italic / Underline */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-lg transition-colors font-bold text-sm ${editor.isActive('bold') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
        >B</button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg transition-colors italic text-sm ${editor.isActive('italic') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
        >I</button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded-lg transition-colors underline text-sm ${editor.isActive('underline') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
        >U</button>

        <Sep />

        {/* Bullet / Todo */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
          className={`p-1.5 rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
        >
          <List size={13} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="To-do list"
          className={`p-1.5 rounded-lg transition-colors ${editor.isActive('taskList') ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
        >
          <CheckSquare size={13} />
        </button>

        <Sep />

        {/* Color swatches */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('colors')}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
            title="Text color"
          >
            <span className="w-3.5 h-3.5 rounded-sm border border-slate-200" style={{
              backgroundColor: COLORS.slice(1).find(c => editor.isActive('textStyle', { color: c.value }))?.value || 'transparent',
              borderColor: COLORS.slice(1).find(c => editor.isActive('textStyle', { color: c.value })) ? 'transparent' : undefined,
            }} />
            <span className="text-xs font-bold leading-none" style={{ color: COLORS.slice(1).find(c => editor.isActive('textStyle', { color: c.value }))?.value || 'currentColor' }}>A</span>
            <ChevronDown size={10} className="text-slate-400" />
          </button>
          {showColors && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50">
              <div className="grid grid-cols-4 gap-1">
                {COLORS.map(c => (
                  <button
                    key={c.label}
                    title={c.label}
                    onClick={() => {
                      if (c.value) editor.chain().focus().setColor(c.value).run()
                      else editor.chain().focus().unsetColor().run()
                      closeAll()
                    }}
                    className="w-6 h-6 rounded-lg border-2 transition-all hover:scale-110"
                    style={{
                      backgroundColor: c.value || '#f8fafc',
                      borderColor: editor.isActive('textStyle', { color: c.value }) ? '#7c3aed' : 'transparent',
                      boxShadow: !c.value ? 'inset 0 0 0 1px #e2e8f0' : undefined,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <Sep />

        {/* AI actions */}
        {aiLoading ? (
          <div className="flex items-center gap-1 px-2 text-violet-600 text-xs font-medium">
            <Loader2 size={12} className="animate-spin" /> Writing…
          </div>
        ) : (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onAITransform('improve')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors whitespace-nowrap"
            >
              <Sparkles size={11} /> Improve
            </button>
            <button
              onClick={() => onAITransform('shorten')}
              className="flex items-center gap-1 px-1.5 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors whitespace-nowrap"
            >
              Shorter
            </button>
            <button
              onClick={() => onAITransform('bullet')}
              className="flex items-center gap-1 px-1.5 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors whitespace-nowrap"
            >
              List
            </button>
          </div>
        )}
      </div>

      {/* Click outside to close dropdowns */}
      {(showSizes || showFonts || showColors) && (
        <div className="fixed inset-0 z-40" onMouseDown={closeAll} />
      )}
    </div>
  )
}

// ── SlashMenu ─────────────────────────────────────────────────────────────────
function SlashMenu({ query, pos, onSelect, onClose, onAI, editor }) {
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAI, setShowAI] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const inputRef = useRef(null)
  const menuRef = useRef(null)
  const filtered = SLASH_COMMANDS.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) || c.id.startsWith(query.toLowerCase())
  )
  const [selectedIdx, setSelectedIdx] = useState(0)

  useEffect(() => {
    if (showAI && inputRef.current) inputRef.current.focus()
  }, [showAI])

  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  useEffect(() => {
    function handleKey(e) {
      if (!menuRef.current) return
      if (e.key === 'Escape') { onClose(); return }
      if (showAI) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') { e.preventDefault(); handleSelect(filtered[selectedIdx]) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [filtered, selectedIdx, showAI, onClose])

  function handleSelect(cmd) {
    if (!cmd) return
    if (cmd.id === 'ai') { setShowAI(true); return }
    onSelect(cmd)
  }

  async function handleAISubmit() {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    try {
      await onAI(aiPrompt.trim())
      onClose()
    } finally {
      setAiLoading(false)
    }
  }

  const style = {
    position: 'fixed',
    left: Math.min(pos.left, window.innerWidth - 280),
    top: pos.bottom + 6,
    zIndex: 9999,
  }

  return (
    <div
      ref={menuRef}
      style={style}
      className="w-64 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden py-1"
    >
      {showAI ? (
        <div className="p-2">
          <p className="text-xs text-slate-400 px-2 pb-1">What should AI write?</p>
          <div className="flex gap-1">
            <input
              ref={inputRef}
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAISubmit(); if (e.key === 'Escape') onClose() }}
              placeholder="e.g. a weekly plan…"
              className="flex-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-violet-400"
            />
            <button
              onClick={handleAISubmit}
              disabled={aiLoading}
              className="px-2.5 py-1.5 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : '↵'}
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-3 text-sm text-slate-400">No commands match</p>
      ) : (
        filtered.map((cmd, i) => (
          <button
            key={cmd.id}
            onClick={() => handleSelect(cmd)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              i === selectedIdx ? 'bg-violet-50 text-violet-700' : 'hover:bg-slate-50 text-slate-700'
            }`}
          >
            <span className="w-8 h-8 flex items-center justify-center text-sm font-bold bg-slate-100 rounded-lg shrink-0 font-mono">
              {cmd.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{cmd.label}</p>
              <p className="text-xs text-slate-400 truncate">{cmd.hint}</p>
            </div>
          </button>
        ))
      )}
    </div>
  )
}

// ── Main Editor ───────────────────────────────────────────────────────────────
export default function Editor({ content, onChange, placeholder = 'Start writing, or type / for commands…', readOnly = false, docContext = '' }) {
  const [slash, setSlash] = useState({ open: false, pos: null, query: '', deleteFrom: 0, deleteTo: 0 })
  const [aiLoading, setAiLoading] = useState(false)
  const [toolbar, setToolbar] = useState({ show: false, x: 0, y: 0 })
  const slashRef = useRef(slash)
  const toolbarRef = useRef(null)
  slashRef.current = slash

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
      Typography,
      Link.configure({ openOnClick: false }),
      MermaidExtension,
      Underline,
      TextStyle,
      Color,
      FontFamily,
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange && onChange(editor.getJSON())
      checkSlash(editor)
    },
    onSelectionUpdate: ({ editor }) => {
      if (readOnly) return
      const { from, to } = editor.state.selection
      if (from === to || editor.isActive('mermaid')) {
        setToolbar(t => ({ ...t, show: false }))
        return
      }
      // Position above the selection midpoint
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      setToolbar({ show: true, x: rect.left + rect.width / 2, y: rect.top })
    },
    onBlur: () => {
      // Only hide if focus moved outside the toolbar
      setTimeout(() => {
        if (toolbarRef.current && toolbarRef.current.contains(document.activeElement)) return
        setToolbar(t => ({ ...t, show: false }))
      }, 100)
    },
    editorProps: { attributes: { spellcheck: 'true' } },
  })

  useEffect(() => {
    if (!editor || !content) return
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content, false)
    }
  }, [content]) // eslint-disable-line

  function checkSlash(ed) {
    const { state } = ed
    const { from } = state.selection
    const $pos = state.doc.resolve(from)
    const nodeBefore = $pos.nodeBefore
    const text = nodeBefore?.text || ''
    const match = text.match(/(\/\w*)$/)

    if (match) {
      const coords = ed.view.coordsAtPos(from)
      const deleteFrom = from - match[1].length
      setSlash({ open: true, pos: { left: coords.left, bottom: coords.bottom }, query: match[1].slice(1), deleteFrom, deleteTo: from })
    } else {
      setSlash(s => ({ ...s, open: false }))
    }
  }

  const applySlashCommand = useCallback((cmd) => {
    if (!editor) return
    const s = slashRef.current
    editor.chain().focus().deleteRange({ from: s.deleteFrom, to: s.deleteTo }).run()
    cmd.action(editor)
    setSlash(prev => ({ ...prev, open: false }))
  }, [editor])

  const handleSlashAI = useCallback(async (prompt) => {
    if (!editor) return
    const s = slashRef.current
    editor.chain().focus().deleteRange({ from: s.deleteFrom, to: s.deleteTo }).run()
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'generate', prompt, context: docContext }),
      })
      const data = await res.json()
      if (data.content) {
        editor.chain().focus().insertContent(markdownToTiptap(data.content)).run()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }, [editor, docContext])

  const handleBubbleAI = useCallback(async (action) => {
    if (!editor) return
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, '\n')
    if (!selectedText) return
    setToolbar(t => ({ ...t, show: false }))
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'transform', prompt: action, context: selectedText }),
      })
      const data = await res.json()
      if (data.content) {
        if (action === 'diagram') {
          editor.chain().focus().deleteRange({ from, to })
            .insertContent({ type: 'mermaid', attrs: { code: data.content } })
            .run()
        } else {
          editor.chain().focus().deleteRange({ from, to })
            .insertContent(markdownToTiptap(data.content))
            .run()
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }, [editor])

  useEffect(() => {
    const handler = (e) => {
      if (toolbarRef.current?.contains(e.target)) return
      setSlash(s => ({ ...s, open: false }))
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!editor) return null

  // Clamp toolbar so it doesn't overflow viewport edges
  const toolbarWidth = 620
  const margin = 8
  const clampedX = Math.max(toolbarWidth / 2 + margin, Math.min(toolbar.x, window.innerWidth - toolbarWidth / 2 - margin))

  return (
    <div className="relative" onMouseDown={e => e.target.closest('.slash-menu') && e.stopPropagation()}>
      <EditorContent editor={editor} />

      {/* Floating formatting toolbar */}
      {!readOnly && toolbar.show && (
        <div
          ref={toolbarRef}
          style={{
            position: 'fixed',
            left: clampedX,
            top: toolbar.y - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
          }}
          onMouseDown={e => e.preventDefault()}
        >
          <FormattingBubble editor={editor} onAITransform={handleBubbleAI} aiLoading={aiLoading} />
        </div>
      )}

      {slash.open && (
        <div className="slash-menu">
          <SlashMenu
            query={slash.query}
            pos={slash.pos}
            editor={editor}
            onSelect={applySlashCommand}
            onClose={() => setSlash(s => ({ ...s, open: false }))}
            onAI={handleSlashAI}
          />
        </div>
      )}

      {aiLoading && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-violet-700 text-white px-4 py-2 rounded-full text-sm font-medium shadow-xl z-50">
          <Loader2 size={14} className="animate-spin" /> AI is writing…
        </div>
      )}
    </div>
  )
}

// ── Simple markdown → TipTap JSON converter ───────────────────────────────────
function markdownToTiptap(md) {
  const lines = md.split('\n')
  const nodes = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      let code = ''
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        code += (code ? '\n' : '') + lines[i]
        i++
      }
      nodes.push({ type: 'codeBlock', attrs: { language: lang || null }, content: [{ type: 'text', text: code }] })
      i++
      continue
    }

    if (line.startsWith('### ')) {
      nodes.push({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: line.slice(4) }] })
    } else if (line.startsWith('## ')) {
      nodes.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: line.slice(3) }] })
    } else if (line.startsWith('# ')) {
      nodes.push({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: line.slice(2) }] })
    } else if (line.startsWith('> ')) {
      nodes.push({ type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: line.slice(2) }] }] })
    } else if (line.match(/^- \[[ x]\] /)) {
      const checked = line[3] === 'x'
      const text = line.slice(6)
      nodes.push({ type: 'taskList', content: [{ type: 'taskItem', attrs: { checked }, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }] })
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      nodes.push({ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: line.slice(2) }] }] }] })
    } else if (line.match(/^\d+\. /)) {
      const text = line.replace(/^\d+\. /, '')
      nodes.push({ type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }] })
    } else if (line === '---' || line === '***') {
      nodes.push({ type: 'horizontalRule' })
    } else if (line.trim() === '') {
      // skip
    } else {
      nodes.push({ type: 'paragraph', content: parseInline(line) })
    }
    i++
  }

  return { type: 'doc', content: nodes.length ? nodes : [{ type: 'paragraph' }] }
}

function parseInline(text) {
  const parts = []
  let remaining = text
  const patterns = [
    { re: /\*\*(.+?)\*\*/, mark: 'bold' },
    { re: /\*(.+?)\*/, mark: 'italic' },
    { re: /`(.+?)`/, mark: 'code' },
  ]

  while (remaining.length > 0) {
    let earliest = null
    let earliestIdx = Infinity

    for (const p of patterns) {
      const m = remaining.match(p.re)
      if (m && m.index < earliestIdx) {
        earliest = { ...p, match: m }
        earliestIdx = m.index
      }
    }

    if (!earliest) {
      parts.push({ type: 'text', text: remaining })
      break
    }

    if (earliestIdx > 0) {
      parts.push({ type: 'text', text: remaining.slice(0, earliestIdx) })
    }
    parts.push({ type: 'text', text: earliest.match[1], marks: [{ type: earliest.mark }] })
    remaining = remaining.slice(earliestIdx + earliest.match[0].length)
  }

  return parts.length ? parts : [{ type: 'text', text: '' }]
}
