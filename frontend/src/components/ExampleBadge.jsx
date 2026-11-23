/** Marks illustrative content so nobody mistakes it for real members or real activity. */
export default function ExampleBadge({ children = 'Example' }) {
  return (
    <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-ink-3 bg-canvas-2 border border-canvas-3 px-2 py-0.5 rounded-full">
      {children}
    </span>
  )
}
