const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { makeInitials } = require('../utils/initials');
const {
  normalizeSkillName,
  deriveFields,
  SKILL_CATEGORIES,
  SKILL_LEVELS,
  MAX_SKILLS,
} = require('../utils/skills');

const { Schema } = mongoose;

const AVATAR_COLORS = ['emerald', 'violet', 'amber', 'rose', 'sky', 'orange'];

const skillSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    nameNorm: { type: String }, // derived in the pre-save hook
    category: { type: String, enum: SKILL_CATEGORIES, default: 'Other' },
    level: { type: String, enum: SKILL_LEVELS, default: 'intermediate' },
  },
  { _id: false },
);

const maxSkills = {
  validator: (arr) => !arr || arr.length <= MAX_SKILLS,
  message: `At most ${MAX_SKILLS} skills allowed`,
};

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
    },
    // Optional for accounts created through an OAuth provider (they have no password until they set one).
    password: {
      type: String,
      required() {
        return !(this.oauth && (this.oauth.google || this.oauth.github));
      },
      minlength: 8,
      select: false,
    },
    // Provider account ids, e.g. { google: '1184...', github: '42' }. Never serialized to clients.
    oauth: {
      google: { type: String },
      github: { type: String },
    },
    initials: { type: String, default: '' },
    avatarColor: { type: String, default: 'emerald', enum: AVATAR_COLORS },
    bio: { type: String, maxlength: 300, default: '' },
    location: { type: String, maxlength: 100, default: '', trim: true },

    skillsToTeach: { type: [skillSchema], validate: maxSkills },
    skillsToLearn: { type: [skillSchema], validate: maxSkills },
    // Denormalized, indexed copies used for matching / searching (see pre-save hook).
    teachNorm: { type: [String], select: false },
    learnNorm: { type: [String], select: false },
    searchTokens: { type: [String], select: false },

    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    connections: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    connectionsCount: { type: Number, default: 0 },

    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    // Session / account security
    tokenVersion: { type: Number, default: 0 },
    emailVerified: { type: Boolean, default: false },
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true },
);

userSchema.index({ teachNorm: 1 });
userSchema.index({ learnNorm: 1 });
userSchema.index({ searchTokens: 1 });
userSchema.index({ 'skillsToTeach.category': 1 });
userSchema.index({ createdAt: -1 });
// One local account per provider identity (partial: most users have none).
for (const provider of ['google', 'github']) {
  userSchema.index(
    { [`oauth.${provider}`]: 1 },
    { unique: true, partialFilterExpression: { [`oauth.${provider}`]: { $type: 'string' } } },
  );
}

userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isNew || this.isModified('name')) {
    this.initials = makeInitials(this.name);
  }
  const skillsChanged = this.isModified('skillsToTeach') || this.isModified('skillsToLearn');
  if (this.isNew || skillsChanged || this.isModified('name') || this.isModified('location')) {
    for (const s of [...this.skillsToTeach, ...this.skillsToLearn]) {
      s.nameNorm = normalizeSkillName(s.name);
    }
    Object.assign(this, deriveFields(this));
  }
});


userSchema.methods.matchPassword = async function (entered) {
  if (!this.password) return false; // OAuth-only account
  return bcrypt.compare(String(entered), this.password);
};

// ── Public projection ────────────────────────────────────────────────────────
// The ONLY fields other users may ever see.
const PUBLIC_SELECT =
  'name initials avatarColor bio location skillsToTeach skillsToLearn connectionsCount ratingAvg ratingCount isOnline lastSeen createdAt';

const pubSkill = (s) => ({ name: s.name, category: s.category, level: s.level });

/** Builds the public representation from a document or a plain object. */
const pickPublic = (src) => ({
  _id: src._id,
  name: src.name,
  initials: src.initials,
  avatarColor: src.avatarColor,
  bio: src.bio,
  location: src.location,
  skillsToTeach: (src.skillsToTeach || []).map(pubSkill),
  skillsToLearn: (src.skillsToLearn || []).map(pubSkill),
  connectionsCount: src.connectionsCount || 0,
  ratingAvg: src.ratingAvg || 0,
  ratingCount: src.ratingCount || 0,
  isOnline: !!src.isOnline,
  lastSeen: src.lastSeen,
  createdAt: src.createdAt,
});

userSchema.methods.toPublic = function () {
  return pickPublic(this);
};

/** Minimal identity used in notifications / sockets. */
userSchema.methods.toBrief = function () {
  return { _id: this._id, name: this.name, initials: this.initials, avatarColor: this.avatarColor };
};

// Safety net: never serialize secrets or internal fields, whatever route returns a user.
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.oauth;
    delete ret.__v;
    delete ret.tokenVersion;
    delete ret.emailVerifyTokenHash;
    delete ret.emailVerifyExpires;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpires;
    delete ret.teachNorm;
    delete ret.learnNorm;
    delete ret.searchTokens;
    delete ret.connections;
    for (const list of [ret.skillsToTeach, ret.skillsToLearn]) {
      if (Array.isArray(list)) list.forEach((s) => delete s.nameNorm);
    }
    return ret;
  },
});

const User = mongoose.model('User', userSchema);
User.AVATAR_COLORS = AVATAR_COLORS;
User.PUBLIC_SELECT = PUBLIC_SELECT;
User.pickPublic = pickPublic;

module.exports = User;
