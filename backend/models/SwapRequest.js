const mongoose = require('mongoose');
const { pairKey } = require('../utils/pairKey');

const { Schema } = mongoose;

const swapRequestSchema = new Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Order independent key so that A->B and B->A can't both be pending.
    pairKey: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    message: { type: String, maxlength: 300, default: '', trim: true },
    respondedAt: { type: Date },
  },
  { timestamps: true },
);

swapRequestSchema.pre('validate', function () {
  if (this.from && this.to) this.pairKey = pairKey(this.from, this.to);
});

swapRequestSchema.index({ to: 1, status: 1, createdAt: -1 });
swapRequestSchema.index({ from: 1, createdAt: -1 });
// The database - not application code - guarantees a single pending request per pair.
swapRequestSchema.index(
  { pairKey: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' }, name: 'one_pending_per_pair' },
);

module.exports = mongoose.model('SwapRequest', swapRequestSchema);
