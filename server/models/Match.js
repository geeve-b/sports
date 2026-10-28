import mongoose from 'mongoose';
import { EVENT_TYPES, FORMATIONS, MATCH_STATUSES } from '../config/constants.js';

const { ObjectId } = mongoose.Schema.Types;

const eventSchema = new mongoose.Schema({
  type: { type: String, enum: EVENT_TYPES, required: true },
  player: { type: ObjectId, ref: 'Player', default: null },
  minute: { type: Number, min: 0, max: 130, required: true },
  note: { type: String, trim: true, maxlength: 120, default: '' },
});

const matchSchema = new mongoose.Schema(
  {
    team: { type: ObjectId, ref: 'Team', required: true, index: true },
    season: { type: ObjectId, ref: 'Season', default: null },
    opponent: { type: String, required: [true, 'Add the opponent.'], trim: true, maxlength: 60 },
    opponentShort: { type: String, trim: true, uppercase: true, maxlength: 4 },
    opponentColor: { type: String, default: '#F2F0E6' },
    date: { type: Date, required: [true, 'Add a kick-off date and time.'], index: true },
    venue: { type: String, trim: true, maxlength: 80, default: '' },
    homeAway: { type: String, enum: ['home', 'away'], default: 'home' },
    competition: { type: String, trim: true, maxlength: 60, default: 'League' },
    score: {
      for: { type: Number, min: 0, default: null },
      against: { type: Number, min: 0, default: null },
    },
    status: { type: String, enum: MATCH_STATUSES, default: 'scheduled' },
    events: [eventSchema],
    lineup: {
      formation: { type: String, enum: Object.keys(FORMATIONS), default: '4-3-3' },
      positions: [{ player: { type: ObjectId, ref: 'Player' }, slot: String, _id: false }],
      bench: [{ type: ObjectId, ref: 'Player' }],
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

matchSchema.pre('validate', function defaultShort(next) {
  if (!this.opponentShort && this.opponent) {
    this.opponentShort = this.opponent.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
  }
  next();
});

// W / D / L from our side, once there is a score.
matchSchema.virtual('result').get(function result() {
  const { for: f, against: a } = this.score || {};
  if (this.status !== 'ft' || f == null || a == null) return null;
  return f > a ? 'W' : f < a ? 'L' : 'D';
});

export default mongoose.model('Match', matchSchema);
