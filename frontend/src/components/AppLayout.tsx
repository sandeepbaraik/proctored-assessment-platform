import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isAdmin = user?.role === 'ADMIN';
  const pageTitle = getPageTitle(location.pathname, isAdmin);

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
            </>
          )}
        </nav>
        <button className="side-logout" onClick={handleLogout}>Logout</button>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div>
            <div className="fw-semibold">{pageTitle}</div>
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

function getPageTitle(pathname: string, isAdmin: boolean) {
  if (!isAdmin) return 'Dashboard';
  if (pathname === '/admin') return 'Dashboard';
  if (pathname === '/admin/assessments') return 'Assessments';
  if (pathname === '/admin/assessments/new') return 'Create Assessment';
  if (pathname.startsWith('/admin/assessments/')) return 'Assessment Details';
  if (pathname === '/admin/questions') return 'Questions';
  if (pathname === '/admin/questions/new') return 'Create Question';
  if (pathname.endsWith('/edit') && pathname.startsWith('/admin/questions/')) return 'Edit Question';
  if (pathname.startsWith('/admin/questions/')) return 'Question Details';
  if (pathname === '/admin/submissions') return 'Submissions';
  return 'Dashboard';
}
