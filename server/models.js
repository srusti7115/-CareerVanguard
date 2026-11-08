import mongoose from 'mongoose';
const { Schema, model } = mongoose;

export const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
}, { timestamps: true }));

export const STATUSES = ['Wishlist', 'Applied', 'Interview', 'Offer', 'Rejected'];
export const Job = model('Job', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  company: { type: String, required: true },
  role: { type: String, required: true },
  status: { type: String, enum: STATUSES, default: 'Wishlist' },
  url: String,
  notes: String,
}, { timestamps: true }));

export const Analysis = model('Analysis', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fileName: String,
  jobDescription: String,
  result: Schema.Types.Mixed,
}, { timestamps: true }));
