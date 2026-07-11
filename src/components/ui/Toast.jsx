import { CheckCircle, Info, PlusCircle, BadgeCheck, Send, Trash2 } from 'lucide-react';
import { useApp } from '../../store/AppContext.jsx';

const ICONS = {
  'check-circle': CheckCircle,
  'info': Info,
  'plus-circle': PlusCircle,
  'badge-check': BadgeCheck,
  'send': Send,
  'trash-2': Trash2,
};

export default function Toast() {
  const { toasts } = useApp();

  if (!toasts.length) return null;

  return (
    <div className="toast-wrap">
      {toasts.map(t => {
        const Icon = ICONS[t.icon] || CheckCircle;
        return (
          <div key={t.id} className="toast">
            <Icon />
            <span>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}
