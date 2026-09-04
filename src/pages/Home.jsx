import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Calendar, LogIn, LogOut, Trash2, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, parseISO } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { signInWithGoogle, signOut, createDoc, deleteDocById, subscribeDocs } from '../services/firebase'

function MiniCalendar({ diaryDates, onDateClick, selectedDate }) {
  const [viewMonth, setViewMonth] = useState(new Date())
  const start = startOfMonth(viewMonth)
  const end = endOfMonth(viewMonth)
  const days = eachDayOfInterval({ start, end })
  const startPad = start.getDay()

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setViewMonth(m => subMonths(m, 1))} className="p-1 hover:bg-slate-200/60 rounded-lg transition-colors">
          <ChevronLeft size={14} className="text-slate-400" />
        </button>
        <span className="text-xs font-semibold text-slate-600">{format(viewMonth, 'MMM yyyy')}</span>
        <button onClick={() => setViewMonth(m => addMonths(m, 1))} className="p-1 hover:bg-slate-200/60 rounded-lg transition-colors">
          <ChevronRight size={14} className="text-slate-400" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-slate-400 font-medium py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array(startPad).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const hasDiary = diaryDates.includes(dateStr)
          const isSelected = selectedDate === dateStr
          const todayDay = isToday(day)
          return (
            <button
              key={dateStr}
              onClick={() => onDateClick(dateStr)}
              className={`w-full aspect-square flex items-center justify-center text-[11px] rounded-lg transition-colors relative font-medium
                ${isSelected ? 'bg-violet-600 text-white' : todayDay ? 'bg-violet-100 text-violet-700' : 'hover:bg-slate-200/60 text-slate-600'}`}
            >
              {format(day, 'd')}
              {hasDiary && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Home() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [docs, setDocs] = useState([])
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [activeSection, setActiveSection] = useState('docs')
  const [docError, setDocError] = useState(null)

  useEffect(() => {
    if (!user) return
    const unsub = subscribeDocs(user.uid, setDocs)
    return unsub
  }, [user])

  async function handleNewDoc() {
    if (!user) { await signInWithGoogle(); return }
    try {
      setDocError(null)
      const id = await createDoc(user.uid, { title: 'Untitled', type: 'doc' })
      navigate(`/doc/${id}`)
    } catch (err) {
      setDocError(err.message || 'Failed to create page')
    }
  }

  async function handleDiaryDate(dateStr) {
    if (!user) { await signInWithGoogle(); return }
    setSelectedDate(dateStr)
    try {
      setDocError(null)
      const existing = docs.find(d => d.type === 'diary' && d.date === dateStr)
      if (existing) {
        navigate(`/doc/${existing.id}`)
      } else {
        const title = format(parseISO(dateStr), 'EEEE, MMMM d, yyyy')
        const id = await createDoc(user.uid, { title, type: 'diary', date: dateStr })
        navigate(`/doc/${id}`)
      }
    } catch (err) {
      setDocError(err.message || 'Failed to open diary')
    }
  }

  async function handleDelete(e, doc) {
    e.stopPropagation()
    if (!confirm(`Delete "${doc.title}"?`)) return
    await deleteDocById(user.uid, doc.id)
  }

  function docPreview(doc) {
    try {
      const c = doc.content
      if (!c?.content) return ''
      for (const node of c.content) {
        if (node.content) {
          const text = node.content.map(n => n.text || '').join('')
          if (text.trim()) return text.slice(0, 80)
        }
      }
    } catch { /* empty */ }
    return ''
  }

  const regularDocs = docs.filter(d => d.type === 'doc')
  const diaryDocs = docs.filter(d => d.type === 'diary')
  const diaryDates = diaryDocs.map(d => d.date).filter(Boolean)

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F7F6F3]">
        <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F7F6F3] flex flex-col" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <header className="px-5 py-3.5 flex items-center gap-3 border-b border-slate-200/60 bg-[#F7F6F3]">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <BookOpen size={14} className="text-white" />
          </div>
          <span className="font-bold text-slate-800 text-base tracking-tight">Paper</span>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {user.photoURL && <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />}
              <button onClick={signOut} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors">
                <LogOut size={13} /> Sign out
              </button>
            </>
          ) : (
            <button onClick={signInWithGoogle} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-violet-700 font-medium transition-colors">
              <LogIn size={14} /> Sign in
            </button>
          )}
        </div>
      </header>

      {docError && (
        <div className="px-5 py-2 bg-red-50 border-b border-red-100 text-red-600 text-xs flex items-center justify-between">
          <span>{docError}</span>
          <button onClick={() => setDocError(null)} className="ml-3 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 border-r border-slate-200/60 bg-[#EEECEA] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-3">
            <button
              onClick={handleNewDoc}
              className="w-full flex items-center gap-2 px-3 py-2 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-200 text-slate-700 hover:text-violet-700 text-sm font-medium rounded-xl transition-all shadow-sm"
            >
              <Plus size={15} /> New page
            </button>
          </div>

          <div className="flex gap-1 px-3 mb-2">
            {[{ id: 'docs', label: 'Pages', icon: FileText }, { id: 'diary', label: 'Diary', icon: Calendar }].map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeSection === s.id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <s.icon size={11} /> {s.label}
              </button>
            ))}
          </div>

          {activeSection === 'docs' ? (
            <nav className="flex-1 px-2 pb-4">
              {regularDocs.length === 0 ? (
                <p className="text-xs text-slate-400 px-3 py-2 italic">No pages yet.</p>
              ) : regularDocs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => navigate(`/doc/${doc.id}`)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/80 group flex items-start gap-2 transition-colors mb-0.5"
                >
                  <FileText size={12} className="text-slate-400 mt-1 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate leading-tight">{doc.title || 'Untitled'}</p>
                    <p className="text-xs text-slate-400 truncate">{docPreview(doc)}</p>
                  </div>
                  <button onClick={e => handleDelete(e, doc)} className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-400 transition-all shrink-0 mt-1">
                    <Trash2 size={11} />
                  </button>
                </button>
              ))}
            </nav>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="px-3 mb-2">
                <button
                  onClick={() => handleDiaryDate(format(new Date(), 'yyyy-MM-dd'))}
                  className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Calendar size={12} /> Today's entry
                </button>
              </div>
              <MiniCalendar diaryDates={diaryDates} onDateClick={handleDiaryDate} selectedDate={selectedDate} />
              <div className="px-2 pb-4">
                {diaryDocs.slice(0, 10).map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => navigate(`/doc/${doc.id}`)}
                    className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-white/70 flex items-center gap-2 transition-colors mb-0.5"
                  >
                    <span className="text-xs text-slate-400 shrink-0 w-12 text-right font-medium">
                      {doc.date ? format(parseISO(doc.date), 'MMM d') : ''}
                    </span>
                    <span className="text-xs text-slate-600 truncate">{docPreview(doc) || '(empty)'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main landing */}
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-xs">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-slate-100/80">
              <BookOpen size={26} className="text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight" style={{ fontFamily: "'Lora', Georgia, serif" }}>
              {user ? 'Good to see you' : 'Welcome to Paper'}
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              {user
                ? "Pick a page from the sidebar, open today's diary, or start fresh."
                : 'A calm place to write, think, and organize. No clutter — just paper.'}
            </p>
            {!user ? (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors mx-auto text-sm"
              >
                <LogIn size={14} /> Sign in with Google
              </button>
            ) : (
              <div className="flex gap-2 justify-center">
                <button onClick={handleNewDoc} className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors">
                  <Plus size={14} /> New page
                </button>
                <button onClick={() => handleDiaryDate(format(new Date(), 'yyyy-MM-dd'))} className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors">
                  <Calendar size={14} /> Today
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
