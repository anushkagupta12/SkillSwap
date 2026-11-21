// Pure unit tests - no database needed, but the global setup still boots one (cheap after the first test file).
const { scoreMatch, scoreUsers, overlapLists } = require('../services/matching');
const { normalizeSkillName, sanitizeSkills } = require('../utils/skills');
const { makeInitials } = require('../utils/initials');

describe('scoreMatch', () => {
  test('perfect two-way overlap is exactly 100 (not capped, not 93)', () => {
    expect(scoreMatch(['figma'], ['python'], ['python'], ['figma'])).toBe(100);
  });

  test('half overlap', () => {
    // A wants 2, B wants 0 -> denominator 2; B teaches 1 of A's wants -> 50
    expect(scoreMatch([], ['python', 'sql'], ['python'], [])).toBe(50);
  });

  test('no overlap and empty profiles give 0 (no division by zero)', () => {
    expect(scoreMatch(['a'], ['b'], ['c'], ['d'])).toBe(0);
    expect(scoreMatch([], [], [], [])).toBe(0);
  });

  test('duplicates are not double counted', () => {
    expect(scoreMatch(['figma', 'figma'], ['python', 'python'], ['python'], ['figma'])).toBe(100);
  });

  test('can never exceed 100, even with adversarial input', () => {
    const many = Array.from({ length: 50 }, (_, i) => `s${i}`);
    expect(scoreMatch(many, many, many, many)).toBeLessThanOrEqual(100);
  });

  test('is symmetric', () => {
    const a = [['figma', 'ui'], ['python', 'sql']];
    const b = [['python'], ['figma']];
    expect(scoreMatch(...a, ...b)).toBe(scoreMatch(...b, ...a));
  });
});

describe('README example: Kavya / Arjun', () => {
  const kavya = {
    skillsToTeach: [{ name: 'Figma' }, { name: 'UI Design' }, { name: 'Design Systems' }],
    skillsToLearn: [{ name: 'Python' }, { name: 'Data Visualization' }],
  };
  const arjun = {
    skillsToTeach: [{ name: 'Python' }, { name: 'Django' }, { name: 'MongoDB' }],
    skillsToLearn: [{ name: 'Figma' }, { name: 'UI Design' }],
  };

  test('seed data produces the documented score', () => {
    // overlap = (Figma, UI Design) + (Python) = 3; wants = 2 + 2 = 4 -> 75
    expect(scoreUsers(kavya, arjun)).toBe(75);
    expect(scoreUsers(arjun, kavya)).toBe(75);
  });

  test('overlap lists name the concrete skills', () => {
    const o = overlapLists(kavya, arjun);
    expect(o.theyCanTeachMe.map((s) => s.name)).toEqual(['Python']);
    expect(o.iCanTeachThem.map((s) => s.name)).toEqual(['Figma', 'UI Design']);
  });
});

describe('skill normalization', () => {
  test.each([
    ['JS', 'javascript'],
    ['  JavaScript ', 'javascript'],
    ['python3', 'python'],
    ['Python', 'python'],
    ['React.js', 'react'],
    ['Machine   Learning', 'machine learning'],
  ])('%j -> %j', (input, expected) => {
    expect(normalizeSkillName(input)).toBe(expected);
  });

  test('aliases now match each other', () => {
    expect(scoreUsers(
      { skillsToTeach: [{ name: 'JS' }], skillsToLearn: [{ name: 'py' }] },
      { skillsToTeach: [{ name: 'Python3' }], skillsToLearn: [{ name: 'JavaScript ' }] },
    )).toBe(100);
  });

  test('sanitizeSkills dedupes by normalized name and clamps unknown values', () => {
    const out = sanitizeSkills([
      { name: 'JS', category: 'Nope', level: 'god' },
      { name: 'javascript' },
      { name: '  ' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: 'JS', nameNorm: 'javascript', category: 'Other', level: 'intermediate' });
  });

  test('sanitizeSkills rejects non-arrays and oversized lists', () => {
    expect(() => sanitizeSkills({ name: 'x' })).toThrow();
    expect(() => sanitizeSkills(Array.from({ length: 31 }, (_, i) => ({ name: `s${i}` })))).toThrow();
  });
});

describe('makeInitials', () => {
  test.each([
    ['Kavya Patel', 'KP'],
    ['  madonna ', 'M'],
    ['Jean  Luc Picard', 'JL'],
    ['', '?'],
    [undefined, '?'],
  ])('%j -> %j', (name, expected) => {
    expect(makeInitials(name)).toBe(expected);
  });
});
