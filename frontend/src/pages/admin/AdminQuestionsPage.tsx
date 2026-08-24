import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import { Page, Question } from '../../types';

export function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');

  async function load(targetPage = 0, cursor: string | null = null) {
    const { data } = await api.get<Page<Question>>('/questions', {
      params: { cursor: cursor ?? undefined, limit: 6 },
    });
    setQuestions(data.data);
    setNextCursor(data.nextCursor);
    setPage(targetPage);
  }

  useEffect(() => { load().catch((err) => setError(getErrorMessage(err))); }, []);

  async function goNext() {
    if (!nextCursor) return;
    const nextPage = page + 1;
    const cursors = [...pageCursors];
    cursors[nextPage] = nextCursor;
    setPageCursors(cursors);
    await load(nextPage, nextCursor);
  }

  async function goPrevious() {
    if (page === 0) return;
    await load(page - 1, pageCursors[page - 1]);
  }

  async function goPage(targetPage: number) {
    if (targetPage === page + 1 && nextCursor) {
      await goNext();
      return;
    }
    const cursor = pageCursors[targetPage];
    if (cursor === undefined) return;
    await load(targetPage, cursor);
  }

  return (
    <div className="stack">
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h1 className="h5 mb-0">Questions</h1>
            <Link className="btn btn-primary" to="/admin/questions/new">Create Question</Link>
          </div>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead><tr><th>Question</th><th>Type</th><th>Marks</th><th>Options</th><th></th></tr></thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question._id}>
                    <td>{question.questionText}</td>
                    <td>{question.type}</td>
                    <td>{question.marks}</td>
                    <td>{question.options?.map((option) => `${option.label}. ${option.text}`).join(', ')}</td>
                    <td><Link className="btn btn-outline-secondary btn-sm" to={`/admin/questions/${question._id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <button className="page-btn" disabled={page === 0} onClick={goPrevious}>Previous</button>
            {[0, 1, 2].map((pageIndex) => (
              <button className={`page-btn number ${page === pageIndex ? 'active' : ''}`} disabled={pageCursors[pageIndex] === undefined && !(pageIndex === page + 1 && nextCursor)} key={pageIndex} onClick={() => goPage(pageIndex)}>
                {pageIndex + 1}
              </button>
            ))}
            <button className="page-btn" disabled={!nextCursor} onClick={goNext}>Next</button>
          </div>
        </div>
      </section>
    </div>
  );
}
