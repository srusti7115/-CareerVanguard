
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { z } from 'zod';
import { User, Job, Analysis, STATUSES } from './models.js';
import { analyzeResume } from './ai.js';

const sign = u =>
  jwt.sign(
    { id: u._id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// ---------- Authentication ----------
export const requireAuth = (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');

  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    cb(
      file.mimetype === 'application/pdf'
        ? null
        : new Error('PDF only'),
      file.mimetype === 'application/pdf'
    );
  },
});

// ---------- Auth Routes ----------
export const auth = Router();

const creds = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email(),
  password: z.string().min(6),
});

auth.post('/register', async (req, res) => {
  try {
    const p = creds.safeParse(req.body);

    if (!p.success || !p.data.name) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    if (await User.findOne({ email: p.data.email })) {
      return res.status(409).json({ error: 'Email already used' });
    }

    const user = await User.create({
      ...p.data,
      password: await bcrypt.hash(p.data.password, 10),
    });

    res.status(201).json({
      token: sign(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

auth.post('/login', async (req, res) => {
  try {
    const p = creds.safeParse(req.body);

    const user =
      p.success && await User.findOne({ email: p.data.email });

    if (!user || !(await bcrypt.compare(p.data.password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      token: sign(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ---------- Job Tracker ----------
export const jobs = Router();

jobs.use(requireAuth);

const jobSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  status: z.enum(STATUSES).optional(),
  url: z.string().optional(),
  notes: z.string().optional(),
});

jobs.get('/', async (req, res) => {
  try {
    const data = await Job.find({ user: req.userId }).sort('-updatedAt');
    res.json(data);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Could not load jobs' });
  }
});

jobs.post('/', async (req, res) => {
  try {
    const p = jobSchema.safeParse(req.body);

    if (!p.success) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const job = await Job.create({
      ...p.data,
      user: req.userId,
    });

    res.status(201).json(job);
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Could not create job' });
  }
});

jobs.patch('/:id', async (req, res) => {
  try {
    const p = jobSchema.partial().safeParse(req.body);

    if (!p.success) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      p.data,
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Could not update job' });
  }
});

jobs.delete('/:id', async (req, res) => {
  try {
    await Job.deleteOne({
      _id: req.params.id,
      user: req.userId,
    });

    res.status(204).end();
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Could not delete job' });
  }
});

// ---------- Resume Analyzer ----------
export const resume = Router();

resume.use(requireAuth);

resume.post('/analyze', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Upload a PDF resume',
      });
    }

    const { text } = await pdf(req.file.buffer);

    if (!text || text.trim().length < 100) {
      return res.status(422).json({
        error: 'Could not read text from PDF (scanned?)',
      });
    }

    const jobDescription = req.body.jobDescription || '';

    // Analyze resume using Gemini AI
    const result = await analyzeResume(text, jobDescription);

    // Save analysis in MongoDB
    const saved = await Analysis.create({
      user: req.userId,
      fileName: req.file.originalname,
      jobDescription,
      result,
    });

    res.json(saved);

  } catch (error) {
    console.error('Resume analysis error:', error);

    res.status(error.status || 500).json({
      error: error.message || 'Resume analysis failed',
    });
  }
});

resume.get('/history', async (req, res) => {
  try {
    const history = await Analysis.find({
      user: req.userId,
    })
      .sort('-createdAt')
      .limit(20);

    res.json(history);
  } catch (error) {
    console.error('Resume history error:', error);
    res.status(500).json({ error: 'Could not load resume history' });
  }
});
