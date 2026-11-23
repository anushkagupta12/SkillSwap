const mongoose = require('mongoose');

const { Schema } = mongoose;

const ratingSchema = new Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: { validator: Number.isInteger, message: 'Score must be a whole number' },
    },
    comment: { type: String, maxlength: 300, default: '', trim: true },
  },
  { timestamps: true },
);

ratingSchema.index({ from: 1, to: 1 }, { unique: true });
ratingSchema.index({ to: 1, createdAt: -1 });

module.exports = mongoose.model('Rating', ratingSchema);
