import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, getErrorMessage } from '../../services/api';
import { Assignment, AttemptState, CandidateSubmissionScore, Question } from '../../types';

type AnswerValue = string | string[] | null;
type QueuedProctoringEvent = {
  eventType: string;
  timestamp: string;
};

export function CandidateDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [scores, setScores] = useState<Record<string, CandidateSubmissionScore>>({});
  const [attemptState, setAttemptState] = useState<AttemptState | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');
  const [submissionScore, setSubmissionScore] = useState<number | null>(null);
  const [completionMessage, setCompletionMessage] = useState('');
  const [proctoringWarning, setProctoringWarning] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [assignmentPage, setAssignmentPage] = useState(0);
  const [error, setError] = useState('');
  const didHydrateAnswers = useRef(false);
  const isFlushingEvents = useRef(false);
  const flushPromise = useRef<Promise<void> | null>(null);
  const isSubmittingAttempt = useRef(false);
  const isAttemptActive = attemptState?.attempt.status === 'IN_PROGRESS';
  const activeAttemptStorageKey = `activeAttemptId:${user?.id ?? 'anonymous'}`;
  const proctoringQueueKey = attemptState ? `proctoringEvents:${attemptState.attempt._id}` : '';

  async function loadAssignments() {
    const [assignmentRes, scoreRes] = await Promise.all([
      api.get('/candidate/assignments'),
      api.get<CandidateSubmissionScore[]>('/candidate/submission-scores'),
    ]);
    setAssignments(assignmentRes.data);
    setScores(Object.fromEntries(scoreRes.data.map((score) => [score.assignmentId, score])));
  }

  async function loadAttempt(attemptId: string, autoResume = false) {
    const { data } = await api.get(`/attempts/${attemptId}`);
    if (data.attempt.status === 'SUBMITTED') {
      localStorage.removeItem(activeAttemptStorageKey);
      setCompletionMessage('Assessment submitted because the timer expired.');
      await loadAssignments();
      return;
    }
    applyAttemptState(data);
  }

  function applyAttemptState(data: AttemptState) {
    setAnswers(Object.fromEntries(data.attempt.answers.map((item) => [item.questionId, item.answer])));
    didHydrateAnswers.current = false;
    setAttemptState(data);
    localStorage.setItem(activeAttemptStorageKey, data.attempt._id);
  }

  function readQueuedEvents(key: string) {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '[]') as QueuedProctoringEvent[];
    } catch {
      return [];
    }
  }

  function writeQueuedEvents(key: string, events: QueuedProctoringEvent[]) {
    localStorage.setItem(key, JSON.stringify(events));
  }

  function queueProctoringEvent(eventType: string) {
    if (!proctoringQueueKey) return;
    writeQueuedEvents(proctoringQueueKey, [
      ...readQueuedEvents(proctoringQueueKey),
      { eventType, timestamp: new Date().toISOString() },
    ]);

    if (document.visibilityState === 'visible') {
      flushProctoringEvents().catch(() => undefined);
    }
  }

  async function flushProctoringEvents() {
    if (flushPromise.current) {
      return flushPromise.current;
    }
    if (!attemptState || !proctoringQueueKey || isFlushingEvents.current) return;
    const queuedEvents = readQueuedEvents(proctoringQueueKey);
    if (queuedEvents.length === 0) return;

    isFlushingEvents.current = true;
    flushPromise.current = (async () => {
      const remaining = [...queuedEvents];
      for (const event of queuedEvents) {
        await api.post(`/attempts/${attemptState.attempt._id}/proctoring-events`, {
          eventType: event.eventType,
          metadata: { capturedAt: event.timestamp },
        });
        remaining.shift();
        writeQueuedEvents(proctoringQueueKey, remaining);
      }
    })();

    try {
      await flushPromise.current;
    } finally {
      isFlushingEvents.current = false;
      flushPromise.current = null;
    }
  }

  async function enterFullscreen() {
    if (!document.fullscreenEnabled || document.fullscreenElement) return;
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setProctoringWarning('');
    } catch {
      setProctoringWarning('Fullscreen could not be started. Please use fullscreen during the assessment.');
    }
  }

  useEffect(() => {
    loadAssignments().catch((err) => setError(getErrorMessage(err)));
    const activeAttemptId = localStorage.getItem(activeAttemptStorageKey);
    if (activeAttemptId) loadAttempt(activeAttemptId, true).catch(() => localStorage.removeItem(activeAttemptStorageKey));
  }, [activeAttemptStorageKey]);

  useEffect(() => {
    if (!completionMessage) return;
    const timeoutId = window.setTimeout(() => setCompletionMessage(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [completionMessage]);

  useEffect(() => {
    if (!attemptState) return;
    const tick = () => {
      const secondsLeft = Math.max(0, Math.floor((new Date(attemptState.attempt.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);
      if (secondsLeft === 0 && attemptState.attempt.status === 'IN_PROGRESS') {
        submitAttempt(true).catch(() => undefined);
      }
    };
    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [attemptState]);

  useEffect(() => {
    if (!attemptState || !isAttemptActive) return;
    if (!didHydrateAnswers.current) {
      didHydrateAnswers.current = true;
      return;
    }
    setSaveStatus('Saving...');
    const timeoutId = window.setTimeout(async () => {
      try {
        await api.put(`/attempts/${attemptState.attempt._id}/answers`, {
          answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
        });
        setSaveStatus('Saved');
      } catch (err) {
        setSaveStatus('Save failed');
        const message = getErrorMessage(err);
        setError(message);
        if (message.includes('Attempt not found')) {
          localStorage.removeItem(activeAttemptStorageKey);
          setAttemptState(null);
          loadAssignments().catch(() => undefined);
        }
      }
    }, 700);
    return () => window.clearTimeout(timeoutId);
  }, [answers, attemptState, isAttemptActive]);

  useEffect(() => {
    if (!attemptState || !isAttemptActive) return;
    const eventMap: Record<string, string> = { blur: 'WINDOW_BLUR', copy: 'COPY', paste: 'PASTE', contextmenu: 'RIGHT_CLICK' };
    const warningMap: Record<string, string> = {
      blur: 'Warning: leaving the assessment window is not allowed.',
      copy: 'Warning: copy attempt is not allowed during the assessment.',
      paste: 'Warning: paste attempt is not allowed during the assessment.',
      contextmenu: 'Warning: right-click is not allowed during the assessment.',
    };
    const handleSimpleEvent = (event: Event) => {
      if (event.type === 'contextmenu') event.preventDefault();
      queueProctoringEvent(eventMap[event.type]);
      setProctoringWarning(warningMap[event.type]);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        queueProctoringEvent('TAB_SWITCH');
        setProctoringWarning('Warning: tab switching is not allowed during the assessment.');
      } else {
        setProctoringWarning('Warning: tab switching is not allowed during the assessment.');
        flushProctoringEvents().catch(() => undefined);
      }
    };
    const handleFocus = () => flushProctoringEvents().catch(() => undefined);
    const handleFullscreen = () => {
      const fullscreenActive = Boolean(document.fullscreenElement);
      setIsFullscreen(fullscreenActive);
      if (!fullscreenActive) {
        queueProctoringEvent('FULLSCREEN_EXIT');
        setProctoringWarning('Warning: exiting fullscreen is not allowed during the assessment.');
      }
    };
    window.addEventListener('blur', handleSimpleEvent);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('copy', handleSimpleEvent);
    document.addEventListener('paste', handleSimpleEvent);
    document.addEventListener('contextmenu', handleSimpleEvent);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreen);
    flushProctoringEvents().catch(() => undefined);
    return () => {
      window.removeEventListener('blur', handleSimpleEvent);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('copy', handleSimpleEvent);
      document.removeEventListener('paste', handleSimpleEvent);
      document.removeEventListener('contextmenu', handleSimpleEvent);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreen);
    };
  }, [attemptState, isAttemptActive]);

  async function startAssignment(assignmentId: string) {
    setError('');
    setSubmissionScore(null);
    setProctoringWarning('');
    try {
      await enterFullscreen();
      const { data } = await api.post(`/assignments/${assignmentId}/start`);
      if (data.attempt.status === 'SUBMITTED') {
        localStorage.removeItem(activeAttemptStorageKey);
        setCompletionMessage('Assessment submitted because the timer expired.');
        await loadAssignments();
        return;
      }
      applyAttemptState(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function submitAttempt(autoSubmit = false) {
    if (!attemptState || isSubmittingAttempt.current) return;
    isSubmittingAttempt.current = true;
    setError('');
    try {
      const needsManualReview = attemptState.questions.some((question) => question.type === 'SHORT_ANSWER');
      await flushProctoringEvents();
      const { data } = await api.post(`/attempts/${attemptState.attempt._id}/submit`);
      setSubmissionScore(data.score);
      setCompletionMessage(
        autoSubmit
          ? `Time expired. Assessment submitted automatically. Objective score: ${data.score}${needsManualReview ? '. Final score is pending short answer review.' : ''}`
          : needsManualReview
          ? `Assessment submitted. Objective score: ${data.score}. Final score is pending short answer review.`
          : `Assessment submitted. Score: ${data.score}`,
      );
      localStorage.removeItem(activeAttemptStorageKey);
      localStorage.removeItem(proctoringQueueKey);
      await loadAssignments();
      setAttemptState(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      isSubmittingAttempt.current = false;
    }
  }

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
    const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [remainingSeconds]);
  const validAssignments = assignments.filter((assignment) => assignment.assessmentId);
  const completedCount = validAssignments.filter((assignment) => assignment.status === 'SUBMITTED').length;
  const pendingCount = validAssignments.filter((assignment) => assignment.status === 'ASSIGNED').length;
  const inProgressCount = validAssignments.filter((assignment) => assignment.status === 'IN_PROGRESS').length;
  const assignmentPageSize = 5;
  const assignmentPages = Math.max(1, Math.ceil(validAssignments.length / assignmentPageSize));
  const visibleAssignments = validAssignments.slice(
    assignmentPage * assignmentPageSize,
    assignmentPage * assignmentPageSize + assignmentPageSize,
  );

  if (attemptState) {
    const answeredIds = new Set(Object.entries(answers).filter(([, value]) => Array.isArray(value) ? value.length > 0 : Boolean(value)).map(([questionId]) => questionId));
    return (
      <div className="attempt-shell" id="dashboard">
        <div><button className="btn btn-outline-secondary btn-sm" onClick={() => setAttemptState(null)}>Back</button></div>
        <div className="attempt-header">
          <div><h1 className="h3 mb-1">{attemptState.assessment.title}</h1><div className="text-muted small">Status: {attemptState.attempt.status}</div></div>
          <div className="d-flex align-items-center gap-3"><div className="text-end"><div className="small text-muted">Time Remaining</div><div className="timer-text">{formattedTime}</div></div><button className="btn btn-success" disabled={!isAttemptActive} onClick={() => submitAttempt()}>Submit Test</button></div>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        {(proctoringWarning || !isFullscreen) && <div className="alert alert-warning compact-alert d-flex justify-content-between align-items-center gap-3">
          <span>{proctoringWarning || 'Warning: fullscreen is required during the assessment.'}</span>
          {!isFullscreen && <button className="btn btn-warning btn-sm" onClick={enterFullscreen}>Return to Fullscreen</button>}
        </div>}
        {submissionScore !== null && <div className="alert alert-success">Submitted. Score: {submissionScore}</div>}
        <div className="attempt-body">
          <aside className="question-navigator">
            <div className="fw-semibold mb-3">Question Navigator</div>
            <div className="question-buttons">{attemptState.questions.map((question, index) => <button className={`question-dot ${answeredIds.has(question._id) ? 'answered' : ''}`} key={question._id}>{index + 1}</button>)}</div>
            <div className="legend"><span className="legend-box answered"></span>Answered</div>
            <div className="legend"><span className="legend-box"></span>Not Answered</div>
          </aside>
          <div className="question-stack">
            {attemptState.questions.map((question, index) => (
              <div className="card question-card" key={question._id}>
                <div className="card-body">
                  <div className="d-flex justify-content-between gap-2 mb-3"><h2 className="h5 mb-0">{index + 1}. {question.questionText}</h2><span className="badge text-bg-light">{question.marks} marks</span></div>
                  <QuestionInput question={question} value={answers[question._id] ?? (question.type === 'MULTIPLE_CHOICE' ? [] : '')} disabled={!isAttemptActive} onChange={(value) => setAnswers((current) => ({ ...current, [question._id]: value }))} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="attempt-footer"><span className="text-success">Autosave: {saveStatus || 'Waiting'}</span><span className="text-warning">Do not switch tabs or windows. All activities are monitored.</span></div>
      </div>
    );
  }

  return (
    <div id="dashboard">
      <div className="summary-grid compact-summary mb-2">
        <div className="metric-card"><span>Total Assessments</span><strong>{validAssignments.length}</strong><small>Assigned</small></div>
        <div className="metric-card"><span>Completed</span><strong>{completedCount}</strong><small>Submitted</small></div>
        <div className="metric-card"><span>Pending</span><strong>{pendingCount}</strong><small>Not started</small></div>
        <div className="metric-card"><span>In Progress</span><strong>{inProgressCount}</strong><small>Active</small></div>
      </div>
      {completionMessage && <div className="alert alert-success compact-alert">{completionMessage}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card" id="assessments"><div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2"><h1 className="h5 mb-0">My Assigned Assessments</h1></div>
        <div className="table-responsive"><table className="table align-middle"><thead><tr><th>S.No</th><th>Assessment</th><th>Assigned At</th><th>Duration</th><th>Status</th><th>Score</th><th>Action</th></tr></thead><tbody>
          {visibleAssignments.map((assignment, index) => {
            const score = scores[assignment._id];
            return <tr key={assignment._id}><td>{assignmentPage * assignmentPageSize + index + 1}</td><td><div className="fw-semibold">{assignment.assessmentId.title}</div><div className="small text-muted">{assignment.assessmentId.description}</div></td><td>{new Date(assignment.assignedAt).toLocaleString()}</td><td>{assignment.assessmentId.durationMinutes} min</td><td><span className="badge text-bg-light">{assignment.status}</span></td><td>{score ? <div><div>{score.percentage}%</div>{score.requiresManualReview && <div className="small text-muted">Manual review pending</div>}</div> : '-'}</td><td><button className="btn btn-success btn-sm" disabled={assignment.status === 'SUBMITTED' || assignment.status === 'EXPIRED'} onClick={() => startAssignment(assignment._id)}>{assignment.status === 'IN_PROGRESS' ? 'Resume' : 'Start'}</button></td></tr>;
          })}
        </tbody></table></div>
        {validAssignments.length === 0 && <div className="text-muted">No assessments assigned yet.</div>}
        <PrevNextPagination page={assignmentPage} pageCount={assignmentPages} onChange={setAssignmentPage} />
      </div></div>
    </div>
  );
}

function PrevNextPagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (page: number) => void }) {
  if (pageCount <= 1) return null;
  return <div className="pagination-bar compact-pagination"><button className="page-btn" disabled={page === 0} onClick={() => onChange(page - 1)}>Previous</button><button className="page-btn" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)}>Next</button></div>;
}

function QuestionInput({ question, value, disabled, onChange }: { question: Question; value: AnswerValue; disabled: boolean; onChange: (value: AnswerValue) => void }) {
  if (question.type === 'SHORT_ANSWER') return <textarea className="form-control" rows={4} value={typeof value === 'string' ? value : ''} disabled={disabled} onChange={(event) => onChange(event.target.value)} />;
  if (question.type === 'MULTIPLE_CHOICE') {
    const selected = Array.isArray(value) ? value : [];
    return <div className="vstack gap-2">{question.options.map((option) => <label className="form-check" key={option.label}><input className="form-check-input" type="checkbox" disabled={disabled} checked={selected.includes(option.label)} onChange={(event) => onChange(event.target.checked ? [...selected, option.label] : selected.filter((item) => item !== option.label))} /><span className="form-check-label">{option.label}. {option.text}</span></label>)}</div>;
  }
  return <div className="vstack gap-2">{question.options.map((option) => <label className="form-check" key={option.label}><input className="form-check-input" type="radio" name={question._id} disabled={disabled} checked={value === option.label} onChange={() => onChange(option.label)} /><span className="form-check-label">{option.label}. {option.text}</span></label>)}</div>;
}
