import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckboxMultiSelect } from '../../components/CheckboxMultiSelect';
import { api, getErrorMessage } from '../../services/api';

const labels = ['A', 'B', 'C', 'D', 'E'];

export function CreateQuestionPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ type: 'SINGLE_CHOICE', questionText: '', marks: 1, optionCount: 4, correctAnswers: [] as string[] });
  const [optionText, setOptionText] = useState<Record<string, string>>({ A: '', B: '', C: '', D: '', E: '' });
  const visibleLabels = useMemo(() => labels.slice(0, Number(form.optionCount)), [form.optionCount]);
  const isObjectiveQuestion = form.type !== 'SHORT_ANSWER';
  const isFormValid =
    form.type.trim().length > 0 &&
    form.questionText.trim().length > 0 &&
    Number(form.marks) >= 0 &&
    (!isObjectiveQuestion ||
      (Number(form.optionCount) > 0 &&
        visibleLabels.every((label) => (optionText[label] ?? '').trim().length > 0) &&
        form.correctAnswers.length > 0));

  async function createQuestion(event: FormEvent) {
    event.preventDefault();
    if (!isFormValid) {
      setError('Fill all required fields');
      return;
    }
    if (form.type !== 'SHORT_ANSWER' && form.correctAnswers.length === 0) {
      setError('Select at least one correct answer');
      return;
    }
    try {
      await api.post('/questions', {
        type: form.type,
        questionText: form.questionText,
        marks: Number(form.marks),
        order: 0,
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
            <div className="col-md-6"><label className="form-label">Question Type</label><select className="form-select" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value, correctAnswers: [] })} required><option value="SINGLE_CHOICE">Single Choice</option><option value="MULTIPLE_CHOICE">Multiple Choice</option><option value="SHORT_ANSWER">Short Answer</option></select></div>
            <div className="col-md-6"><label className="form-label">Marks</label><input className="form-control" type="number" min="0" value={form.marks} onChange={(event) => setForm({ ...form, marks: Number(event.target.value) })} required /></div>
            <div className="col-12"><label className="form-label">Question Text</label><textarea className="form-control" value={form.questionText} onChange={(event) => setForm({ ...form, questionText: event.target.value })} required /></div>
            {form.type !== 'SHORT_ANSWER' && <>
              <div className="col-md-4"><label className="form-label">Number of Options</label><select className="form-select" value={form.optionCount} onChange={(event) => setForm({ ...form, optionCount: Number(event.target.value), correctAnswers: [] })} required>{[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count}</option>)}</select></div>
              <div className="col-md-8">
                <label className="form-label">{form.type === 'SINGLE_CHOICE' ? 'Correct Answer' : 'Correct Answer(s)'}</label>
                {form.type === 'SINGLE_CHOICE' ? (
                  <select
                    className="form-select"
                    value={form.correctAnswers[0] ?? ''}
                    onChange={(event) => setForm({ ...form, correctAnswers: event.target.value ? [event.target.value] : [] })}
                    required
                  >
                    <option value="">Select correct answer</option>
                    {visibleLabels.map((label) => <option key={label} value={label}>{label}</option>)}
                  </select>
                ) : (
                  <CheckboxMultiSelect options={visibleLabels.map((label) => ({ value: label, label }))} value={form.correctAnswers} onChange={(correctAnswers) => setForm({ ...form, correctAnswers })} placeholder="Select correct answer(s)" />
                )}
              </div>
              {visibleLabels.map((label) => <div className="col-md-6" key={label}><label className="form-label">Option {label}</label><input className="form-control" value={optionText[label] ?? ''} onChange={(event) => setOptionText({ ...optionText, [label]: event.target.value })} required /></div>)}
            </>}
            <div className="col-12"><button className="btn btn-primary" disabled={!isFormValid}>Create Question</button></div>
          </form>
        </div>
      </section>
    </div>
  );
}
