import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className={`app-shell ${isAdmin ? 'admin-theme' : 'candidate-theme'}`}>
      <aside className="app-sidebar">
        <Link className="brand" to={isAdmin ? '/admin' : '/candidate'}>
          <span className="brand-mark">A</span>
          <span>AssessPro</span>
        </Link>
        <nav className="side-nav">
          {isAdmin ? (
            <>
              <NavLink end className="side-link" to="/admin">Dashboard</NavLink>
              <NavLink className="side-link" to="/admin/assessments">Assessments</NavLink>
              <NavLink className="side-link" to="/admin/questions">Questions</NavLink>
              <NavLink className="side-link" to="/admin/submissions">Submissions</NavLink>
            </>
          ) : (
            <>
              <NavLink end className="side-link" to="/candidate">Dashboard</NavLink>
              <NavLink className="side-link" to="/candidate">My Assessments</NavLink>
            </>
          )}
        </nav>
        <button className="side-logout" onClick={handleLogout}>Logout</button>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div>
            <div className="fw-semibold">Dashboard</div>
            <div className="small text-muted">Welcome back, {isAdmin ? 'Admin' : 'Candidate'}</div>
          </div>
          <div className="user-pill">
            <span className="user-avatar">{isAdmin ? 'A' : 'C'}</span>
            <span>{user?.role}</span>
          </div>
        </header>
        <main className="content-panel">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
