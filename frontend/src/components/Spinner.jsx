export default function Spinner({ className = '' }) {
  return (
    <div className={`w-8 h-8 border-2 border-canvas-3 border-t-sage-light rounded-full animate-spin ${className}`} />
  )
}
