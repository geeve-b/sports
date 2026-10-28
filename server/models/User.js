import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { BCRYPT_ROUNDS, ROLES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Add a name.'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Add an email address.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address.'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'player' },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    avatar: { type: String, trim: true, default: '' },
    // Coaches start unapproved; an admin flips this.
    approved: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
};

userSchema.methods.checkPassword = function checkPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
