import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { Page, ProctoringEvent, Submission } from '../../types';

export function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [events, setEvents] = useState<ProctoringEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [error, setError] = useState('');

  async function load(cursor?: string | null) {
    const { data } = await api.get<Page<Submission>>('/submissions', { params: { cursor: cursor ?? undefined, limit: 5 } });
    setSubmissions(cursor ? [...submissions, ...data.data] : data.data);
    setNextCursor(data.nextCursor);
  }

  useEffect(() => { load().catch((err) => setError(getErrorMessage(err))); }, []);

  async function loadTimeline(submission: Submission) {
    const attemptId = typeof submission.attemptId === 'string' ? submission.attemptId : (submission.attemptId as { _id: string })._id;
    const { data } = await api.get(`/attempts/${attemptId}/proctoring-events`);
    setEvents(data);
  }

  const visibleSubmissions = date ? submissions.filter((s) => s.submittedAt?.startsWith(date)) : submissions;

  return <div className="stack">{error && <div className="alert alert-danger">{error}</div>}<section className="card"><div className="card-body"><h1 className="h5">Submissions</h1><div className="mb-3"><label className="form-label">Date</label><input className="form-control" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div><div className="table-responsive"><table className="table align-middle"><thead><tr><th>Assessment</th><th>Candidate</th><th>Score</th><th>Submitted At</th><th></th></tr></thead><tbody>{visibleSubmissions.map((s) => <tr key={s._id}><td>{s.assessmentId?.title}</td><td>{s.candidateId?.email}</td><td>{s.score}</td><td>{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '-'}</td><td><button className="btn btn-link btn-sm" onClick={() => loadTimeline(s)}>Timeline</button></td></tr>)}</tbody></table></div>{nextCursor && <button className="btn btn-outline-primary btn-sm" onClick={() => load(nextCursor)}>Next page</button>}</div></section><section className="card"><div className="card-body"><h2 className="h5">Proctoring Timeline</h2>{events.length === 0 ? <div className="text-muted">Select a submission to view timeline.</div> : <ol className="list-group list-group-numbered">{events.map((event) => <li className="list-group-item" key={event._id}><div className="fw-semibold">{event.eventType}</div><div className="small text-muted">{new Date(event.timestamp).toLocaleString()}</div></li>)}</ol>}</div></section></div>;
}
