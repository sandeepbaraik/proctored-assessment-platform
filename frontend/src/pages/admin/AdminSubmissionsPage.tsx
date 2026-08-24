import { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { Page, ProctoringEvent, Submission } from '../../types';

export function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [events, setEvents] = useState<ProctoringEvent[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelinePage, setTimelinePage] = useState(0);
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [date, setDate] = useState('');
  const [error, setError] = useState('');

  async function load(cursor?: string | null, targetPage = 0) {
    const { data } = await api.get<Page<Submission>>('/submissions', { params: { cursor: cursor ?? undefined, limit: 5 } });
    setSubmissions(data.data);
    setNextCursor(data.nextCursor);
    setPage(targetPage);
  }

  useEffect(() => { load().catch((err) => setError(getErrorMessage(err))); }, []);

  async function goNext() {
    if (!nextCursor) return;
    const nextPage = page + 1;
    const cursors = [...pageCursors];
    cursors[nextPage] = nextCursor;
    setPageCursors(cursors);
    await load(nextCursor, nextPage);
  }

  async function goPrevious() {
    if (page === 0) return;
    await load(pageCursors[page - 1], page - 1);
  }

  function getAttemptId(submission: Submission) {
    const attempt = submission.attemptId as unknown;
    if (typeof attempt === 'string') return attempt;
    if (attempt && typeof attempt === 'object' && '_id' in attempt) {
      return String((attempt as { _id: string })._id);
    }
    return '';
  }

  async function loadTimeline(submission: Submission) {
    const attemptId = getAttemptId(submission);
    setSelectedSubmission(submission);
    setEvents([]);
    setTimelinePage(0);
    setError('');

    if (!attemptId) {
      setError('Unable to load timeline because this submission does not have an attempt id.');
      return;
    }

    try {
      setTimelineLoading(true);
      const { data } = await api.get<ProctoringEvent[]>(`/attempts/${attemptId}/proctoring-events`);
      setEvents(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTimelineLoading(false);
    }
  }

  const visibleSubmissions = date ? submissions.filter((s) => s.submittedAt?.startsWith(date)) : submissions;
  const timelinePageSize = 5;
  const timelinePages = Math.max(1, Math.ceil(events.length / timelinePageSize));
  const visibleEvents = events.slice(
    timelinePage * timelinePageSize,
    timelinePage * timelinePageSize + timelinePageSize,
  );

  return <div className="stack">{error && <div className="alert alert-danger">{error}</div>}<section className="card"><div className="card-body"><h1 className="h5">Submissions</h1><div className="mb-3"><label className="form-label">Date</label><input className="form-control" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div><div className="table-responsive"><table className="table align-middle"><thead><tr><th>S.No</th><th>Assessment</th><th>Candidate</th><th>Objective Score</th><th>Submitted At</th><th></th></tr></thead><tbody>{visibleSubmissions.map((s, index) => <tr key={s._id} className={selectedSubmission?._id === s._id ? 'table-active' : ''}><td>{page * 5 + index + 1}</td><td>{s.assessmentId?.title}</td><td>{s.candidateId?.email}</td><td>{s.score}</td><td>{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '-'}</td><td><button className="btn btn-link btn-sm" disabled={timelineLoading && selectedSubmission?._id === s._id} onClick={() => loadTimeline(s)}>{timelineLoading && selectedSubmission?._id === s._id ? 'Loading...' : 'Timeline'}</button></td></tr>)}</tbody></table></div><div className="pagination-bar compact-pagination"><button className="page-btn" disabled={page === 0} onClick={goPrevious}>Previous</button><button className="page-btn" disabled={!nextCursor} onClick={goNext}>Next</button></div></div></section><section className="card"><div className="card-body"><div className="d-flex justify-content-between gap-3 align-items-start"><div><h2 className="h5 mb-1">Proctoring Timeline</h2>{selectedSubmission && <div className="small text-muted">{selectedSubmission.candidateId?.email} - {selectedSubmission.assessmentId?.title}</div>}</div>{selectedSubmission && <span className="badge text-bg-light">{events.length} events</span>}</div>{!selectedSubmission ? <div className="text-muted mt-3">Select a submission to view captured proctoring events.</div> : timelineLoading ? <div className="text-muted mt-3">Loading timeline...</div> : events.length === 0 ? <div className="text-muted mt-3">No proctoring events captured for this submission.</div> : <><div className="table-responsive mt-3"><table className="table align-middle"><thead><tr><th>S.No</th><th>Event</th><th>Timestamp</th></tr></thead><tbody>{visibleEvents.map((event, index) => <tr key={event._id}><td>{timelinePage * timelinePageSize + index + 1}</td><td>{event.eventType}</td><td>{new Date(event.timestamp).toLocaleString()}</td></tr>)}</tbody></table></div><div className="pagination-bar compact-pagination"><button className="page-btn" disabled={timelinePage === 0} onClick={() => setTimelinePage((current) => current - 1)}>Previous</button><button className="page-btn" disabled={timelinePage >= timelinePages - 1} onClick={() => setTimelinePage((current) => current + 1)}>Next</button></div></>}</div></section></div>;
}
