import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckboxMultiSelect } from '../../components/CheckboxMultiSelect';
import { api, getErrorMessage } from '../../services/api';
import { AdminAssignment, Assessment, Candidate, Question } from '../../types';

export function AssessmentDetailsPage() {
  const { id } = useParams();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [questionPage, setQuestionPage] = useState(0);
  const [assignmentPage, setAssignmentPage] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadDetails() {
    if (!id) return;
    const [assessmentRes, questionRes, assignmentRes, candidateRes] = await Promise.all([
      api.get<Assessment>(`/assessments/${id}`),
      api.get<Question[]>(`/assessments/${id}/questions`),
      api.get<AdminAssignment[]>('/assignments'),
      api.get<Candidate[]>('/users/candidates'),
    ]);
    const currentAssignments = assignmentRes.data.filter(
      (assignment) => assignment.assessmentId?._id === id,
    );
    setAssessment(assessmentRes.data);
    setQuestions(questionRes.data);
    setAssignments(currentAssignments);
    setCandidates(candidateRes.data);
    setSelectedCandidateIds(
      currentAssignments
        .map((assignment) => assignment.candidateId?._id)
        .filter(Boolean),
    );
  }

  useEffect(() => {
    loadDetails().catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  const assignedCandidateIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.candidateId?._id)),
    [assignments],
  );
  const unassignedCandidates = useMemo(
    () => candidates.filter((candidate) => !assignedCandidateIds.has(candidate._id)),
    [assignedCandidateIds, candidates],
  );
  const questionPageSize = 5;
  const assignmentPageSize = 4;
  const questionPages = Math.max(1, Math.ceil(questions.length / questionPageSize));
  const assignmentPages = Math.max(1, Math.ceil(assignments.length / assignmentPageSize));
  const visibleQuestions = questions.slice(
    questionPage * questionPageSize,
    questionPage * questionPageSize + questionPageSize,
  );
  const visibleAssignments = assignments.slice(
    assignmentPage * assignmentPageSize,
    assignmentPage * assignmentPageSize + assignmentPageSize,
  );

  async function assignCandidates(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    const newCandidateIds = selectedCandidateIds.filter(
      (candidateId) => !assignedCandidateIds.has(candidateId),
    );
    if (newCandidateIds.length === 0) {
      setMessage('Selected candidates are already assigned');
      return;
    }
    try {
      await api.post(`/assessments/${id}/assign`, { candidateIds: newCandidateIds });
      setMessage('Candidates assigned');
      await loadDetails();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="stack compact-detail">
      <div><Link className="btn btn-outline-secondary btn-sm" to="/admin/assessments">Back</Link></div>
      {message && <div className="alert alert-success compact-alert">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {assessment && (
        <section className="card detail-hero">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div>
                <h1 className="h4">{assessment.title}</h1>
                <p className="text-muted mb-0">{assessment.description}</p>
              </div>
              <span className="badge text-bg-light">{assessment.status}</span>
            </div>
            <div className="detail-stats mt-2">
              <div><span>Duration</span><strong>{assessment.durationMinutes} min</strong></div>
              <div><span>Questions</span><strong>{questions.length}</strong></div>
              <div><span>Status</span><strong>{assessment.status}</strong></div>
            </div>
          </div>
        </section>
      )}
      <div className="detail-grid">
      <section className="card">
        <div className="card-body">
          <h2 className="h5">Questions</h2>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead><tr><th>Order</th><th>Question</th><th>Type</th><th>Marks</th></tr></thead>
              <tbody>
                {visibleQuestions.map((question) => (
                  <tr key={question._id}>
                    <td>{question.order}</td>
                    <td>{question.questionText}</td>
                    <td>{question.type}</td>
                    <td>{question.marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SimplePagination page={questionPage} pageCount={questionPages} onChange={setQuestionPage} />
        </div>
      </section>
      <section className="card">
        <div className="card-body">
          <h2 className="h5">Assign Candidates</h2>
          <form onSubmit={assignCandidates} className="compact-form mb-2">
            <CheckboxMultiSelect
              options={unassignedCandidates.map((candidate) => ({ value: candidate._id, label: candidate.email }))}
              value={selectedCandidateIds.filter((candidateId) => !assignedCandidateIds.has(candidateId))}
              onChange={setSelectedCandidateIds}
              placeholder="Select candidates"
            />
            <button className="btn btn-primary btn-sm">Assign</button>
          </form>
          <h2 className="h5">Assigned Candidates</h2>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead><tr><th>Name</th><th>Email</th><th>Status</th></tr></thead>
              <tbody>
                {visibleAssignments.map((assignment) => (
                  <tr key={assignment._id}>
                    <td>{assignment.candidateId?.name}</td>
                    <td>{assignment.candidateId?.email}</td>
                    <td><span className="badge text-bg-light">{assignment.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SimplePagination page={assignmentPage} pageCount={assignmentPages} onChange={setAssignmentPage} />
          {assignments.length === 0 && <div className="text-muted">No candidates assigned yet.</div>}
        </div>
      </section>
      </div>
    </div>
  );
}

function SimplePagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="pagination-bar compact-pagination">
      <button className="page-btn" disabled={page === 0} onClick={() => onChange(page - 1)}>Previous</button>
      {Array.from({ length: pageCount }).slice(0, 3).map((_, index) => (
        <button className={`page-btn number ${page === index ? 'active' : ''}`} key={index} onClick={() => onChange(index)}>
          {index + 1}
        </button>
      ))}
      <button className="page-btn" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}
