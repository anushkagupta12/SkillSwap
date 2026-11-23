// Illustrative profiles for the landing page. They are EXAMPLES, not real members, and the UI
// labels them as such. Names are deliberately not the ones used in the seed script.
export const DEMO_A = {
  initials: 'AM',
  name: 'Alex Morgan',
  role: 'UX designer',
  color: 'bg-sage-pale text-sage-dark',
  teaches: ['Figma', 'UI Design', 'Design Systems'],
  learns: ['Python', 'Data Visualization'],
}

export const DEMO_B = {
  initials: 'JR',
  name: 'Jordan Reyes',
  role: 'Backend developer',
  color: 'bg-violet-pale text-violet',
  teaches: ['Python', 'Django', 'MongoDB'],
  learns: ['Figma', 'UI Design'],
}

export const DEMO_COMMUNITY = [
  { ...DEMO_A, bio: 'Designs mobile-first products and wants to learn data skills to back up design decisions with evidence.' },
  { ...DEMO_B, bio: 'Builds APIs for a living and wants a better design eye to work more smoothly with product teams.' },
  {
    initials: 'SK', name: 'Sam Kim', role: 'Data analyst', color: 'bg-amber-pale text-amber',
    bio: 'Turns spreadsheets into dashboards and wants to learn React to build custom ones.',
    teaches: ['Tableau', 'Power BI', 'SQL'], learns: ['React', 'JavaScript'],
  },
]

export const DEMO_CHAT = [
  { from: 'them', text: 'Hi! Excited to start our swap. When can we do the first Figma session?', time: '10:12' },
  { from: 'me', text: 'How about Tuesday? You could walk me through Python on Thursday.', time: '10:15' },
  { from: 'them', text: 'Perfect. I will share a starter notebook before then.', time: '10:18' },
]

// Display metadata for the category cards. Learner counts are NOT here: they come from /api/stats.
export const CATEGORY_CARDS = [
  { key: 'Programming', icon: '💻', name: 'Programming & Dev', tags: ['Python', 'React', 'Node.js', 'SQL'], cls: 'tag-match' },
  { key: 'Design', icon: '🎨', name: 'Design & Creative', tags: ['Figma', 'Illustration', 'Branding'], cls: 'tag-teach' },
  { key: 'Data & Analytics', icon: '📊', name: 'Data & Analytics', tags: ['Tableau', 'Power BI', 'ML'], cls: 'tag-learn' },
  { key: 'Languages', icon: '🗣️', name: 'Languages', tags: ['Spanish', 'French', 'Japanese'], cls: 'tag-teach' },
  { key: 'Music & Arts', icon: '🎸', name: 'Music & Arts', tags: ['Guitar', 'Piano', 'Theory'], cls: 'tag-match' },
  { key: 'Business', icon: '📈', name: 'Business', tags: ['Marketing', 'SEO', 'Finance'], cls: 'tag-learn' },
]
