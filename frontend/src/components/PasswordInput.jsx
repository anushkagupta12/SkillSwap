import { useState } from 'react'

/**
 * Password field with a Show/Hide toggle. Accepts every normal <input> prop.
 * `label` is only used for the toggle's accessible name ("Show confirm password").
 */
export default function PasswordInput({ label = 'password', className = '', ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`input pr-16 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={`${visible ? 'Hide' : 'Show'} ${label}`}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 px-4 text-xs font-medium text-ink-3 hover:text-ink rounded-r-xl"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
