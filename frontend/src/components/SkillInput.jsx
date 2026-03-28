import { useState } from 'react'

const CATS = ['Programming','Design','Data & Analytics','Languages','Music & Arts','Business','Other']

export default function SkillInput({ label, skills, onChange, variant = 'teach' }) {
  const [name, setName]   = useState('')
  const [cat,  setCat]    = useState('Programming')

  const add = () => {
    const t = name.trim()
    if (!t || skills.some(s => s.name.toLowerCase() === t.toLowerCase())) return
    onChange([...skills, { name: t, category: cat, level: 'intermediate' }])
    setName('')
  }
  const remove = i => onChange(skills.filter((_, idx) => idx !== i))

  const tagCls = variant === 'teach' ? 'tag-teach' : 'tag-learn'

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="section-label">{label}</label>}
      <div className="flex gap-2 flex-wrap">
        <input
          className="input flex-1 min-w-40"
          placeholder="e.g. Python, Figma, Spanish…"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <select
          className="input w-auto shrink-0"
          value={cat}
          onChange={e => setCat(e.target.value)}
        >
          {CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <button type="button" onClick={add} className="btn btn-primary btn-sm shrink-0">
          Add
        </button>
      </div>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {skills.map((s, i) => (
            <span key={i} className={`${tagCls} flex items-center gap-1.5`}>
              {s.name}
              <button type="button" onClick={() => remove(i)}
                className="opacity-60 hover:opacity-100 leading-none text-base">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
