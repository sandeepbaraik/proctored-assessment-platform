import { FormEvent, useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../services/api';
import { Assessment, Candidate, ProctoringEvent, Question, Submission } from '../../types';

const emptyQuestion = {
  type: 'SINGLE_CHOICE',
  questionText: '',
  optionsText: 'A=Option A\nB=Option B',
  correctAnswers: 'A',
  marks: 1,
  order: 1,
};

export function AdminDashboard() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [events, setEvents] = useState<ProctoringEvent[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [assessmentForm, setAssessmentForm] = useState({
    title: '',
    description: '',
    durationMinutes: 30,
    status: 'PUBLISHED',
  });
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [candidateId, setCandidateId] = useState('');

  async function loadAdminData() {
    const [assessmentRes, candidateRes, submissionRes] = await Promise.all([
      api.get('/assessments'),
      api.get('/users/candidates'),
      api.get('/submissions'),
    ]);
    setAssessments(assessmentRes.data);
    setCandidates(candidateRes.data);
    setSubmissions(submissionRes.data);
    if (!selectedAssessmentId && assessmentRes.data[0]) setSelectedAssessmentId(assessmentRes.data[0]._id);
  }

  useEffect(() => {
    loadAdminData().catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    if (!selectedAssessmentId) return;
    api.get(`/assessments/${selectedAssessmentId}/questions`)
      .then((res) => setQuestions(res.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, [selectedAssessmentId]);

  async function createAssessment(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/assessments', assessmentForm);
      setMessage('Assessment created');
      setAssessmentForm({ title: '', description: '', durationMinutes: 30, status: 'PUBLISHED' });
      await loadAdminData();
      setSelectedAssessmentId(data._id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function addQuestion(event: FormEvent) {
    event.preventDefault();
    if (!selectedAssessmentId) return;
    const options = questionForm.optionsText.split('\n').filter(Boolean).map((line) => {
      const [label, ...text] = line.split('=');
      return { label: label.trim(), text: text.join('=').trim() };
    });
    try {
      await api.post(`/assessments/${selectedAssessmentId}/questions`, {
        type: questionForm.type,
        questionText: questionForm.questionText,
        options: questionForm.type === 'SHORT_ANSWER' ? [] : options,
        correctAnswers: questionForm.type === 'SHORT_ANSWER' ? [] : questionForm.correctAnswers.split(',').map((x) => x.trim()).filter(Boolean),
        marks: Number(questionForm.marks),
        order: Number(questionForm.order),
      });
      setMessage('Question added');
      setQuestionForm({ ...emptyQuestion, order: questionForm.order + 1 });
      const { data } = await api.get(`/assessments/${selectedAssessmentId}/questions`);
      setQuestions(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function assignCandidate(event: FormEvent) {
    event.preventDefault();
    if (!selectedAssessmentId || !candidateId) return;
    try {
      await api.post(`/assessments/${selectedAssessmentId}/assign`, { candidateIds: [candidateId] });
      setMessage('Assessment assigned');
      setCandidateId('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function loadTimeline(submission: Submission) {
    const attemptId = typeof submission.attemptId === 'string' ? submission.attemptId : (submission.attemptId as { _id: string })._id;
    try {
      const { data } = await api.get(`/attempts/${attemptId}/proctoring-events`);
      setEvents(data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="admin-grid">
      <div>
        <h1 className="h3 mb-3">Admin Dashboard</h1>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <section className="card mb-3"><div className="card-body">
          <h2 className="h5">Create Assessment</h2>
          <form onSubmit={createAssessment} className="row g-2">
            <div className="col-md-6"><input className="form-control" placeholder="Title" value={assessmentForm.title} onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })} required /></div>
            <div className="col-md-3"><input className="form-control" type="number" min="1" value={assessmentForm.durationMinutes} onChange={(e) => setAssessmentForm({ ...assessmentForm, durationMinutes: Number(e.target.value) })} required /></div>
            <div className="col-md-3"><select className="form-select" value={assessmentForm.status} onChange={(e) => setAssessmentForm({ ...assessmentForm, status: e.target.value })}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></div>
            <div className="col-12"><textarea className="form-control" placeholder="Description" value={assessmentForm.description} onChange={(e) => setAssessmentForm({ ...assessmentForm, description: e.target.value })} /></div>
            <div className="col-12"><button className="btn btn-primary">Create</button></div>
          </form>
        </div></section>

        <section className="card mb-3"><div className="card-body">
          <div className="d-flex justify-content-between gap-2 align-items-center mb-3">
            <h2 className="h5 mb-0">Questions</h2>
            <select className="form-select w-auto" value={selectedAssessmentId} onChange={(e) => setSelectedAssessmentId(e.target.value)}>
              <option value="">Select assessment</option>
              {assessments.map((a) => <option key={a._id} value={a._id}>{a.title}</option>)}
            </select>
          </div>
          <form onSubmit={addQuestion} className="row g-2 mb-3">
            <div className="col-md-4"><select className="form-select" value={questionForm.type} onChange={(e) => setQuestionForm({ ...questionForm, type: e.target.value })}><option value="SINGLE_CHOICE">Single Choice</option><option value="MULTIPLE_CHOICE">Multiple Choice</option><option value="SHORT_ANSWER">Short Answer</option></select></div>
            <div className="col-md-4"><input className="form-control" type="number" min="0" value={questionForm.marks} onChange={(e) => setQuestionForm({ ...questionForm, marks: Number(e.target.value) })} /></div>
            <div className="col-md-4"><input className="form-control" type="number" min="0" value={questionForm.order} onChange={(e) => setQuestionForm({ ...questionForm, order: Number(e.target.value) })} /></div>
            <div className="col-12"><textarea className="form-control" placeholder="Question text" value={questionForm.questionText} onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })} required /></div>
            {questionForm.type !== 'SHORT_ANSWER' && <>
              <div className="col-md-8"><textarea className="form-control" rows={3} value={questionForm.optionsText} onChange={(e) => setQuestionForm({ ...questionForm, optionsText: e.target.value })} /></div>
              <div className="col-md-4"><input className="form-control" placeholder="Correct labels: A,B" value={questionForm.correctAnswers} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswers: e.target.value })} /></div>
            </>}
            <div className="col-12"><button className="btn btn-primary" disabled={!selectedAssessmentId}>Add Question</button></div>
          </form>
          <div className="list-group">{questions.map((q) => <div className="list-group-item" key={q._id}><div className="fw-semibold">{q.order}. {q.questionText}</div><div className="small text-muted">{q.type} · {q.marks} marks</div></div>)}</div>
        </div></section>
      </div>

      <div>
        <section className="card mb-3"><div className="card-body">
          <h2 className="h5">Assign Candidate</h2>
          <form onSubmit={assignCandidate} className="d-flex gap-2">
            <select className="form-select" value={candidateId} onChange={(e) => setCandidateId(e.target.value)} required><option value="">Candidate</option>{candidates.map((c) => <option key={c._id} value={c._id}>{c.email}</option>)}</select>
            <button className="btn btn-primary" disabled={!selectedAssessmentId}>Assign</button>
          </form>
        </div></section>

        <section className="card"><div className="card-body">
          <div className="d-flex justify-content-between mb-2"><h2 className="h5 mb-0">Submissions</h2><button className="btn btn-outline-secondary btn-sm" onClick={loadAdminData}>Refresh</button></div>
          <div className="table-responsive"><table className="table table-sm"><thead><tr><th>Assessment</th><th>Candidate</th><th>Score</th><th></th></tr></thead><tbody>
            {submissions.map((s) => <tr key={s._id}><td>{s.assessmentId?.title}</td><td>{s.candidateId?.email}</td><td>{s.score}</td><td><button className="btn btn-link btn-sm" onClick={() => loadTimeline(s)}>Timeline</button></td></tr>)}
          </tbody></table></div>
          {events.length > 0 && <ol className="list-group list-group-numbered mt-3">{events.map((e) => <li className="list-group-item" key={e._id}><div className="fw-semibold">{e.eventType}</div><div className="small text-muted">{new Date(e.timestamp).toLocaleString()}</div></li>)}</ol>}
        </div></section>
      </div>
    </div>
  );
}
