import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../../services/api';
import { Assessment, Page } from '../../types';

export function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([null]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');

  async function load(targetPage = 0, cursor: string | null = null) {
    const { data } = await api.get<Page<Assessment>>('/assessments', {
      params: { cursor: cursor ?? undefined, limit: 5 },
    });
    setAssessments(data.data);
    setNextCursor(data.nextCursor);
    setPage(targetPage);
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)));
  }, []);

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

  async function deleteAssessment(id: string) {
    if (!window.confirm('Delete this assessment? This cannot be undone.')) return;
    try {
      await api.delete(`/assessments/${id}`);
      await load(page, pageCursors[page] ?? null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="stack">
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h1 className="h5 mb-0">Assessments</h1>
            <Link className="btn btn-primary" to="/admin/assessments/new">Add Assessment</Link>
          </div>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead><tr><th>S.No</th><th>Title</th><th>Description</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {assessments.map((assessment, index) => (
                  <tr key={assessment._id}>
                    <td>{page * 5 + index + 1}</td>
                    <td className="fw-semibold">{assessment.title}</td>
                    <td>{assessment.description}</td>
                    <td>{assessment.durationMinutes} min</td>
                    <td><span className="badge text-bg-light">{assessment.status}</span></td>
                    <td>
                      <div className="d-flex gap-1">
                        <Link className="btn btn-outline-secondary btn-sm" to={`/admin/assessments/${assessment._id}`}>View/Edit</Link>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => deleteAssessment(assessment._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <button className="page-btn" disabled={page === 0} onClick={goPrevious}>Previous</button>
            <button className="page-btn" disabled={!nextCursor} onClick={goNext}>Next</button>
          </div>
        </div>
      </section>
    </div>
  );
}
