import mongoose from 'mongoose';
import { PRIORITIES } from '../config/constants.js';

const { ObjectId } = mongoose.Schema.Types;

const announcementSchema = new mongoose.Schema(
  {
    team: { type: ObjectId, ref: 'Team', required: true, index: true },
    author: { type: ObjectId, ref: 'User', required: true },
    title: { type: String, required: [true, 'Add a headline.'], trim: true, maxlength: 90 },
    body: { type: String, required: [true, 'Add the message.'], trim: true, maxlength: 2000 },
    priority: { type: String, enum: PRIORITIES, default: 'normal' },
  },
  { timestamps: true },
);

export default mongoose.model('Announcement', announcementSchema);
