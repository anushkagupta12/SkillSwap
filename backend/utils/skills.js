const { AppError } = require('./errors');

const SKILL_CATEGORIES = [
  'Programming',
  'Design',
  'Data & Analytics',
  'Languages',
  'Music & Arts',
  'Business',
  'Other',
];
const SKILL_LEVELS = ['beginner', 'intermediate', 'expert'];
const MAX_SKILLS = 30;
const MAX_SKILL_NAME = 40;

// Alias -> canonical normalized name. Keys must already be lowercase/trimmed.
const ALIASES = {
  js: 'javascript',
  'java script': 'javascript',
  ecmascript: 'javascript',
  ts: 'typescript',
  py: 'python',
  python3: 'python',
  'python 3': 'python',
  reactjs: 'react',
  'react.js': 'react',
  'react js': 'react',
  nodejs: 'node.js',
  node: 'node.js',
  'node js': 'node.js',
  golang: 'go',
  'c sharp': 'c#',
  csharp: 'c#',
  cpp: 'c++',
  postgres: 'postgresql',
  mongo: 'mongodb',
  k8s: 'kubernetes',
  html5: 'html',
  css3: 'css',
  ml: 'machine learning',
  powerbi: 'power bi',
  'data viz': 'data visualization',
  dataviz: 'data visualization',
  'ui/ux': 'ui/ux design',
  ux: 'ux design',
  ui: 'ui design',
};

/** Lowercase, trim, collapse whitespace, then apply the alias map. */
function normalizeSkillName(name) {
  const n = String(name ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return ALIASES[n] || n;
}

/**
 * Validates and normalizes a skills array coming from a client.
 * - returns undefined when the input is undefined (field not being updated)
 * - trims, dedupes (by normalized name), clamps category/level to known values
 */
function sanitizeSkills(input, field = 'skills') {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) throw new AppError(400, `${field} must be an array`);
  if (input.length > MAX_SKILLS) throw new AppError(400, `${field} can contain at most ${MAX_SKILLS} skills`);

  const seen = new Set();
  const out = [];
  for (const raw of input) {
    const item = typeof raw === 'string' ? { name: raw } : raw;
    if (!item || typeof item !== 'object' || typeof item.name !== 'string') {
      throw new AppError(400, `Each entry in ${field} needs a name`);
    }
    const name = item.name.trim().replace(/\s+/g, ' ');
    if (!name) continue;
    if (name.length > MAX_SKILL_NAME) {
      throw new AppError(400, `Skill names can be at most ${MAX_SKILL_NAME} characters`);
    }
    const nameNorm = normalizeSkillName(name);
    if (seen.has(nameNorm)) continue;
    seen.add(nameNorm);
    out.push({
      name,
      nameNorm,
      category: SKILL_CATEGORIES.includes(item.category) ? item.category : 'Other',
      level: SKILL_LEVELS.includes(item.level) ? item.level : 'intermediate',
    });
  }
  return out;
}

/** Splits free text into lowercase search tokens (keeps c++, c#, node.js style names intact). */
function tokenize(...parts) {
  const out = new Set();
  for (const part of parts) {
    String(part || '')
      .toLowerCase()
      .split(/[^\p{L}\p{N}+#.]+/u)
      .map((t) => t.replace(/^\.+|\.+$/g, ''))
      .filter(Boolean)
      .forEach((t) => out.add(t));
  }
  return [...out].slice(0, 120);
}

/** Derived, indexed fields for matching and search. Works on documents and plain objects. */
function deriveFields({ name, location, skillsToTeach = [], skillsToLearn = [] }) {
  const teach = skillsToTeach.map((s) => normalizeSkillName(s.name));
  const learn = skillsToLearn.map((s) => normalizeSkillName(s.name));
  return {
    teachNorm: [...new Set(teach)],
    learnNorm: [...new Set(learn)],
    searchTokens: tokenize(
      name,
      location,
      ...skillsToTeach.flatMap((s) => [s.name, normalizeSkillName(s.name)]),
      ...skillsToLearn.flatMap((s) => [s.name, normalizeSkillName(s.name)]),
    ),
  };
}

module.exports = {
  SKILL_CATEGORIES,
  SKILL_LEVELS,
  MAX_SKILLS,
  normalizeSkillName,
  sanitizeSkills,
  tokenize,
  deriveFields,
};
