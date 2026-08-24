import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import { Assessment, Candidate, Page, Question, Submission } from '../../types';

export function AdminDashboard() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<Page<Assessment>>('/assessments?limit=4'),
      api.get<Candidate[]>('/users/candidates'),
      api.get<Page<Question>>('/questions?limit=5'),
      api.get<Page<Submission>>('/submissions?limit=5'),
    ])
      .then(([assessmentRes, candidateRes, questionRes, submissionRes]) => {
        setAssessments(assessmentRes.data.data);
        setCandidates(candidateRes.data);
        setQuestions(questionRes.data.data);
        setSubmissions(submissionRes.data.data);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="summary-grid compact-summary mb-2">
        <div className="metric-card"><span>Assessments</span><strong>{assessments.length}</strong><small>Recent</small></div>
        <div className="metric-card"><span>Candidates</span><strong>{candidates.length}</strong><small>Total</small></div>
        <div className="metric-card"><span>Questions</span><strong>{questions.length}</strong><small>Recent</small></div>
        <div className="metric-card"><span>Submissions</span><strong>{submissions.length}</strong><small>Recent</small></div>
      </div>
      <section className="card compact-card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h1 className="h5 mb-0">Recent Assessments</h1>
            <Link to="/admin/assessments" className="btn btn-link btn-sm">View all</Link>
          </div>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead><tr><th>Title</th><th>Duration</th><th>Status</th><th>Description</th></tr></thead>
              <tbody>{assessments.map((a) => <tr key={a._id}><td className="fw-semibold">{a.title}</td><td>{a.durationMinutes} min</td><td><span className="badge text-bg-light">{a.status}</span></td><td>{a.description}</td></tr>)}</tbody>
            </table>
          </div>
          <Link to="/admin/assessments" className="btn btn-primary">Create Assessment</Link>
        </div>
      </section>
    </div>
  );
}
