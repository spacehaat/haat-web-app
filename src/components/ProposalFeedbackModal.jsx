import { useEffect, useState } from 'react';
import {
  CalendarDays, Heart, Loader2, MessageCircle, XCircle,
} from 'lucide-react';
import Modal from './ui/Modal.jsx';
import { apiGetProposal, apiMarkProposalFeedbackSeen } from '../utils/api.js';

function formatWhen(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  });
}

function formatDates(dates = []) {
  return dates
    .filter(Boolean)
    .map((raw) => {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return raw;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    })
    .join(', ');
}

export default function ProposalFeedbackModal({ proposalId, proposalTitle, onClose, onSeen }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const item = await apiGetProposal(proposalId);
        if (!alive) return;
        setDetail(item);
        try {
          await apiMarkProposalFeedbackSeen(proposalId);
          if (alive) onSeen?.();
        } catch {
          // still show feedback if mark-seen fails
        }
      } catch (e) {
        if (alive) setError(e?.message || 'Could not load client feedback.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [proposalId, onSeen]);

  const fb = detail?.feedbackDetail;
  const shortlisted = (fb?.interactions || []).filter((x) => x.status === 'shortlisted');
  const rejected = (fb?.interactions || []).filter((x) => x.status === 'rejected');
  const comments = fb?.comments || [];
  const visits = fb?.visitRequests || [];
  const empty = !loading && !error && !shortlisted.length && !rejected.length && !comments.length && !visits.length;

  return (
    <Modal show={true} title="Client feedback" onClose={onClose} size="modal-wide">
      <div className="pf-modal">
        {proposalTitle ? <p className="pf-sub">{proposalTitle}</p> : null}

        {loading ? (
          <div className="pf-empty"><Loader2 className="spin" /> Loading feedback…</div>
        ) : error ? (
          <div className="pf-empty">{error}</div>
        ) : empty ? (
          <div className="pf-empty">No client feedback yet. Share the client portal link to start collecting responses.</div>
        ) : (
          <>
            {shortlisted.length ? (
              <section className="pf-section">
                <h3><Heart /> Shortlisted ({shortlisted.length})</h3>
                <ul className="pf-list">
                  {shortlisted.map((x) => (
                    <li key={`${x.listingId}-short`}>
                      <b>{x.listingLabel}</b>
                      <span>{formatWhen(x.updatedAt)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {visits.length ? (
              <section className="pf-section">
                <h3><CalendarDays /> Visit requests ({visits.length})</h3>
                <ul className="pf-list pf-visits">
                  {visits.map((x, i) => (
                    <li key={`${x.listingId}-visit-${i}`}>
                      <div>
                        <b>{x.listingLabel}</b>
                        <span>{formatWhen(x.createdAt)}</span>
                      </div>
                      {x.preferredDates?.length ? (
                        <div className="pf-dates">Preferred: {formatDates(x.preferredDates)}</div>
                      ) : null}
                      {x.note ? <div className="pf-note">&ldquo;{x.note}&rdquo;</div> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {comments.length ? (
              <section className="pf-section">
                <h3><MessageCircle /> Comments ({comments.length})</h3>
                <ul className="pf-list pf-comments">
                  {comments.map((x, i) => (
                    <li key={`${x.listingId}-cmt-${i}`}>
                      <div className="pf-cmt-head">
                        <b>{x.listingLabel}</b>
                        <span>{formatWhen(x.createdAt)}</span>
                      </div>
                      <p>{x.text}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {rejected.length ? (
              <section className="pf-section muted">
                <h3><XCircle /> Not interested ({rejected.length})</h3>
                <ul className="pf-list">
                  {rejected.map((x) => (
                    <li key={`${x.listingId}-rej`}>
                      <b>{x.listingLabel}</b>
                      <span>{formatWhen(x.updatedAt)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}
