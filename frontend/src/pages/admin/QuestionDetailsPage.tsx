import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import { Question } from '../../types';

export function QuestionDetailsPage() {
  const { id } = useParams();
  const [question, setQuestion] = useState<Question | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get<Question>(`/questions/${id}`)
      .then((res) => setQuestion(res.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  return (
    <div className="stack">
      <div><Link className="btn btn-outline-secondary btn-sm" to="/admin/questions">Back</Link></div>
      {error && <div className="alert alert-danger">{error}</div>}
      {question && <section className="card"><div className="card-body">
        <h1 className="h5">Question Details</h1>
        <dl className="row mb-0">
          <dt className="col-sm-3">Question</dt><dd className="col-sm-9">{question.questionText}</dd>
          <dt className="col-sm-3">Type</dt><dd className="col-sm-9">{question.type}</dd>
          <dt className="col-sm-3">Marks</dt><dd className="col-sm-9">{question.marks}</dd>
          <dt className="col-sm-3">Order</dt><dd className="col-sm-9">{question.order}</dd>
          <dt className="col-sm-3">Correct Answers</dt><dd className="col-sm-9">{question.correctAnswers?.join(', ') || '-'}</dd>
          <dt className="col-sm-3">Options</dt><dd className="col-sm-9">{question.options?.length ? <ul className="mb-0">{question.options.map((option) => <li key={option.label}>{option.label}. {option.text}</li>)}</ul> : '-'}</dd>
        </dl>
      </div></section>}
    </div>
  );
}
