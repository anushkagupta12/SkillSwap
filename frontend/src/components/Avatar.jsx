import clsx from 'clsx'

const sizes = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
}

export default function Avatar({ user, size = 'md', className = '' }) {
  const color = user?.avatarColor || 'emerald'
  return (
    <div className={clsx(
      'rounded-full flex items-center justify-center font-semibold font-sans shrink-0',
      `avatar-${color}`,
      sizes[size],
      className
    )}>
      {user?.initials || user?.name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}
