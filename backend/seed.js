require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('./models/User');
const SwapRequest = require('./models/SwapRequest');
const Rating = require('./models/Rating');
const { Conversation, Message } = require('./models/Chat');
const connectDB = require('./config/db');

const DEMO_USERS = [
  { name: 'Kavya Patel', email: 'kavya@example.com', location: 'Mumbai, India', bio: '5 years designing mobile-first products. Passionate about accessible design and data-driven decisions.', avatarColor: 'emerald', skillsToTeach: [{ name: 'Figma', category: 'Design', level: 'expert' }, { name: 'UI Design', category: 'Design', level: 'expert' }, { name: 'Design Systems', category: 'Design', level: 'intermediate' }], skillsToLearn: [{ name: 'Python', category: 'Programming', level: 'beginner' }, { name: 'Data Visualization', category: 'Data & Analytics', level: 'beginner' }] },
  { name: 'Arjun Rao', email: 'arjun@example.com', location: 'Bangalore, India', bio: 'Backend developer who loves building robust APIs. Wants to improve design eye to collaborate better with product teams.', avatarColor: 'violet', skillsToTeach: [{ name: 'Python', category: 'Programming', level: 'expert' }, { name: 'Django', category: 'Programming', level: 'expert' }, { name: 'MongoDB', category: 'Programming', level: 'intermediate' }], skillsToLearn: [{ name: 'Figma', category: 'Design', level: 'beginner' }, { name: 'UI Design', category: 'Design', level: 'beginner' }] },
  { name: 'Shreya Mehta', email: 'shreya@example.com', location: 'Delhi, India', bio: 'Data analyst at a fintech company. Loves turning raw numbers into compelling stories. Wants to build custom dashboards.', avatarColor: 'amber', skillsToTeach: [{ name: 'Tableau', category: 'Data & Analytics', level: 'expert' }, { name: 'Power BI', category: 'Data & Analytics', level: 'expert' }, { name: 'SQL', category: 'Programming', level: 'intermediate' }], skillsToLearn: [{ name: 'React', category: 'Programming', level: 'beginner' }, { name: 'JavaScript', category: 'Programming', level: 'beginner' }] },
  { name: 'Rohan Verma', email: 'rohan@example.com', location: 'Hyderabad, India', bio: 'Full-stack developer passionate about open source. I teach React and JS, and want to get into data science.', avatarColor: 'rose', skillsToTeach: [{ name: 'React', category: 'Programming', level: 'expert' }, { name: 'JavaScript', category: 'Programming', level: 'expert' }, { name: 'TypeScript', category: 'Programming', level: 'intermediate' }], skillsToLearn: [{ name: 'Machine Learning', category: 'Data & Analytics', level: 'beginner' }, { name: 'Python', category: 'Programming', level: 'beginner' }] },
  { name: 'Priya Kumar', email: 'priya@example.com', location: 'Pune, India', bio: 'Spanish teacher and aspiring developer. I offer conversational Spanish and want to learn web development basics.', avatarColor: 'sky', skillsToTeach: [{ name: 'Spanish', category: 'Languages', level: 'expert' }, { name: 'French', category: 'Languages', level: 'intermediate' }], skillsToLearn: [{ name: 'HTML', category: 'Programming', level: 'beginner' }, { name: 'CSS', category: 'Programming', level: 'beginner' }, { name: 'JavaScript', category: 'Programming', level: 'beginner' }] },
  { name: 'Neha Joshi', email: 'neha@example.com', location: 'Chennai, India', bio: 'Digital marketer and SEO specialist. Looking to learn data analysis to make my campaigns smarter.', avatarColor: 'orange', skillsToTeach: [{ name: 'SEO', category: 'Business', level: 'expert' }, { name: 'Digital Marketing', category: 'Business', level: 'expert' }, { name: 'Content Strategy', category: 'Business', level: 'intermediate' }], skillsToLearn: [{ name: 'SQL', category: 'Data & Analytics', level: 'beginner' }, { name: 'Tableau', category: 'Data & Analytics', level: 'beginner' }] },
];

/** The seed wipes collections, so it must never touch anything that isn't clearly a local/dev database. */
function assertSafeTarget(uri) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is "production".');
  }
  const looksLocal = /(localhost|127\.0\.0\.1|\[::1\]|mongo:\/\/mongo|@mongo[:/]|[-_/.](dev|test|local)\b)/i.test(uri);
  if (!looksLocal && process.env.ALLOW_SEED !== 'true') {
    throw new Error(
      'Refusing to seed: MONGO_URI does not look like a local/dev database.\n' +
        'Point it at localhost (or a database name containing "dev"/"test"), or set ALLOW_SEED=true if you are sure.',
    );
  }
}

(async () => {
  try {
    assertSafeTarget(process.env.MONGO_URI || '');
    await connectDB();

    await Promise.all([
      User.deleteMany({}),
      SwapRequest.deleteMany({}),
      Rating.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
    ]);

    // Random per-run password: nothing sensible to guess, and nothing to publish in the README.
    const password = process.env.SEED_PASSWORD || crypto.randomBytes(9).toString('base64url');
    for (const u of DEMO_USERS) {
      const doc = new User({ ...u, password, emailVerified: true });
      await doc.save();
      console.log(`  + ${doc.name} <${doc.email}>`);
    }
    console.log('\nSeed complete. All demo accounts share this password (shown only here):');
    console.log(`  ${password}\n`);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
