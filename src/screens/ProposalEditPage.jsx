import { useEffect, useRef, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import ProposalBuilder from './ProposalBuilder.jsx';
import { PATHS } from '../routes.js';

export default function ProposalEditPage() {
  const { id } = useParams();
  const { loadStoredProposal } = useApp();
  const loadedRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!id || loadedRef.current === id) return;
    loadedRef.current = id;
    setReady(false);
    setFailed(false);
    (async () => {
      try {
        await loadStoredProposal(id);
        setReady(true);
      } catch {
        setFailed(true);
      }
    })();
  }, [id, loadStoredProposal]);

  if (failed) return <Navigate to={PATHS.proposals} replace />;
  if (!ready) {
    return (
      <div className="card empty" style={{ marginTop: 24 }}>
        <Loader2 className="spin" />
      </div>
    );
  }
  return <ProposalBuilder />;
}
