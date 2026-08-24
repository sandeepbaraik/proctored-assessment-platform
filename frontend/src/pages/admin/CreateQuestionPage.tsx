import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckboxMultiSelect } from '../../components/CheckboxMultiSelect';
import { api, getErrorMessage } from '../../services/api';

const labels = ['A', 'B', 'C', 'D', 'E'];

export function CreateQuestionPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ type: 'SINGLE_CHOICE', questionText: '', marks: 1, order: 1, optionCount: 4, correctAnswers: [] as string[] });
  const [optionText, setOptionText] = useState<Record<string, string>>({ A: '', B: '', C: '', D: '', E: '' });
  const visibleLabels = useMemo(() => labels.slice(0, Number(form.optionCount)), [form.optionCount]);

  async function createQuestion(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post('/questions', {
        type: form.type,
        questionText: form.questionText,
        marks: Number(form.marks),
        order: Number(form.order),
        options: form.type === 'SHORT_ANSWER' ? [] : visibleLabels.map((label) => ({ label, text: optionText[label] })),
        correctAnswers: form.type === 'SHORT_ANSWER' ? [] : form.correctAnswers,
      });
      navigate('/admin/questions');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="stack">
      <div><Link className="btn btn-outline-secondary btn-sm" to="/admin/questions">Back</Link></div>
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="card">
        <div className="card-body">
          <h1 className="h5">Create Question</h1>
          <form onSubmit={createQuestion} className="row g-3">
            <div className="col-md-4"><label className="form-label">Question Type</label><select className="form-select" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value, correctAnswers: [] })}><option value="SINGLE_CHOICE">Single Choice</option><option value="MULTIPLE_CHOICE">Multiple Choice</option><option value="SHORT_ANSWER">Short Answer</option></select></div>
            <div className="col-md-4"><label className="form-label">Marks</label><input className="form-control" type="number" min="0" value={form.marks} onChange={(event) => setForm({ ...form, marks: Number(event.target.value) })} /></div>
            <div className="col-md-4"><label className="form-label">Display Order</label><input className="form-control" type="number" min="0" value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) })} /></div>
            <div className="col-12"><label className="form-label">Question Text</label><textarea className="form-control" value={form.questionText} onChange={(event) => setForm({ ...form, questionText: event.target.value })} required /></div>
            {form.type !== 'SHORT_ANSWER' && <>
              <div className="col-md-4"><label className="form-label">Number of Options</label><select className="form-select" value={form.optionCount} onChange={(event) => setForm({ ...form, optionCount: Number(event.target.value), correctAnswers: [] })}>{[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count}</option>)}</select></div>
              <div className="col-md-8"><label className="form-label">Correct Answer(s)</label><CheckboxMultiSelect options={visibleLabels.map((label) => ({ value: label, label }))} value={form.correctAnswers} onChange={(correctAnswers) => setForm({ ...form, correctAnswers })} placeholder="Select correct answer(s)" /></div>
              {visibleLabels.map((label) => <div className="col-md-6" key={label}><label className="form-label">Option {label}</label><input className="form-control" value={optionText[label] ?? ''} onChange={(event) => setOptionText({ ...optionText, [label]: event.target.value })} required /></div>)}
            </>}
            <div className="col-12"><button className="btn btn-primary">Create Question</button></div>
          </form>
        </div>
      </section>
    </div>
  );
}
