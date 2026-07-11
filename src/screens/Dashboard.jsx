import { useEffect, useState } from 'react';
import {
  Layers, BadgeCheck, Clock, MessageSquare, Send, Timer,
  Zap, BellRing, Activity, UserRoundSearch, ChevronRight, Loader2,
} from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { timeAgo } from '../utils/helpers.js';
import { apiGetDashboardStats } from '../utils/api.js';
import KpiRing from '../components/ui/KpiRing.jsx';

function Kpi({ label, value, sub, icon: Icon, unit, ringPct, onClick, loading }) {
  return (
    <div className={`kpi card${onClick ? ' clickable' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {Icon && <Icon />}
      </div>
      <div className="kpi-val tnum">
        {loading ? <Loader2 className="spin" style={{ width: 22, height: 22 }} /> : value}
        {!loading && unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {!loading && sub ? <div className="kpi-sub" dangerouslySetInnerHTML={{ __html: sub }} /> : null}
      {!loading && ringPct != null && <KpiRing pct={ringPct} />}
    </div>
  );
}

function proposalDeltaSub(delta) {
  if (delta > 0) return `<span class="up">▲ ${delta}</span> vs yesterday`;
  if (delta < 0) return `<span class="down">▼ ${Math.abs(delta)}</span> vs yesterday`;
  return 'Same as yesterday';
}

function addedThisWeekSub(count) {
  if (count > 0) return `<span class="up">▲ ${count}</span> added this week`;
  return 'No new listings this week';
}

export default function Dashboard() {
  const { listings, activity, cities, authUser, go } = useApp();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGetDashboardStats();
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const cityCount = Math.max(0, (cities || []).filter((c) => c !== 'All cities').length);

  const listingStats = stats?.listings;
  const proposalStats = stats?.proposals;
  const leadStats = stats?.leads;
  const attention = stats?.attention;

  const expiring = listingStats?.needsReverify ?? listings.filter((l) => l.fresh?.state !== 'fresh').length;
  const expiredN = listingStats?.expired ?? listings.filter((l) => l.fresh?.state === 'expired').length;

  const firstName = authUser?.name?.split(' ')[0] || 'there';

  return (
    <>
      <div className="page-head">
        <div className="row">
          <div>
            <h1>Good morning, {firstName} 👋</h1>
            <p>
              Here's the state of your inventory across {cityCount || 'your'} cit{cityCount === 1 ? 'y' : 'ies'} — live as of just now.
            </p>
          </div>
          <div className="spacer" />
          <button className="btn primary" onClick={() => go('match')}><Zap /> New Smart Match</button>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi
          label="Total active listings"
          value={(listingStats?.total ?? 0).toLocaleString('en-IN')}
          sub={listingStats ? addedThisWeekSub(listingStats.addedThisWeek) : '—'}
          icon={Layers}
          loading={loading}
        />
        <Kpi
          label="Fresh inventory"
          value={listingStats?.freshPct ?? 0}
          unit="%"
          sub="verified in last 5 days"
          icon={BadgeCheck}
          ringPct={listingStats?.freshPct ?? 0}
          loading={loading}
        />
        <Kpi
          label="Stale — needs re-verify"
          value={listingStats?.needsReverify ?? 0}
          sub="click to mark verified in Freshness →"
          icon={Clock}
          onClick={() => go('freshness')}
          loading={loading}
        />
        <Kpi
          label="Open leads"
          value={leadStats?.open ?? 0}
          sub={leadStats?.overdue ? `<span class="down">${leadStats.overdue} overdue follow-up</span>` : 'Active pipeline'}
          icon={MessageSquare}
          onClick={() => go('leads')}
          loading={loading}
        />
        <Kpi
          label="Proposals sent today"
          value={proposalStats?.sentToday ?? 0}
          sub={proposalStats ? proposalDeltaSub(proposalStats.deltaVsYesterday) : '—'}
          icon={Send}
          loading={loading}
        />
        <Kpi
          label="Proposals this week"
          value={proposalStats?.sentThisWeek ?? 0}
          sub={proposalStats ? `${proposalStats.generatedTotal} total saved` : '—'}
          icon={Timer}
          loading={loading}
        />
      </div>

      <div className="dash-cols">
        <div className="card panel">
          <div className="panel-head">
            <h3><BellRing /> Needs your attention</h3>
            <span className="count-pill amber">{(attention?.overdueLeads?.length || 0) + expiring}</span>
          </div>
          <div className="attn-list">
            {(attention?.overdueLeads || []).map((lead) => (
              <div key={lead.id} className="attn-item" onClick={() => go('leads')}>
                <div className="tag-source" style={{ background: 'var(--expired-soft)', color: 'var(--expired)' }}><MessageSquare /></div>
                <div className="attn-body">
                  <div className="attn-t">{lead.displayTitle || lead.name}</div>
                  <div className="attn-s">Follow-up overdue · {lead.city || 'No city'}</div>
                </div>
                <ChevronRight className="chev" />
              </div>
            ))}
            <div className="attn-item" onClick={() => go('freshness')}>
              <div className="tag-source" style={{ background: 'var(--stale-soft)', color: 'var(--stale)' }}><Clock /></div>
              <div className="attn-body">
                <div className="attn-t">{expiring} listings going stale</div>
                <div className="attn-s">{expiredN} already expired · mark verified in Freshness</div>
              </div>
              <ChevronRight className="chev" />
            </div>
            <div className="attn-item" onClick={() => go('match')}>
              <div className="tag-source" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}><UserRoundSearch /></div>
              <div className="attn-body">
                <div className="attn-t">Run Smart Match on a new enquiry</div>
                <div className="attn-s">Paste a client brief and get scored inventory matches</div>
              </div>
              <ChevronRight className="chev" />
            </div>
          </div>
        </div>

        <div className="card panel">
          <div className="panel-head">
            <h3><Activity /> Recent activity</h3>
            <span className="count-pill">Live</span>
          </div>
          <div className="feed">
            {activity.length ? activity.map((a, i) => (
              <div key={i} className="feed-row">
                <span className={`feed-dot ${a.kind}`} />
                <div className="feed-body">
                  <div className="feed-t"><b>{a.who}</b> {a.text}</div>
                  <div className="feed-s">{a.sub}</div>
                </div>
                <span className="feed-time tnum">{timeAgo(a.mins)}</span>
              </div>
            )) : (
              <div className="feed-empty">No activity yet — send a proposal to see updates here.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
