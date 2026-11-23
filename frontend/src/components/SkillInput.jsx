import { useId, useState } from 'react'
import { CATEGORIES, LEVELS } from '../lib/constants'

export default function SkillInput({ label, skills, onChange, variant = 'teach' }) {
  const base = useId()
  const [name, setName] = useState('')
  const [cat, setCat] = useState('Programming')
  const [level, setLevel] = useState('intermediate')

  const add = () => {
    const t = name.trim()
    if (!t || skills.some((s) => s.name.toLowerCase() === t.toLowerCase())) return
    onChange([...skills, { name: t, category: cat, level }])
    setName('')
  }
  const remove = (i) => onChange(skills.filter((_, idx) => idx !== i))

  const tagCls = variant === 'teach' ? 'tag-teach' : 'tag-learn'

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={`${base}-name`} className="section-label">
          {label}
        </label>
      )}
      <div className="flex gap-2 flex-wrap">
        <input
          id={`${base}-name`}
          className="input flex-1 min-w-40"
          placeholder="e.g. Python, Figma, Spanish…"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <select
          aria-label="Category"
          className="input w-auto shrink-0"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Skill level"
          className="input w-auto shrink-0 capitalize"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <button type="button" onClick={add} className="btn btn-primary btn-sm shrink-0">
          Add
        </button>
      </div>
      {skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Added skills">
          {skills.map((s, i) => (
            <li key={`${s.name}-${i}`} className={`${tagCls} flex items-center gap-1.5`}>
              <span>{s.name}</span>
              <span className="opacity-60 text-[10px] capitalize">· {s.level}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${s.name}`}
                className="opacity-60 hover:opacity-100 leading-none text-base"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
