import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Share2, BookOpen, CheckCircle, Loader2, Link2,
  FileText, Calendar, Users, X, Eye, Edit3, LogIn
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import {
  signInWithGoogle, getDocById, saveDoc, enableSharing, getSharedDoc, saveSectionByToken
} from '../services/firebase'
import Editor from '../components/Editor'

function SharePanel({ doc, uid, docId, onClose }) {
  const [sharing, setSharing] = useState(false)
  const [token, setToken] = useState(doc?.shareToken || null)
  const [editable, setEditable] = useState(doc?.shareEditable || false)
  const [copied, setCopied] = useState(false)

  async function handleShare(canEdit) {
    setSharing(true)
    try {
      const t = await enableSharing(uid, docId, canEdit)
      setToken(t)
      setEditable(canEdit)
    } finally {
      setSharing(false)
    }
  }

  const shareUrl = token ? `${window.location.origin}/shared/${token}` : null

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Users size={15} className="text-violet-500" /> Share document
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={15} />
          </button>
        </div>

        {!token ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500 mb-1">Create a shareable link:</p>
            <button onClick={() => handleShare(false)} disabled={sharing}
              className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              <Eye size={14} className="text-slate-400" /> View only
            </button>
            <button onClick={() => handleShare(true)} disabled={sharing}
              className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              <Edit3 size={14} className="text-violet-500" /> Can edit
            </button>
            {sharing && <Loader2 size={16} className="animate-spin text-violet-500 mx-auto mt-1" />}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${editable ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                {editable ? '✏️ Can edit' : '👁 View only'}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-3">
              <Link2 size={12} className="text-slate-400 shrink-0" />
              <span className="text-xs text-slate-600 truncate flex-1 font-mono">{shareUrl}</span>
            </div>
            <button onClick={copyLink}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              {copied ? <><CheckCircle size={14} /> Copied!</> : <><Link2 size={14} /> Copy link</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Doc({ shared = false }) {
  const { id: paramId, token: paramToken } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [doc, setDoc] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState(null)
  const [loadErr, setLoadErr] = useState(null)
  const [saveStatus, setSaveStatus] = useState('saved')
  const [showShare, setShowShare] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [isReadOnly, setIsReadOnly] = useState(shared)

  const saveTimerRef = useRef(null)
  const titleTimerRef = useRef(null)

  useEffect(() => {
    if (authLoading) return
    if (shared) {
      getSharedDoc(paramToken).then(d => {
        if (!d) { setLoadErr('Document not found or link expired.'); return }
        setDoc(d)
        setTitle(d.title || 'Untitled')
        setContent(d.content)
        setIsReadOnly(!d.editable)
      }).catch(() => setLoadErr('Failed to load shared document.'))
    } else {
      if (!user) return
      getDocById(user.uid, paramId).then(d => {
        if (!d) { setLoadErr('Document not found.'); return }
        setDoc(d)
        setTitle(d.title || 'Untitled')
        setContent(d.content)
      }).catch(() => setLoadErr('Failed to load document.'))
    }
  }, [user, authLoading, shared, paramId, paramToken]) // eslint-disable-line

  function countWords(json) {
    if (!json) return 0
    function traverse(node) {
      if (node.text) return node.text.split(/\s+/).filter(Boolean).length
      return (node.content || []).reduce((sum, n) => sum + traverse(n), 0)
    }
    return traverse(json)
  }

  const handleContentChange = useCallback((json) => {
    setContent(json)
    setWordCount(countWords(json))
    setSaveStatus('unsaved')
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        if (shared && doc?.editable) {
          await saveSectionByToken(paramToken, json)
        } else if (user && paramId) {
          await saveDoc(user.uid, paramId, { content: json })
        }
        setSaveStatus('saved')
      } catch {
        setSaveStatus('unsaved')
      }
    }, 1200)
  }, [user, paramId, shared, doc, paramToken])

  const handleTitleChange = useCallback((val) => {
    setTitle(val)
    clearTimeout(titleTimerRef.current)
    titleTimerRef.current = setTimeout(() => {
      if (user && paramId) saveDoc(user.uid, paramId, { title: val })
    }, 800)
  }, [user, paramId])

  function getDocContext() {
    if (!content) return ''
    function traverse(node) {
      if (node.text) return node.text
      return (node.content || []).map(traverse).join('\n')
    }
    return traverse(content).slice(0, 2000)
  }

  if (authLoading || (!doc && !loadErr)) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F7F6F3]">
        <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user && !shared) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F7F6F3]">
        <div className="text-center">
          <p className="text-slate-600 mb-4 text-sm">Sign in to view your documents</p>
          <button onClick={signInWithGoogle} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl font-medium text-sm mx-auto">
            <LogIn size={14} /> Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  if (loadErr) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F7F6F3]">
        <div className="text-center">
          <p className="text-red-500 mb-4 text-sm">{loadErr}</p>
          <button onClick={() => navigate('/')} className="text-violet-600 text-sm hover:underline">← Go home</button>
        </div>
      </div>
    )
  }

  const isDiary = doc?.type === 'diary'

  return (
    <div className="min-h-dvh bg-[#F7F6F3] flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[#F7F6F3]/95 backdrop-blur-sm border-b border-slate-200/40 px-4 py-2.5 flex items-center gap-3">
        {!shared && (
          <button onClick={() => navigate('/')} className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-500 transition-colors shrink-0">
            <ArrowLeft size={17} />
          </button>
        )}
        {shared && (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-6 h-6 bg-violet-600 rounded-md flex items-center justify-center">
              <BookOpen size={12} className="text-white" />
            </div>
            <span className="font-bold text-slate-700 text-sm">Paper</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isDiary ? <Calendar size={13} className="text-violet-400 shrink-0" /> : <FileText size={13} className="text-slate-400 shrink-0" />}
          <span className="text-slate-700 text-sm font-medium truncate">{title || 'Untitled'}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium ${saveStatus === 'saved' ? 'text-slate-300' : saveStatus === 'saving' ? 'text-violet-400' : 'text-amber-400'}`}>
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'unsaved' ? 'Unsaved' : ''}
          </span>
          <span className="text-xs text-slate-300 hidden sm:inline">{wordCount > 0 ? `${wordCount}w` : ''}</span>
          {!shared && user && (
            <button onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors">
              <Share2 size={12} /> Share
            </button>
          )}
          {shared && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              {isReadOnly ? <Eye size={11} /> : <Edit3 size={11} />}
              {isReadOnly ? 'View only' : 'Editing'}
            </span>
          )}
        </div>
      </header>

      {/* Document */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 sm:px-10 py-12 pb-40">
          {/* Title */}
          {isReadOnly ? (
            <h1 className="text-4xl font-bold text-slate-900 leading-tight mb-2 tracking-tight" style={{ fontFamily: "'Lora', Georgia, serif" }}>
              {title}
            </h1>
          ) : (
            <textarea
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder={isDiary ? format(new Date(), 'EEEE, MMMM d') : 'Untitled'}
              className="w-full text-4xl font-bold text-slate-900 leading-tight tracking-tight bg-transparent outline-none resize-none placeholder:text-slate-200 overflow-hidden"
              style={{ fontFamily: "'Lora', Georgia, serif", minHeight: '1.25em' }}
              rows={1}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
            />
          )}

          {isDiary && doc?.date && (
            <p className="text-slate-400 text-sm mb-10 font-medium mt-1">
              {format(parseISO(doc.date), 'EEEE, MMMM d, yyyy')}
            </p>
          )}
          {!isDiary && <div className="mb-10" />}

          {content !== null && (
            <Editor
              content={content}
              onChange={handleContentChange}
              placeholder={isDiary ? 'How did today go? What\'s on your mind…' : 'Start writing, or type / for commands…'}
              readOnly={isReadOnly}
              docContext={getDocContext()}
            />
          )}
        </div>
      </main>

      {showShare && <SharePanel doc={doc} uid={user?.uid} docId={paramId} onClose={() => setShowShare(false)} />}
    </div>
  )
}
