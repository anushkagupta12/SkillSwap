require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

const users = [
  { name: 'Kavya Patel', email: 'kavya@example.com', password: 'password123', location: 'Mumbai, India', bio: '5 years designing mobile-first products. Passionate about accessible design and data-driven decisions.', avatarColor: 'emerald', skillsToTeach: [{ name: 'Figma', category: 'Design', level: 'expert' }, { name: 'UI Design', category: 'Design', level: 'expert' }, { name: 'Design Systems', category: 'Design', level: 'intermediate' }], skillsToLearn: [{ name: 'Python', category: 'Programming', level: 'beginner' }, { name: 'Data Visualization', category: 'Data & Analytics', level: 'beginner' }] },
  { name: 'Arjun Rao', email: 'arjun@example.com', password: 'password123', location: 'Bangalore, India', bio: 'Backend developer who loves building robust APIs. Wants to improve design eye to collaborate better with product teams.', avatarColor: 'violet', skillsToTeach: [{ name: 'Python', category: 'Programming', level: 'expert' }, { name: 'Django', category: 'Programming', level: 'expert' }, { name: 'MongoDB', category: 'Programming', level: 'intermediate' }], skillsToLearn: [{ name: 'Figma', category: 'Design', level: 'beginner' }, { name: 'UI Design', category: 'Design', level: 'beginner' }] },
  { name: 'Shreya Mehta', email: 'shreya@example.com', password: 'password123', location: 'Delhi, India', bio: 'Data analyst at a fintech company. Loves turning raw numbers into compelling stories. Wants to build custom dashboards.', avatarColor: 'amber', skillsToTeach: [{ name: 'Tableau', category: 'Data & Analytics', level: 'expert' }, { name: 'Power BI', category: 'Data & Analytics', level: 'expert' }, { name: 'SQL', category: 'Programming', level: 'intermediate' }], skillsToLearn: [{ name: 'React', category: 'Programming', level: 'beginner' }, { name: 'JavaScript', category: 'Programming', level: 'beginner' }] },
  { name: 'Rohan Verma', email: 'rohan@example.com', password: 'password123', location: 'Hyderabad, India', bio: 'Full-stack developer passionate about open source. I teach React and JS, and want to get into data science.', avatarColor: 'rose', skillsToTeach: [{ name: 'React', category: 'Programming', level: 'expert' }, { name: 'JavaScript', category: 'Programming', level: 'expert' }, { name: 'TypeScript', category: 'Programming', level: 'intermediate' }], skillsToLearn: [{ name: 'Machine Learning', category: 'Data & Analytics', level: 'beginner' }, { name: 'Python', category: 'Programming', level: 'beginner' }] },
  { name: 'Priya Kumar', email: 'priya@example.com', password: 'password123', location: 'Pune, India', bio: 'Spanish teacher and aspiring developer. I offer conversational Spanish and want to learn web development basics.', avatarColor: 'sky', skillsToTeach: [{ name: 'Spanish', category: 'Languages', level: 'expert' }, { name: 'French', category: 'Languages', level: 'intermediate' }], skillsToLearn: [{ name: 'HTML', category: 'Programming', level: 'beginner' }, { name: 'CSS', category: 'Programming', level: 'beginner' }, { name: 'JavaScript', category: 'Programming', level: 'beginner' }] },
  { name: 'Neha Joshi', email: 'neha@example.com', password: 'password123', location: 'Chennai, India', bio: 'Digital marketer and SEO specialist. Looking to learn data analysis to make my campaigns smarter.', avatarColor: 'orange', skillsToTeach: [{ name: 'SEO', category: 'Business', level: 'expert' }, { name: 'Digital Marketing', category: 'Business', level: 'expert' }, { name: 'Content Strategy', category: 'Business', level: 'intermediate' }], skillsToLearn: [{ name: 'SQL', category: 'Data & Analytics', level: 'beginner' }, { name: 'Tableau', category: 'Data & Analytics', level: 'beginner' }] },
];

(async () => {
  await connectDB();
  await User.deleteMany({});
  for (const u of users) { const doc = new User(u); await doc.save(); console.log(`✅ ${doc.name}`); }
  console.log('\n🌱 Seed done! Login with any email above using: password123');
  await mongoose.disconnect();
})();
