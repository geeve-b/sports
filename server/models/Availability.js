import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const availabilitySchema = new mongoose.Schema(
  {
    player: { type: ObjectId, ref: 'Player', required: true },
    match: { type: ObjectId, ref: 'Match', required: true, index: true },
    available: { type: Boolean, required: true },
    reason: { type: String, trim: true, maxlength: 160, default: '' },
  },
  { timestamps: true },
);

availabilitySchema.index({ player: 1, match: 1 }, { unique: true });

export default mongoose.model('Availability', availabilitySchema);
