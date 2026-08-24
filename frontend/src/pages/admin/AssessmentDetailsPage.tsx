import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckboxMultiSelect } from '../../components/CheckboxMultiSelect';
import { api, getErrorMessage } from '../../services/api';
import { AdminAssignment, Assessment, Candidate, Page, Question } from '../../types';

export function AssessmentDetailsPage() {
  const { id } = useParams();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [editingAssessment, setEditingAssessment] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    title: '',
    durationMinutes: 60,
    status: 'PUBLISHED',
    description: '',
  });
  const [questionPage, setQuestionPage] = useState(0);
  const [assignmentPage, setAssignmentPage] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadDetails() {
    if (!id) return;
    const [assessmentRes, questionRes, allQuestionRes, assignmentRes, candidateRes] = await Promise.all([
      api.get<Assessment>(`/assessments/${id}`),
      api.get<Question[]>(`/assessments/${id}/questions`),
      api.get<Page<Question>>('/questions', { params: { limit: 50 } }),
      api.get<AdminAssignment[]>('/assignments'),
      api.get<Candidate[]>('/users/candidates'),
    ]);
    const currentAssignments = assignmentRes.data.filter(
      (assignment) => assignment.assessmentId?._id === id,
    );
    setAssessment(assessmentRes.data);
    setAssessmentForm({
      title: assessmentRes.data.title,
      durationMinutes: assessmentRes.data.durationMinutes,
      status: assessmentRes.data.status,
      description: assessmentRes.data.description ?? '',
    });
    setQuestions(questionRes.data);
    setAllQuestions(allQuestionRes.data.data);
    setAssignments(currentAssignments);
    setCandidates(candidateRes.data);
    setSelectedQuestionIds([]);
    setSelectedCandidateIds(
      currentAssignments
        .map((assignment) => assignment.candidateId?._id)
        .filter(Boolean),
    );
  }

  useEffect(() => {
    loadDetails().catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  useEffect(() => {
    if (!message) return;
    const timeoutId = window.setTimeout(() => setMessage(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  const assignedCandidateIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.candidateId?._id)),
    [assignments],
  );
  const unassignedCandidates = useMemo(
    () => candidates.filter((candidate) => !assignedCandidateIds.has(candidate._id)),
    [assignedCandidateIds, candidates],
  );
  const attachedQuestionIds = useMemo(
    () => new Set(questions.map((question) => question._id)),
    [questions],
  );
  const availableQuestions = useMemo(
    () => allQuestions.filter((question) => !attachedQuestionIds.has(question._id)),
    [allQuestions, attachedQuestionIds],
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
  const isAssessmentFormValid =
    assessmentForm.title.trim().length > 0 &&
    Number(assessmentForm.durationMinutes) > 0 &&
    assessmentForm.status.trim().length > 0 &&
    assessmentForm.description.trim().length > 0;

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

  async function attachQuestions(event: FormEvent) {
    event.preventDefault();
    if (!id || selectedQuestionIds.length === 0) return;
    try {
      const { data } = await api.post<Question[]>(`/assessments/${id}/questions/attach`, {
        questionIds: selectedQuestionIds,
      });
      setQuestions(data);
      setSelectedQuestionIds([]);
      setQuestionPage(0);
      setMessage('Questions added to assessment');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function removeQuestion(question: Question) {
    if (!id) return;
    if (!window.confirm(`Remove this question from the assessment?\n\n${question.questionText}`)) return;
    try {
      const { data } = await api.delete<Question[]>(`/assessments/${id}/questions/${question._id}`);
      setQuestions(data);
      setQuestionPage(0);
      setMessage('Question removed from assessment');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function updateAssessment(event: FormEvent) {
    event.preventDefault();
    if (!id || !window.confirm('Save assessment changes?')) return;
    try {
      const { data } = await api.patch<Assessment>(`/assessments/${id}`, assessmentForm);
      setAssessment(data);
      setEditingAssessment(false);
      setMessage('Assessment updated');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function unassignCandidate(assignmentId: string) {
    if (!window.confirm('Remove this candidate assignment?')) return;
    try {
      await api.delete(`/assignments/${assignmentId}`);
      setMessage('Candidate unassigned');
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
              {editingAssessment ? (
                <form onSubmit={updateAssessment} className="row g-2 flex-grow-1">
                  <div className="col-md-5"><label className="form-label">Title</label><input className="form-control form-control-sm" value={assessmentForm.title} onChange={(event) => setAssessmentForm({ ...assessmentForm, title: event.target.value })} required /></div>
                  <div className="col-md-3"><label className="form-label">Duration</label><input className="form-control form-control-sm" type="number" min="1" value={assessmentForm.durationMinutes} onChange={(event) => setAssessmentForm({ ...assessmentForm, durationMinutes: Number(event.target.value) })} required /></div>
                  <div className="col-md-4"><label className="form-label">Status</label><select className="form-select form-select-sm" value={assessmentForm.status} onChange={(event) => setAssessmentForm({ ...assessmentForm, status: event.target.value })} required><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
                  <div className="col-12"><label className="form-label">Description</label><textarea className="form-control form-control-sm" rows={2} value={assessmentForm.description} onChange={(event) => setAssessmentForm({ ...assessmentForm, description: event.target.value })} required /></div>
                  <div className="col-12 d-flex gap-2"><button className="btn btn-primary btn-sm" disabled={!isAssessmentFormValid}>Save</button><button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setEditingAssessment(false)}>Cancel</button></div>
                </form>
              ) : (
                <>
                  <div>
                    <h1 className="h4">{assessment.title}</h1>
                    <p className="text-muted mb-0">{assessment.description}</p>
                  </div>
                  <div className="d-flex gap-2 align-items-start">
                    <span className="badge text-bg-light">{assessment.status}</span>
                    <button className="btn btn-outline-primary btn-sm" onClick={() => setEditingAssessment(true)}>Edit</button>
                  </div>
                </>
              )}
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
          <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
            <h2 className="h5 mb-0">Questions</h2>
            <form onSubmit={attachQuestions} className="compact-form assessment-question-form">
              <CheckboxMultiSelect
                options={availableQuestions.map((question) => ({ value: question._id, label: question.questionText }))}
                value={selectedQuestionIds}
                onChange={setSelectedQuestionIds}
                placeholder="Add existing questions"
              />
              <button className="btn btn-primary btn-sm" disabled={selectedQuestionIds.length === 0}>Add</button>
            </form>
          </div>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead><tr><th>S.No</th><th>Question</th><th>Type</th><th>Marks</th><th></th></tr></thead>
              <tbody>
                {visibleQuestions.map((question, index) => (
                  <tr key={question._id}>
                    <td>{questionPage * questionPageSize + index + 1}</td>
                    <td>{question.questionText}</td>
                    <td>{question.type}</td>
                    <td>{question.marks}</td>
                    <td><button className="btn btn-outline-danger btn-sm" onClick={() => removeQuestion(question)}>Remove</button></td>
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
              <thead><tr><th>S.No</th><th>Name</th><th>Email</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {visibleAssignments.map((assignment, index) => (
                  <tr key={assignment._id}>
                    <td>{assignmentPage * assignmentPageSize + index + 1}</td>
                    <td>{assignment.candidateId?.name}</td>
                    <td>{assignment.candidateId?.email}</td>
                    <td><span className="badge text-bg-light">{assignment.status}</span></td>
                    <td><button className="btn btn-outline-danger btn-sm" onClick={() => unassignCandidate(assignment._id)}>Remove</button></td>
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
      <button className="page-btn" disabled={page >= pageCount - 1} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}
