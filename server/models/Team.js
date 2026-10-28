import mongoose from 'mongoose';

const hex = [/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #E8FF3A.'];

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Add a team name.'], trim: true, unique: true, maxlength: 60 },
    shortName: {
      type: String,
      required: [true, 'Add a three-letter short name.'],
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 4,
    },
    crestUrl: { type: String, trim: true, default: '' },
    colors: {
      primary: { type: String, default: '#E8FF3A', match: hex },
      secondary: { type: String, default: '#0E0F0C', match: hex },
    },
    coaches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    season: { type: mongoose.Schema.Types.ObjectId, ref: 'Season', default: null },
  },
  { timestamps: true },
);

export default mongoose.model('Team', teamSchema);
