import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import { Assessment } from '../../types';

export function EditAssessmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    durationMinutes: 60,
    status: 'PUBLISHED',
    description: '',
  });

  useEffect(() => {
    if (!id) return;
    api.get<Assessment>(`/assessments/${id}`)
      .then((res) => setForm({
        title: res.data.title,
        durationMinutes: res.data.durationMinutes,
        status: res.data.status,
        description: res.data.description ?? '',
      }))
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  async function updateAssessment(event: FormEvent) {
    event.preventDefault();
    if (!id || !window.confirm('Save assessment changes?')) return;
    try {
      await api.patch(`/assessments/${id}`, form);
      navigate(`/admin/assessments/${id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="stack">
      <div><Link className="btn btn-outline-secondary btn-sm" to={id ? `/admin/assessments/${id}` : '/admin/assessments'}>Back</Link></div>
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="card">
        <div className="card-body">
          <h1 className="h5">Edit Assessment</h1>
          <form onSubmit={updateAssessment} className="row g-3">
            <div className="col-md-6"><label className="form-label">Title</label><input className="form-control" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></div>
            <div className="col-md-3"><label className="form-label">Duration (Minutes)</label><input className="form-control" type="number" min="1" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} required /></div>
            <div className="col-md-3"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} required><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></div>
            <div className="col-12"><label className="form-label">Description</label><textarea className="form-control" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></div>
            <div className="col-12"><button className="btn btn-primary">Save Changes</button></div>
          </form>
        </div>
      </section>
    </div>
  );
}
