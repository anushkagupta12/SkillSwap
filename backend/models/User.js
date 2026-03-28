const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, default: 'General' },
  level: { type: String, enum: ['beginner', 'intermediate', 'expert'], default: 'intermediate' },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, match: /^\S+@\S+\.\S+$/ },
  password: { type: String, required: true, minlength: 6, select: false },
  initials: { type: String, default: '' },
  avatarColor: { type: String, default: 'emerald', enum: ['emerald', 'violet', 'amber', 'rose', 'sky', 'orange'] },
  bio: { type: String, maxlength: 300, default: '' },
  location: { type: String, default: '' },
  skillsToTeach: [skillSchema],
  skillsToLearn: [skillSchema],
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  swapRequests: [{
  from:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:  { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  message: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}],
  ratings: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: { type: Number, min: 1, max: 5 },
    comment: String,
    createdAt: { type: Date, default: Date.now },
  }],
  totalSwaps: { type: Number, default: 0 },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  if (this.name) {
    const p = this.name.trim().split(' ');
    this.initials = (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
  }
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.virtual('avgRating').get(function () {
  if (!this.ratings || !this.ratings.length) return 0;
  return (this.ratings.reduce((s, r) => s + r.score, 0) / this.ratings.length).toFixed(1);
});

userSchema.set('toJSON', { virtuals: true });
module.exports = mongoose.model('User', userSchema);
