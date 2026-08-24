import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import { Assessment, Candidate, Page } from '../../types';

type CountResponse = {
  total: number;
};

export function AdminDashboard() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totals, setTotals] = useState({
    assessments: 0,
    questions: 0,
    submissions: 0,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<Page<Assessment>>('/assessments?limit=4'),
      api.get<Candidate[]>('/users/candidates'),
      api.get<CountResponse>('/assessments/count'),
      api.get<CountResponse>('/questions/count'),
      api.get<CountResponse>('/submissions/count'),
    ])
      .then(([assessmentRes, candidateRes, assessmentCountRes, questionCountRes, submissionCountRes]) => {
        setAssessments(assessmentRes.data.data);
        setCandidates(candidateRes.data);
        setTotals({
          assessments: assessmentCountRes.data.total,
          questions: questionCountRes.data.total,
          submissions: submissionCountRes.data.total,
        });
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="summary-grid compact-summary mb-2">
        <div className="metric-card"><span>Assessments</span><strong>{totals.assessments}</strong><small>Total</small></div>
        <div className="metric-card"><span>Candidates</span><strong>{candidates.length}</strong><small>Total</small></div>
        <div className="metric-card"><span>Questions</span><strong>{totals.questions}</strong><small>Total</small></div>
        <div className="metric-card"><span>Submissions</span><strong>{totals.submissions}</strong><small>Total</small></div>
      </div>
      <section className="card compact-card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h1 className="h5 mb-0">Recent Assessments</h1>
            <Link to="/admin/assessments" className="btn btn-link btn-sm">View all</Link>
          </div>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead><tr><th>S.No</th><th>Title</th><th>Duration</th><th>Status</th><th>Description</th></tr></thead>
              <tbody>{assessments.map((a, index) => <tr key={a._id}><td>{index + 1}</td><td className="fw-semibold">{a.title}</td><td>{a.durationMinutes} min</td><td><span className="badge text-bg-light">{a.status}</span></td><td>{a.description}</td></tr>)}</tbody>
            </table>
          </div>
          <Link to="/admin/assessments/new" className="btn btn-primary">Create Assessment</Link>
        </div>
      </section>
    </div>
  );
}
