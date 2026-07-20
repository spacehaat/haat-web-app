import { useMemo, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import {
  REMINDER_PRESETS,
  buildReminderDate,
  defaultCustomDateString,
  defaultCustomTimeString,
  formatReminderDateTime,
  fromLocalDateTimeInputValue,
  reminderStatus,
  toLocalDateTimeInputValue,
} from '../utils/leadReminder.js';

export default function LeadReminderPanel({ dueAt, saving, onSave }) {
  const [preset, setPreset] = useState('tomorrow');
  const [customDateTime, setCustomDateTime] = useState('');
  const [customDate, setCustomDate] = useState(defaultCustomDateString());
  const [customTime, setCustomTime] = useState(defaultCustomTimeString());
  const [note, setNote] = useState('');

  const status = useMemo(() => reminderStatus(dueAt), [dueAt]);

  const saveReminder = async () => {
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
    if (!due) return;
    await onSave({
      dueAt: due,
      note: note.trim() || undefined,
    });
    setNote('');
  };

  const fillFromExisting = () => {
    if (!dueAt) return;
    setPreset('custom');
    setCustomDateTime(toLocalDateTimeInputValue(dueAt));
  };

  return (
    <div className="lead-drawer-panel lead-reminder-panel">
      <div className="lead-drawer-panel-title">Remind me</div>
      <div className={`lead-reminder-status ${status.key}`}>
        <Bell size={16} />
        <div>
          <strong>{formatReminderDateTime(dueAt)}</strong>
          <span>{status.label}</span>
        </div>
        {dueAt ? (
          <button type="button" className="btn ghost sm" onClick={fillFromExisting}>
            Edit time
          </button>
        ) : null}
      </div>

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
              <input
                type="date"
                className="inp"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
            </label>
            <label className="lead-reminder-field">
              <span>Time</span>
              <input
                type="time"
                className="inp"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
              />
            </label>
          </div>
        </div>
      ) : null}

      <label className="lead-reminder-field">
        <span>Note (optional)</span>
        <textarea
          className="inp"
          rows={2}
          placeholder="e.g. Client will decide after budget approval"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <button type="button" className="btn primary sm lead-reminder-save" disabled={saving} onClick={saveReminder}>
        {saving ? <Loader2 className="spin" size={16} /> : null}
        Set reminder
      </button>
    </div>
  );
}
