
import { useState, useEffect, useRef } from 'react';
import { api, getToken } from './api.js';

const STATUSES = ['Wishlist', 'Applied', 'Interview', 'Offer', 'Rejected'];

const hue = s =>
  [...s].reduce((a, c) => a + c.charCodeAt(0), 0) * 37 % 360;

function Auth({ onDone }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = k => e => setF({ ...f, [k]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const d = await api(`/auth/${mode}`, {
        method: 'POST',
        body: f
      });
      localStorage.setItem('token', d.token);
      onDone();
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth">
      <section className="auth-art">
        <div className="logo">Résumé<span>AI</span></div>
        <div>
          <p style={{ color: '#b7aaff', fontWeight: 700, marginBottom: 18 }}>
            YOUR CAREER, UPGRADED
          </p>
          <h1>Make your next career move your best one.</h1>
          <p className="sub">
            Analyze your resume, improve your ATS score and organize
            every job application in one intelligent workspace.
          </p>
          <div className="mark-demo">
            <p>✦ AI-powered resume analysis</p>
            <p>✦ Smart job application tracking</p>
            <p>✦ Actionable career insights</p>
          </div>
        </div>
        <p className="sub">Build your future, one application at a time.</p>
      </section>

      <form className="auth-form" onSubmit={submit}>
        <p style={{ color: '#7258e8', fontWeight: 700 }}>
          WELCOME TO RÉSUMÉ AI
        </p>
        <h2>{mode === 'login' ? 'Welcome back!' : 'Create your account'}</h2>
        <p style={{ color: '#858ba2', lineHeight: 1.7 }}>
          {mode === 'login'
            ? 'Log in to continue your career journey.'
            : 'Start building a stronger professional profile.'}
        </p>

        {mode === 'register' && (
          <label>
            Full name
            <input
              value={f.name}
              onChange={set('name')}
              placeholder="Your name"
              required
            />
          </label>
        )}

        <label>
          Email address
          <input
            type="email"
            value={f.email}
            onChange={set('email')}
            placeholder="you@example.com"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={f.password}
            onChange={set('password')}
            placeholder="Enter your password"
            required
          />
        </label>

        {err && <p className="err">{err}</p>}

        <button className="btn" disabled={busy}>
          {busy ? 'Please wait...' :
            mode === 'login' ? 'Sign in →' : 'Create account →'}
        </button>

        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setErr('');
          }}
        >
          {mode === 'login'
            ? "Don't have an account? Create one"
            : 'Already registered? Sign in'}
        </button>
      </form>
    </main>
  );
}

function Gauge({ value = 0, label }) {
  const [v, setV] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setV(value), 60);
    return () => clearTimeout(t);
  }, [value]);

  const C = 2 * Math.PI * 52;
  const tone = value >= 75 ? 'good' : value >= 50 ? 'mid' : 'bad';

  return (
    <div className={`gauge ${tone}`}>
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" className="track" />
        <circle
          cx="60"
          cy="60"
          r="52"
          className="arc"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - v / 100)}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

const Block = ({ title, items, kind }) => items?.length ? (
  <section className={`block ${kind || ''}`}>
    <h4>{title}</h4>
    {kind === 'chips'
      ? <div className="chips">
          {items.map((x, i) => <mark key={i}>{x}</mark>)}
        </div>
      : <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    }
  </section>
) : null;

