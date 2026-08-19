import { useEffect, useState } from 'react';
import { Mail, Loader2 } from 'lucide-react';
import Modal from './ui/Modal.jsx';
import {
  buildLeadRegistrationEmail,
  leadRegistrationMailto,
  requirementLabelFromLead,
} from '../utils/leadRegistrationEmail.js';

export default function LeadRegisterEmailModal({
  show,
  onClose,
  lead,
  memberName,
  memberPhone,
}) {
  const [recipientName, setRecipientName] = useState('');
  const [requirement, setRequirement] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!show) return;
    setRecipientName('');
    setRequirement(requirementLabelFromLead(lead));
    setCompanyName(String(lead?.company || '').trim());
    setError('');
    setOpening(false);
  }, [show, lead?.id]);

  const handleOpen = () => {
    if (!recipientName.trim()) {
      setError('Enter the recipient name (e.g. Shlok)');
      return;
    }
    if (!requirement.trim()) {
      setError('Enter the requirement');
      return;
    }

    const { subject, body } = buildLeadRegistrationEmail({
      recipientName: recipientName.trim(),
      clientName: lead?.name || lead?.company,
      companyName: companyName.trim(),
      requirement: requirement.trim(),
      contact: lead?.contact,
      memberName,
      memberPhone,
    });

    const href = leadRegistrationMailto({ subject, body });
    setOpening(true);
    window.location.href = href;
    setTimeout(() => {
      setOpening(false);
      onClose?.();
    }, 400);
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title="Register lead by email"
      footer={(
        <>
          <button type="button" className="btn" onClick={onClose} disabled={opening}>
            Cancel
          </button>
          <button type="button" className="btn primary" onClick={handleOpen} disabled={opening}>
            {opening ? <Loader2 className="spin" size={16} /> : <Mail size={16} />}
            Open email
          </button>
        </>
      )}
    >
      <p className="cmb-reminder-copy">
        Opens your mail app with subject and body filled. Add the recipient email manually in the mail app.
      </p>

      <label className="lead-reminder-field">
        <span>Recipient name</span>
        <input
          className="inp"
          value={recipientName}
          onChange={(e) => { setRecipientName(e.target.value); setError(''); }}
          placeholder="e.g. Shlok"
          autoFocus
        />
      </label>

      <label className="lead-reminder-field" style={{ marginTop: 12 }}>
        <span>Requirement</span>
        <input
          className="inp"
          value={requirement}
          onChange={(e) => { setRequirement(e.target.value); setError(''); }}
          placeholder="e.g. 200+ seats"
        />
      </label>

      <label className="lead-reminder-field" style={{ marginTop: 12 }}>
        <span>Company name <small style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(optional)</small></span>
        <input
          className="inp"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Acme Pvt Ltd"
        />
      </label>

      {error ? <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{error}</p> : null}
    </Modal>
  );
}
