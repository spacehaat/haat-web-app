import { useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import Modal from './ui/Modal.jsx';
import {
  REMINDER_PRESETS,
  buildReminderDate,
  defaultCustomDateString,
  defaultCustomTimeString,
  fromLocalDateTimeInputValue,
} from '../utils/leadReminder.js';

export default function CmbReminderModal({ show, onClose, onSkip, onSave, saving = false }) {
  const [preset, setPreset] = useState('tomorrow');
  const [customDateTime, setCustomDateTime] = useState('');
  const [customDate, setCustomDate] = useState(defaultCustomDateString());
  const [customTime, setCustomTime] = useState(defaultCustomTimeString());
  const [note, setNote] = useState('');

  const buildPayload = () => {
    let due;
    if (preset === 'custom') {
      if (customDateTime) {
        due = fromLocalDateTimeInputValue(customDateTime);
      } else {
        due = buildReminderDate('custom', { customDate, customTime });
      }
    } else {
      due = buildReminderDate(preset);
    }
    if (!due) return null;
    return { dueAt: due, note: note.trim() || undefined };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;
    await onSave(payload);
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title="Call me back"
      footer={(
        <>
          <button type="button" className="btn" disabled={saving} onClick={onSkip}>
            Skip reminder
          </button>
          <button type="button" className="btn primary" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="spin" size={16} /> : <Bell size={16} />}
            Save stage + reminder
          </button>
        </>
      )}
    >
      <p className="cmb-reminder-copy">
        Mark this lead as <strong>Call me back</strong>. You can optionally set a reminder for when to follow up.
      </p>

      <div className="lead-reminder-presets">
        {REMINDER_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`filt-opt ${preset === item.id ? 'on' : ''}`}
            onClick={() => setPreset(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {preset === 'custom' ? (
        <div className="lead-reminder-custom">
          <label className="lead-reminder-field">
            <span>Date & time</span>
            <input
              type="datetime-local"
              className="inp"
              value={customDateTime}
              onChange={(e) => setCustomDateTime(e.target.value)}
            />
          </label>
          <div className="lead-reminder-split">
            <label className="lead-reminder-field">
              <span>Date</span>
              <input type="date" className="inp" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
            </label>
            <label className="lead-reminder-field">
              <span>Time</span>
              <input type="time" className="inp" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
            </label>
          </div>
        </div>
      ) : null}

      <label className="lead-reminder-field">
        <span>Note (optional)</span>
        <textarea
          className="inp"
          rows={2}
          placeholder="e.g. Client asked to call after 4 PM"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
    </Modal>
  );
}