function Analyzer() {
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState('');
  const [res, setRes] = useState(null);
  const [hist, setHist] = useState([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [err, setErr] = useState('');
  const input = useRef();

  const load = () => api('/resume/history').then(setHist).catch(() => {});

  useEffect(() => { load(); }, []);

  const pick = f => {
    if (!f) return;
    if (f.type === 'application/pdf') {
      setFile(f);
      setErr('');
    } else {
      setErr('Only PDF files are supported.');
    }
  };

  const run = async () => {
    if (!file) return setErr('Please upload your PDF resume first.');

    setErr('');
    setBusy(true);
    setRes(null);

    const form = new FormData();
    form.append('resume', file);
    form.append('jobDescription', jd);

    try {
      const data = await api('/resume/analyze', {
        method: 'POST',
        form
      });
      setRes(data.result);
      load();
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="split">
      <section className="col-left">
        <div style={{ marginBottom: 23 }}>
          <h3 style={{ marginBottom: 8 }}>Upload your resume</h3>
          <p style={{ color: '#858ba2', fontSize: 13, lineHeight: 1.7 }}>
            Let AI review your resume and discover ways to improve it.
          </p>
        </div>

        <div
          className={`drop ${over ? 'over' : ''} ${file ? 'has' : ''}`}
          onDragOver={e => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={e => {
            e.preventDefault();
            setOver(false);
            pick(e.dataTransfer.files[0]);
          }}
          onClick={() => input.current.click()}
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter') input.current.click();
          }}
        >
          <input
            ref={input}
            type="file"
            accept="application/pdf"
            hidden
            onChange={e => pick(e.target.files[0])}
          />
          <strong>{file ? file.name : 'Drop your resume here'}</strong>
          <span>{file ? 'Click to choose another PDF' : 'PDF format · Maximum 5 MB'}</span>
        </div>

        <label className="field">
          Job description
          <em>Optional · Add a job description for a match score</em>
          <textarea
            rows="7"
            value={jd}
            onChange={e => setJd(e.target.value)}
            placeholder="Paste the job description here..."
          />
        </label>

        <button className="btn" disabled={busy} onClick={run}>
          {busy ? '✦ Analyzing your resume...' : '✦ Analyze my resume'}
        </button>

        {err && <p className="err" role="alert">{err}</p>}

        {hist.length > 0 && (
          <div className="hist">
            <h4>◷ Previous analyses</h4>
            {hist.map(h => (
              <button key={h._id} onClick={() => setRes(h.result)}>
                <span>{h.fileName}</span>
                <b>{h.result?.atsScore ?? '--'}/100</b>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="col-right">
        {busy && (
          <div className="empty">
            <div className="skeleton"><i /><i /><i /></div>
            <h3>Analyzing your resume...</h3>
            <p>Our AI is reviewing your skills, keywords and experience.</p>
          </div>
        )}

        {!busy && !res && (
          <div className="empty">
            <h3>Your career insights start here</h3>
            <p>
              Upload your resume to discover your ATS score, strengths,
              missing keywords and improvement suggestions.
            </p>
          </div>
        )}

        {res && (
          <article className="report">
            <div>
              <p style={{ color: '#7258e8', fontWeight: 700, fontSize: 12 }}>
                ✦ AI ANALYSIS COMPLETE
              </p>
              <h3 style={{ marginTop: 8 }}>Your resume report</h3>
            </div>

            <div className="gauges">
              <Gauge value={res.atsScore} label="ATS score" />
              {res.jobMatchScore != null &&
                <Gauge value={res.jobMatchScore} label="Job match" />}
            </div>

            <div>
              <h4 style={{ marginBottom: 10 }}>Overview</h4>
              <p className="summary">{res.summary}</p>
            </div>

            <Block
              title="Missing keywords"
              items={res.missingKeywords}
              kind="chips"
            />

            <div className="two">
              <Block title="Your strengths" items={res.strengths} kind="good" />
              <Block title="Areas to improve" items={res.weaknesses} kind="bad" />
            </div>

            <Block title="Recommended improvements" items={res.suggestions} />
          </article>
        )}
      </section>
    </div>
  );
}

function Tracker() {
  const [jobs, setJobs] = useState([]);
  const [f, setF] = useState({ company: '', role: '' });
  const [over, setOver] = useState('');

  const load = () => api('/jobs').then(setJobs).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async e => {
    e.preventDefault();
    if (!f.company.trim() || !f.role.trim()) return;

    try {
      await api('/jobs', {
        method: 'POST',
        body: f
      });
      setF({ company: '', role: '' });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const move = async (id, status) => {
    setJobs(js => js.map(j => j._id === id ? { ...j, status } : j));
    try {
      await api(`/jobs/${id}`, {
        method: 'PATCH',
        body: { status }
      });
    } catch {
      load();
    }
  };

  const del = async id => {
    setJobs(js => js.filter(j => j._id !== id));
    try {
      await api(`/jobs/${id}`, { method: 'DELETE' });
    } catch {
      load();
    }
  };

  const n = s => jobs.filter(j => j.status === s).length;
  const applied = jobs.length - n('Wishlist');

  return (
    <>
      <div style={{ marginBottom: 25 }}>
        <h3 style={{ marginBottom: 7 }}>Your application journey</h3>
        <p style={{ color: '#858ba2', fontSize: 13 }}>
          Keep every opportunity organized in one place.
        </p>
      </div>

      <div className="stats">
        <div><b>{jobs.length}</b><span>Total applications</span></div>
        <div><b>{n('Interview')}</b><span>Interviews</span></div>
        <div>
          <b>{applied ? Math.round(((n('Interview') + n('Offer')) / applied) * 100) : 0}%</b>
          <span>Interview conversion</span>
        </div>
        <div><b>{n('Offer')}</b><span>Offers received</span></div>
      </div>

      <form className="add" onSubmit={add}>
        <input
          aria-label="Company"
          placeholder="Company name"
          value={f.company}
          onChange={e => setF({ ...f, company: e.target.value })}
          required
        />
        <input
          aria-label="Role"
          placeholder="Job role"
          value={f.role}
          onChange={e => setF({ ...f, role: e.target.value })}
          required
        />
        <button className="btn">+ Add application</button>
      </form>

      <div className="board">
        {STATUSES.map(s => (
          <section
            key={s}
            className={`lane ${over === s ? 'over' : ''}`}
            onDragOver={e => {
              e.preventDefault();
              setOver(s);
            }}
            onDragLeave={() => setOver('')}
            onDrop={e => {
              setOver('');
              move(e.dataTransfer.getData('id'), s);
            }}
          >
            <h4>{s}<span>{n(s)}</span></h4>

            {jobs.filter(j => j.status === s).map(j => (
              <div
                key={j._id}
                className="job"
                draggable
                onDragStart={e => e.dataTransfer.setData('id', j._id)}
              >
                <i style={{
                  background: `hsl(${hue(j.company)} 55% 42%)`
                }}>
                  {j.company[0]?.toUpperCase()}
                </i>
                <div>
                  <b>{j.role}</b>
                  <span>{j.company}</span>
                </div>
                <button
                  aria-label={`Delete ${j.role}`}
                  onClick={() => del(j._id)}
                >×</button>
              </div>
            ))}

            {n(s) === 0 && <p className="hint">No applications yet</p>}
          </section>
        ))}
      </div>
    </>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [tab, setTab] = useState('analyzer');

  if (!authed) {
    return <Auth onDone={() => setAuthed(true)} />;
  }

  const navItems = [
    { id: 'analyzer', icon: '✦', label: 'Resume Analyzer' },
    { id: 'tracker', icon: '▦', label: 'Job Tracker' }
  ];

  return (
    <div className="shell">
      <aside>
        <div className="logo">Résumé<span>AI</span></div>

        <p style={{
          color: '#777991',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 1.5,
          padding: '0 14px 13px'
        }}>
          WORKSPACE
        </p>

        <nav>
          {navItems.map(item => (
            <button
              key={item.id}
              className={tab === item.id ? 'on' : ''}
              onClick={() => setTab(item.id)}
            >
              <span style={{ marginRight: 11, fontSize: 17 }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{
          marginTop: 'auto',
          padding: 15,
          borderRadius: 13,
          background: '#ffffff0d',
          color: '#c8c5df',
          fontSize: 12,
          lineHeight: 1.8
        }}>
          <b style={{ color: 'white' }}>✦ Career tip</b>
          <p>Small improvements to your resume can make a big difference.</p>
        </div>

        <button
          className="out"
          onClick={() => {
            localStorage.removeItem('token');
            setAuthed(false);
          }}
        >
          ↪ Log out
        </button>
      </aside>

      <main>
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 15,
          marginBottom: 35,
          flexWrap: 'wrap'
        }}>
          <div>
            <p style={{
              color: '#858ba2',
              fontSize: 13,
              marginBottom: 7
            }}>
              YOUR PERSONAL CAREER WORKSPACE
            </p>
            <h2 style={{ marginBottom: 0 }}>
              {tab === 'analyzer' ? 'Resume Analyzer' : 'Job Tracker'}
            </h2>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            background: 'white',
            border: '1px solid #e9eaf2',
            borderRadius: 13,
            padding: '9px 15px'
          }}>
            <div style={{
              width: 35,
              height: 35,
              borderRadius: '50%',
              background: '#eeeaff',
              color: '#7258e8',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800
            }}>
              U
            </div>
            <div>
              <b style={{ fontSize: 13, display: 'block' }}>My Workspace</b>
              <span style={{ color: '#858ba2', fontSize: 11 }}>Personal account</span>
            </div>
          </div>
        </header>

        {tab === 'analyzer' ? <Analyzer /> : <Tracker />}

        <footer style={{
          textAlign: 'center',
          color: '#a0a3b4',
          fontSize: 12,
          padding: '35px 0 10px'
        }}>
          Résumé AI · Your next opportunity starts here.
        </footer>
      </main>
    </div>
  );
}
