const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { deriveFields, normalizeSkillName } = require('../utils/skills');
const { makeInitials } = require('../utils/initials');
const { pairKey } = require('../utils/pairKey');

// Make sure every model (and therefore every index) is registered.
require('../models/User');
require('../models/SwapRequest');
require('../models/Rating');
require('../models/Chat');

const { ObjectId } = mongoose.Types;

const PASSWORD = 'loadtest-pass-1';

const SKILLS = {
  Programming: ['Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Java', 'Go', 'Rust', 'C++', 'Django', 'MongoDB', 'Docker', 'Kubernetes', 'Git', 'HTML', 'CSS', 'Swift', 'Kotlin', 'Linux'],
  Design: ['Figma', 'UI Design', 'UX Research', 'Branding', 'Illustration', 'Photoshop', 'Typography', 'Motion Design', 'Prototyping', 'Design Systems', 'Logo Design', 'Video Editing'],
  'Data & Analytics': ['Tableau', 'Power BI', 'Machine Learning', 'Statistics', 'Excel', 'Data Visualization', 'R', 'Pandas', 'A/B Testing', 'Deep Learning', 'Data Cleaning', 'Forecasting'],
  Languages: ['Spanish', 'French', 'German', 'Japanese', 'Mandarin', 'Hindi', 'Italian', 'Portuguese', 'Korean', 'Arabic', 'Russian', 'English'],
  'Music & Arts': ['Guitar', 'Piano', 'Music Theory', 'Singing', 'Drawing', 'Painting', 'Photography', 'Drums', 'Violin', 'Songwriting', 'Dance', 'Calligraphy'],
  Business: ['Marketing', 'SEO', 'Finance', 'Public Speaking', 'Copywriting', 'Sales', 'Product Management', 'Accounting', 'Negotiation', 'Social Media', 'Project Management', 'Leadership'],
};
const POOL = Object.entries(SKILLS).flatMap(([category, names]) => names.map((name) => ({ name, category })));

const FIRST = ['Aarav', 'Priya', 'Kavya', 'Rohan', 'Neha', 'Arjun', 'Shreya', 'Vikram', 'Ananya', 'Rahul', 'Meera', 'Karan', 'Isha', 'Dev', 'Tara', 'Nikhil'];
const LAST = ['Patel', 'Rao', 'Mehta', 'Verma', 'Kumar', 'Joshi', 'Shah', 'Nair', 'Iyer', 'Singh', 'Gupta', 'Reddy', 'Das', 'Bose', 'Khan', 'Menon'];
const CITIES = ['Mumbai, India', 'Bangalore, India', 'Delhi, India', 'Pune, India', 'Chennai, India', 'Hyderabad, India', 'London, UK', 'Berlin, Germany', 'Toronto, Canada', 'Austin, USA'];
const COLORS = ['emerald', 'violet', 'amber', 'rose', 'sky', 'orange'];

// Deterministic PRNG so every run produces the same dataset.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function insertInBatches(collection, docs, size = 1000) {
  for (let i = 0; i < docs.length; i += size) await collection.insertMany(docs.slice(i, i + size), { ordered: false });
}

/**
 * Fills the (already emptied) database. Documents are written straight to the collections,
 * skipping hooks, so seeding thousands of users doesn't spend minutes in bcrypt.
 * Returns what the load generator needs to build realistic requests.
 */
async function seed({ users: userCount, messagesPerConvo = 30 }) {
  const rand = mulberry32(20240607);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const hash = bcrypt.hashSync(PASSWORD, 10);
  const now = Date.now();

  // 1) users
  const ids = Array.from({ length: userCount }, () => new ObjectId());
  const friends = ids.map(() => new Set());
  // Every user is connected to ~8 others (and chat partners are always connected, see below).
  for (let i = 0; i < userCount; i++) {
    for (let k = 0; k < 4; k++) {
      const j = Math.floor(rand() * userCount);
      if (j !== i) {
        friends[i].add(j);
        friends[j].add(i);
      }
    }
  }
  const convoCount = Math.floor(userCount / 2);
  for (let k = 0; k < convoCount; k++) {
    friends[2 * k].add(2 * k + 1);
    friends[2 * k + 1].add(2 * k);
  }

  const userDocs = ids.map((_id, i) => {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const chosen = new Set();
    while (chosen.size < 6) chosen.add(pick(POOL));
    const picked = [...chosen];
    const teachN = 2 + Math.floor(rand() * 3);
    const skillsToTeach = picked.slice(0, teachN).map((s) => ({ ...s, level: pick(['beginner', 'intermediate', 'expert']) }));
    const skillsToLearn = picked.slice(teachN, teachN + 2 + Math.floor(rand() * 2)).map((s) => ({ ...s, level: 'beginner' }));
    const location = pick(CITIES);
    const doc = {
      _id,
      name,
      email: `loaduser${i}@loadtest.local`,
      password: hash,
      initials: makeInitials(name),
      avatarColor: pick(COLORS),
      bio: 'Load-test member. I like trading skills.',
      location,
      skillsToTeach,
      skillsToLearn,
      isOnline: false,
      lastSeen: new Date(now),
      connections: [...friends[i]].map((j) => ids[j]),
      connectionsCount: friends[i].size,
      ratingAvg: 0,
      ratingCount: 0,
      tokenVersion: 0,
      emailVerified: true,
      createdAt: new Date(now - (userCount - i) * 1000),
      updatedAt: new Date(now),
      __v: 0,
    };





    // Same derived, indexed fields the model's pre-save hook would compute.
    for (const s of [...doc.skillsToTeach, ...doc.skillsToLearn]) s.nameNorm = normalizeSkillName(s.name);
    return { ...doc, ...deriveFields(doc) };
  });
  await insertInBatches(mongoose.connection.collection('users'), userDocs);

  // 2) conversations: users (2k, 2k+1) talk to each other
  const convoIds = [];
  const convoDocs = [];
  const messageDocs = [];
  for (let k = 0; k < convoCount; k++) {
    const a = ids[2 * k];
    const b = ids[2 * k + 1];
    const cid = new ObjectId();
    let last;
    for (let m = 0; m < messagesPerConvo; m++) {
      const mid = new ObjectId(); // generated in order, so ids increase with time like real data
      last = mid;
      messageDocs.push({
        _id: mid,
        conversation: cid,
        sender: m % 2 === 0 ? a : b,
        content: `Seed message ${m + 1}: shall we plan our next session?`,
        read: m < messagesPerConvo - 2,
        createdAt: new Date(now - (messagesPerConvo - m) * 60000),
        updatedAt: new Date(now),
        __v: 0,
      });
    }
    convoIds.push(cid);
    convoDocs.push({
      _id: cid,
      participants: [a, b],
      pairKey: pairKey(a, b),
      lastMessage: last,
      lastMessageAt: new Date(now),
      skillSwapContext: {},
      createdAt: new Date(now),
      updatedAt: new Date(now),
      __v: 0,
    });
  }
  await insertInBatches(mongoose.connection.collection('conversations'), convoDocs);
  await insertInBatches(mongoose.connection.collection('messages'), messageDocs, 2000);

  return {
    userIds: ids.map(String),
    convoIds: convoIds.map(String),
    messageCount: messageDocs.length,
    skillPrefixes: POOL.map((s) => s.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 4)).filter((p) => p.length >= 3),
    password: PASSWORD,
  };
}

module.exports = { seed, PASSWORD };
