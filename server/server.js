import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { auth, jobs, resume } from './routes.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 200 }));
app.use('/api/resume/analyze', rateLimit({ windowMs: 60 * 60 * 1000, limit: 20 })); // protect AI cost

app.use('/api/auth', auth);
app.use('/api/jobs', jobs);
app.use('/api/resume', resume);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

await mongoose.connect(process.env.MONGO_URI);
app.listen(process.env.PORT || 5000, () => console.log('API running'));
