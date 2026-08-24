import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckboxMultiSelect } from '../../components/CheckboxMultiSelect';
import { api, getErrorMessage } from '../../services/api';
import { Page, Question } from '../../types';

export function CreateAssessmentPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', durationMinutes: 60, status: 'PUBLISHED', description: '' });

  useEffect(() => {
    api.get<Page<Question>>('/questions?limit=50')
      .then((res) => setQuestions(res.data.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const isFormValid =
    form.title.trim().length > 0 &&
    Number(form.durationMinutes) > 0 &&
    form.status.trim().length > 0 &&
    form.description.trim().length > 0 &&
    questionIds.length > 0;

  async function createAssessment(event: FormEvent) {
    event.preventDefault();
    if (questionIds.length === 0) {
      setError('Select at least one question');
      return;
    }
    try {
      const { data } = await api.post('/assessments', form);
      if (questionIds.length > 0) {
        await api.post(`/assessments/${data._id}/questions/attach`, { questionIds });
      }
      navigate('/admin/assessments');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="stack">
      <div><Link className="btn btn-outline-secondary btn-sm" to="/admin/assessments">Back</Link></div>
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="card">
        <div className="card-body">
          <h1 className="h5">Create Assessment</h1>
          <form onSubmit={createAssessment} className="row g-3">
            <div className="col-md-6"><label className="form-label">Title</label><input className="form-control" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></div>
            <div className="col-md-3"><label className="form-label">Duration (Minutes)</label><input className="form-control" type="number" min="1" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} required /></div>
            <div className="col-md-3"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} required><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
            <div className="col-12"><label className="form-label">Description</label><textarea className="form-control" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></div>
            <div className="col-12"><label className="form-label">Questions</label><CheckboxMultiSelect options={questions.map((question) => ({ value: question._id, label: question.questionText }))} value={questionIds} onChange={setQuestionIds} placeholder="Select questions" /></div>
            <div className="col-12"><button className="btn btn-primary" disabled={!isFormValid}>Create Assessment</button></div>
          </form>
        </div>
      </section>
    </div>
  );
}
