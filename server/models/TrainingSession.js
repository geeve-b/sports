import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const trainingSchema = new mongoose.Schema(
  {
    team: { type: ObjectId, ref: 'Team', required: true, index: true },
    date: { type: Date, required: [true, 'Add a date and start time.'], index: true },
    duration: { type: Number, min: [15, 'Sessions run at least 15 minutes.'], max: 300, default: 90 },
    focus: { type: String, required: [true, 'Add a focus for the session.'], trim: true, maxlength: 60 },
    location: { type: String, trim: true, maxlength: 60, default: 'Training ground' },
    drills: [{ type: String, trim: true, maxlength: 80 }],
    attendance: [
      {
        player: { type: ObjectId, ref: 'Player', required: true },
        present: { type: Boolean, default: false },
        checkedInAt: { type: Date, default: null },
        _id: false,
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model('TrainingSession', trainingSchema);
