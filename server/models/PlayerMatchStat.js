import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const statSchema = new mongoose.Schema(
  {
    player: { type: ObjectId, ref: 'Player', required: true },
    match: { type: ObjectId, ref: 'Match', required: true, index: true },
    team: { type: ObjectId, ref: 'Team', required: true, index: true },
    minutes: { type: Number, min: 0, max: 130, default: 0 },
    goals: { type: Number, min: 0, default: 0 },
    assists: { type: Number, min: 0, default: 0 },
    shots: { type: Number, min: 0, default: 0 },
    passes: { type: Number, min: 0, default: 0 },
    rating: { type: Number, min: 0, max: 10, default: null },
  },
  { timestamps: true },
);

statSchema.index({ player: 1, match: 1 }, { unique: true });

export default mongoose.model('PlayerMatchStat', statSchema);
