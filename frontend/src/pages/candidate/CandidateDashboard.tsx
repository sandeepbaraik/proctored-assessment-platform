import { useEffect, useMemo, useRef, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { Assignment, AttemptState, Question } from '../../types';

type AnswerValue = string | string[] | null;

export function CandidateDashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attemptState, setAttemptState] = useState<AttemptState | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');
  const [submissionScore, setSubmissionScore] = useState<number | null>(null);
  const [error, setError] = useState('');
  const didHydrateAnswers = useRef(false);
  const isAttemptActive = attemptState?.attempt.status === 'IN_PROGRESS';

  async function loadAssignments() {
    const { data } = await api.get('/candidate/assignments');
    setAssignments(data);
  }

  async function loadAttempt(attemptId: string, autoResume = false) {
    const { data } = await api.get(`/attempts/${attemptId}`);
    if (autoResume && data.attempt.status !== 'IN_PROGRESS') {
      localStorage.removeItem('activeAttemptId');
      return;
    }
    applyAttemptState(data);
  }

  function applyAttemptState(data: AttemptState) {
    setAnswers(Object.fromEntries(data.attempt.answers.map((item) => [item.questionId, item.answer])));
    didHydrateAnswers.current = false;
    setAttemptState(data);
    localStorage.setItem('activeAttemptId', data.attempt._id);
  }

  useEffect(() => {
    loadAssignments().catch((err) => setError(getErrorMessage(err)));
    const activeAttemptId = localStorage.getItem('activeAttemptId');
    if (activeAttemptId) loadAttempt(activeAttemptId, true).catch(() => localStorage.removeItem('activeAttemptId'));
  }, []);

  useEffect(() => {
    if (!attemptState) return;
    const tick = () => setRemainingSeconds(Math.max(0, Math.floor((new Date(attemptState.attempt.expiresAt).getTime() - Date.now()) / 1000)));
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
        setError(getErrorMessage(err));
      }
    }, 700);
    return () => window.clearTimeout(timeoutId);
  }, [answers, attemptState, isAttemptActive]);

  useEffect(() => {
    if (!attemptState || !isAttemptActive) return;
    const eventMap: Record<string, string> = { blur: 'WINDOW_BLUR', copy: 'COPY', paste: 'PASTE', contextmenu: 'RIGHT_CLICK' };
    const sendEvent = (eventType: string) => api.post(`/attempts/${attemptState.attempt._id}/proctoring-events`, { eventType }).catch(() => undefined);
    const handleSimpleEvent = (event: Event) => {
      if (event.type === 'contextmenu') event.preventDefault();
      sendEvent(eventMap[event.type]);
    };
    const handleVisibility = () => document.visibilityState === 'hidden' && sendEvent('TAB_SWITCH');
    const handleFullscreen = () => !document.fullscreenElement && sendEvent('FULLSCREEN_EXIT');
    window.addEventListener('blur', handleSimpleEvent);
    document.addEventListener('copy', handleSimpleEvent);
    document.addEventListener('paste', handleSimpleEvent);
    document.addEventListener('contextmenu', handleSimpleEvent);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => {
      window.removeEventListener('blur', handleSimpleEvent);
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
    try {
      const { data } = await api.post(`/assignments/${assignmentId}/start`);
      applyAttemptState(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function submitAttempt() {
    if (!attemptState) return;
    setError('');
    try {
      const { data } = await api.post(`/attempts/${attemptState.attempt._id}/submit`);
      setSubmissionScore(data.score);
      localStorage.removeItem('activeAttemptId');
      await loadAttempt(attemptState.attempt._id);
      await loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
    const seconds = (remainingSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [remainingSeconds]);

  if (attemptState) {
    const answeredIds = new Set(Object.entries(answers).filter(([, value]) => Array.isArray(value) ? value.length > 0 : Boolean(value)).map(([questionId]) => questionId));
    return (
      <div className="attempt-shell" id="dashboard">
        <div className="attempt-header">
          <div><h1 className="h3 mb-1">{attemptState.assessment.title}</h1><div className="text-muted small">Status: {attemptState.attempt.status}</div></div>
          <div className="d-flex align-items-center gap-3"><div className="text-end"><div className="small text-muted">Time Remaining</div><div className="timer-text">{formattedTime}</div></div><button className="btn btn-success" disabled={!isAttemptActive} onClick={submitAttempt}>Submit Test</button></div>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        {submissionScore !== null && <div className="alert alert-success">Submitted. Score: {submissionScore}</div>}
        <div className="attempt-body">
          <aside className="question-navigator">
            <div className="fw-semibold mb-3">Question Navigator</div>
            <div className="question-buttons">{attemptState.questions.map((question, index) => <button className={`question-dot ${answeredIds.has(question._id) ? 'answered' : ''}`} key={question._id}>{index + 1}</button>)}</div>
            <div className="legend"><span className="legend-box answered"></span>Answered</div>
            <div className="legend"><span className="legend-box"></span>Not Answered</div>
          </aside>
          <div className="question-stack">
            {attemptState.questions.map((question) => (
              <div className="card question-card" key={question._id}>
                <div className="card-body">
                  <div className="d-flex justify-content-between gap-2 mb-3"><h2 className="h5 mb-0">{question.order}. {question.questionText}</h2><span className="badge text-bg-light">{question.marks} marks</span></div>
                  <QuestionInput question={question} value={answers[question._id] ?? (question.type === 'MULTIPLE_CHOICE' ? [] : '')} disabled={!isAttemptActive} onChange={(value) => setAnswers((current) => ({ ...current, [question._id]: value }))} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="attempt-footer"><span className="text-success">Autosave: {saveStatus || 'Waiting'}</span><span className="text-warning">Do not switch tabs or windows. All activities are monitored.</span></div>
        <button className="btn btn-outline-secondary mt-3" onClick={() => setAttemptState(null)}>Back</button>
      </div>
    );
  }

  return (
    <div id="dashboard">
      <h1 className="h3 mb-3">My Assigned Assessments</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card" id="assessments"><div className="card-body">
        <div className="table-responsive"><table className="table align-middle"><thead><tr><th>Assessment</th><th>Duration</th><th>Status</th><th>Action</th></tr></thead><tbody>
          {assignments.filter((assignment) => assignment.assessmentId).map((assignment) => <tr key={assignment._id}><td><div className="fw-semibold">{assignment.assessmentId.title}</div><div className="small text-muted">{assignment.assessmentId.description}</div></td><td>{assignment.assessmentId.durationMinutes} min</td><td><span className="badge text-bg-light">{assignment.status}</span></td><td><button className="btn btn-success btn-sm" disabled={assignment.status === 'SUBMITTED' || assignment.status === 'EXPIRED'} onClick={() => startAssignment(assignment._id)}>{assignment.status === 'IN_PROGRESS' ? 'Resume' : 'Start'}</button></td></tr>)}
        </tbody></table></div>
        {assignments.filter((assignment) => assignment.assessmentId).length === 0 && <div className="text-muted">No assessments assigned yet.</div>}
      </div></div>
      <div className="card mt-3"><div className="card-body"><div className="fw-semibold">Instructions</div><div className="small text-muted">Read questions carefully. Answers autosave while your attempt is active.</div></div></div>
    </div>
  );
}

function QuestionInput({ question, value, disabled, onChange }: { question: Question; value: AnswerValue; disabled: boolean; onChange: (value: AnswerValue) => void }) {
  if (question.type === 'SHORT_ANSWER') return <textarea className="form-control" rows={4} value={typeof value === 'string' ? value : ''} disabled={disabled} onChange={(event) => onChange(event.target.value)} />;
  if (question.type === 'MULTIPLE_CHOICE') {
    const selected = Array.isArray(value) ? value : [];
    return <div className="vstack gap-2">{question.options.map((option) => <label className="form-check" key={option.label}><input className="form-check-input" type="checkbox" disabled={disabled} checked={selected.includes(option.label)} onChange={(event) => onChange(event.target.checked ? [...selected, option.label] : selected.filter((item) => item !== option.label))} /><span className="form-check-label">{option.label}. {option.text}</span></label>)}</div>;
  }
  return <div className="vstack gap-2">{question.options.map((option) => <label className="form-check" key={option.label}><input className="form-check-input" type="radio" name={question._id} disabled={disabled} checked={value === option.label} onChange={() => onChange(option.label)} /><span className="form-check-label">{option.label}. {option.text}</span></label>)}</div>;
}
