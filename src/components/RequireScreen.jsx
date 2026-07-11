import { Navigate } from 'react-router-dom';
import { useApp } from '../store/AppContext.jsx';
import { canSeeScreen } from '../utils/access.js';
import { defaultPathForUser } from '../routes.js';

export default function RequireScreen({ screen, children }) {
  const { authUser } = useApp();
  if (!canSeeScreen(authUser, screen)) {
    return <Navigate to={defaultPathForUser(authUser)} replace />;
  }
  return children;
}
