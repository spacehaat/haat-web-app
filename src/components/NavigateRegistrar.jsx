import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { registerNavigate, persistRoute } from '../navigation.js';

export default function NavigateRegistrar() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    registerNavigate(navigate);
  }, [navigate]);

  useEffect(() => {
    persistRoute(location.pathname, location.search);
  }, [location.pathname, location.search]);

  return null;
}
