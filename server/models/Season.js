import mongoose from 'mongoose';

const seasonSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name the season, e.g. 2026/27.'], trim: true, unique: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    current: { type: Boolean, default: false },
  },
  { timestamps: true },
);

seasonSchema.pre('validate', function checkDates(next) {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'The season must end after it starts.');
  }
  next();
});

export default mongoose.model('Season', seasonSchema);
