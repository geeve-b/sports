import mongoose from 'mongoose';
import { FEET, PLAYER_STATUSES, POSITIONS } from '../config/constants.js';

const injurySchema = new mongoose.Schema({
  type: { type: String, required: [true, 'Describe the injury.'], trim: true, maxlength: 80 },
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date, default: null },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
});

const playerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    jerseyNumber: { type: Number, min: [1, 'Jersey numbers run 1–99.'], max: [99, 'Jersey numbers run 1–99.'] },
    position: { type: String, enum: POSITIONS, default: 'MF' },
    dob: { type: Date },
    height: { type: Number, min: 120, max: 230 },
    foot: { type: String, enum: FEET, default: 'right' },
    status: { type: String, enum: PLAYER_STATUSES, default: 'fit' },
    injuries: [injurySchema],
  },
  { timestamps: true },
);

// One shirt number per team. Players without a number yet are allowed.
playerSchema.index(
  { team: 1, jerseyNumber: 1 },
  { unique: true, partialFilterExpression: { jerseyNumber: { $type: 'number' } } },
);

export default mongoose.model('Player', playerSchema);
