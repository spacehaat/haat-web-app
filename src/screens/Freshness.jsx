import { useMemo, useState } from 'react';
import { CheckCircle, PieChart, RefreshCw, TrendingUp } from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import FreshBadge from '../components/ui/FreshBadge.jsx';
import { freshHist } from '../data/db.js';
import { filterListingsScope } from '../utils/helpers.js';

export default function Freshness() {
  const { listings, cityFilter, searchQuery, requestUpdate } = useApp();
  const [pendingIds, setPendingIds] = useState(new Set());

  const list = useMemo(
    () => filterListingsScope(listings, { cityFilter, searchQuery })
      .slice()
      .sort((a, b) => b.days - a.days),
    [listings, cityFilter, searchQuery],
  );

  const counts = useMemo(() => {
    const next = { fresh: 0, stale: 0, expired: 0 };
    list.forEach((l) => { next[l.fresh.state] += 1; });
    return next;
  }, [list]);

  const total = counts.fresh + counts.stale + counts.expired || 1;
  const staleCount = counts.stale + counts.expired;

  const markPending = (ids) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setTimeout(() => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, 1900);
  };

  const requestOne = (id) => {
    markPending([id]);
    requestUpdate(id);
  };

  const requestAll = () => {
    const staleIds = list.filter((l) => l.fresh.state !== 'fresh').map((l) => l.id);
    if (!staleIds.length) return;
    markPending(staleIds);
    staleIds.forEach((id) => requestUpdate(id));
  };

  return (
    <>
      <div className="page-head">
        <div className="row">
          <div>
            <h1>Freshness & Re-verification</h1>
            <p>Mark listings verified after you confirm availability with the operator.</p>
          </div>
          <div className="spacer" />
          <button className="btn primary" disabled={!staleCount} onClick={requestAll}>
            <RefreshCw /> Mark all stale verified ({staleCount})
          </button>
        </div>
      </div>

      <div className="fresh-top">
        <div className="card fresh-dist">
          <div className="pe-head"><PieChart /> Freshness distribution</div>
          <div className="pe-body">
            <div className="dist-bar">
              <span className="seg-f" style={{ width: `${(counts.fresh / total) * 100}%` }} />
              <span className="seg-s" style={{ width: `${(counts.stale / total) * 100}%` }} />
              <span className="seg-e" style={{ width: `${(counts.expired / total) * 100}%` }} />
            </div>
            <div className="dist-legend">
              <span><i className="d f" /> Fresh <b className="tnum">{counts.fresh}</b></span>
              <span><i className="d s" /> Stale <b className="tnum">{counts.stale}</b></span>
              <span><i className="d e" /> Expired <b className="tnum">{counts.expired}</b></span>
            </div>
          </div>
        </div>

        <div className="card fresh-trend">
          <div className="pe-head"><TrendingUp /> Fresh % over time <span className="count-pill">6 weeks</span></div>
          <div className="pe-body">
            <div className="spark">
              {freshHist.map((v, i) => (
                <div key={`${v}-${i}`} className="spark-col">
                  <div className="spark-bar" style={{ height: `${v}%` }} />
                  <span>{i === freshHist.length - 1 ? 'now' : `w${i + 1}`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card fresh-tbl-wrap">
        <table className="tbl fresh-tbl">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Type</th>
                <th>Seats</th>
                <th>Last verified</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => {
                const isPending = pendingIds.has(l.id);
                const verifiedLabel = l._justNow ? 'Verified just now' : (l.days === 0 ? 'Today' : `${l.days} day${l.days > 1 ? 's' : ''} ago`);
                let actionNode;
                if (isPending) {
                  actionNode = <button className="btn sm" disabled><RefreshCw className="spin" /> Updating…</button>;
                } else if (l._justNow) {
                  actionNode = <span className="replied"><CheckCircle /> Marked verified</span>;
                } else if (l.fresh.state === 'fresh') {
                  actionNode = <button className="btn sm ghost" onClick={() => requestOne(l.id)}><RefreshCw /> Mark verified</button>;
                } else {
                  actionNode = (
                    <button className={`btn sm ${l.fresh.state === 'expired' ? 'primary' : ''}`} onClick={() => requestOne(l.id)}>
                      <RefreshCw /> Mark verified
                    </button>
                  );
                }

                const statusFresh = isPending ? { state: 'stale', label: 'Updating…' } : (l._justNow ? { state: 'fresh', label: 'Verified just now' } : l.fresh);

                return (
                  <tr key={l.id} className={l._justNow ? 'row-fresh' : ''}>
                  <td>
                    <div className="ft-op"><b>{l.operator}</b><span>{l.micro}, {l.city}</span></div>
                  </td>
                  <td><span className="chip">{l.type}</span></td>
                  <td className="tnum">{l.seats}</td>
                  <td><span className={`ft-date ${l._justNow ? 'now' : ''}`}>{verifiedLabel}</span></td>
                  <td><FreshBadge fresh={statusFresh} /></td>
                  <td style={{ textAlign: 'right' }}>{actionNode}</td>
                  </tr>
                );
              })}
            </tbody>
        </table>
      </div>
    </>
  );
}
