import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  FileText,
  IndianRupee,
  Loader2,
  Lock,
  MapPin,
  MessageSquareText,
  Minus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import FreshBadge from '../components/ui/FreshBadge.jsx';
import { useApp } from '../store/AppContext.jsx';
import { SAMPLE_ENQUIRY, inr } from '../utils/helpers.js';
import { apiSmartMatch, apiSmartMatchParse, apiCreateLeadFromMatch } from '../utils/api.js';

const INITIAL_REQ = {
  city: 'Bangalore',
  locality: 'Koramangala',
  teamSize: 30,
  budgetPerSeat: 9000,
  moveIn: 'In 2 weeks',
  amenities: ['Meeting rooms', '24x7 access'],
  spaceTypes: [],
  tierPreference: 'any',
};

const CITIES = ['Gurugram', 'Noida', 'Delhi', 'Bangalore', 'Mumbai', 'Pune', 'Hyderabad', 'Ahmedabad', 'Jaipur', 'Chennai', 'Lucknow', 'Indore'];
const AMENITY_OPTIONS = [
  'Wi-Fi', 'Parking', 'Cafeteria', 'Meeting rooms', '24x7 access', 'AC',
  'Reception', 'Phone booths', 'Gym', 'Metro <5min',
];
const SPACE_TYPES = ['Hot desk', 'Dedicated desk', 'Private cabin', 'Managed office'];

function reqToApi(req) {
  return {
    city: req.city || '',
    locality: req.locality || '',
    teamSize: Number(req.teamSize) || 0,
    budgetPerSeat: Number(req.budgetPerSeat) || 0,
    amenities: req.amenities || [],
    spaceTypes: req.spaceTypes || [],
    moveIn: req.moveIn || '',
    tierPreference: req.tierPreference || 'any',
  };
}

function apiToReq(r) {
  return {
    city: r.city || '',
    locality: r.locality || '',
    teamSize: r.teamSize || 0,
    budgetPerSeat: r.budgetPerSeat || 0,
    amenities: r.amenities || [],
    spaceTypes: r.spaceTypes || [],
    moveIn: r.moveIn || '',
    tierPreference: r.tierPreference || 'any',
  };
}

function parseSourceLabel(source) {
  if (source === 'openai') return 'AI parsed';
  if (source === 'rules') return 'Smart parsed';
  return 'Manual criteria';
}

export default function SmartMatch() {
  const { cityFilter, setProposalFromMatch, go, toast } = useApp();

  const [mode, setMode] = useState('paste');
  const [enquiry, setEnquiry] = useState(SAMPLE_ENQUIRY);
  const [matchReq, setMatchReq] = useState(INITIAL_REQ);
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState(null);
  const [parseSource, setParseSource] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isParsing, setIsParsing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const matchTimer = useRef(null);

  const runMatch = useCallback(async (opts = {}) => {
    const { enquiryText, requirements, silent = false } = opts;
    setIsMatching(true);
    try {
      const payload = {
        limit: 12,
        cityFilter: cityFilter !== 'All cities' ? cityFilter : undefined,
      };
      if (enquiryText?.trim()) payload.enquiry = enquiryText.trim();
      if (requirements) payload.requirements = reqToApi(requirements);

      const data = await apiSmartMatch(payload);
      setResults(data.matches || []);
      setMeta(data.meta || null);
      setParseSource(data.parseSource || null);
      if (data.requirements) setMatchReq(apiToReq(data.requirements));
      setHasRun(true);
      setSelectedIds(new Set());
    } catch (e) {
      if (!silent) toast(e?.message || 'Could not run Smart Match', 'info');
    } finally {
      setIsMatching(false);
    }
  }, [cityFilter, toast]);

  // Re-run when header city filter changes (if we've already matched once).
  useEffect(() => {
    if (!hasRun) return;
    runMatch({ requirements: matchReq, enquiryText: mode === 'paste' ? enquiry : undefined, silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityFilter]);

  const scheduleMatch = useCallback((requirements, enquiryText) => {
    if (matchTimer.current) clearTimeout(matchTimer.current);
    matchTimer.current = setTimeout(() => {
      runMatch({ requirements, enquiryText });
    }, 600);
  }, [runMatch]);

  const parseEnquiry = async () => {
    if (!enquiry.trim()) return;
    setIsParsing(true);
    try {
      const parsed = await apiSmartMatchParse(enquiry.trim());
      const next = apiToReq(parsed.requirements);
      setMatchReq(next);
      setParseSource(parsed.source);
      await runMatch({ enquiryText: enquiry, requirements: next });
    } catch (e) {
      toast(e?.message || 'Could not parse enquiry', 'info');
    } finally {
      setIsParsing(false);
    }
  };

  const updateReq = (key, value) => {
    const next = { ...matchReq, [key]: value };
    setMatchReq(next);
    setSelectedIds(new Set());
    if (mode === 'form') scheduleMatch(next);
  };

  const toggleAmenity = (a) => {
    const next = matchReq.amenities.includes(a)
      ? matchReq.amenities.filter((x) => x !== a)
      : [...matchReq.amenities, a];
    updateReq('amenities', next);
  };

  const toggleSpaceType = (t) => {
    const next = matchReq.spaceTypes.includes(t)
      ? matchReq.spaceTypes.filter((x) => x !== t)
      : [...matchReq.spaceTypes, t];
    updateReq('spaceTypes', next);
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createProposal = () => {
    const ids = [...selectedIds];
    setProposalFromMatch(ids, { name: '', company: '' });
    go('proposal');
  };

  const createLeadAndProposal = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setIsCreatingLead(true);
    try {
      const lead = await apiCreateLeadFromMatch({
        enquiry: mode === 'paste' ? enquiry : '',
        city: matchReq.city,
        locality: matchReq.locality,
        teamSize: matchReq.teamSize,
        budgetPerSeat: matchReq.budgetPerSeat,
        moveIn: matchReq.moveIn,
        amenities: matchReq.amenities,
        spaceTypes: matchReq.spaceTypes,
        listingIds: ids,
      });
      await setProposalFromMatch(ids, {
        name: lead.name || '',
        company: lead.company || '',
      }, {
        id: lead.id,
        title: lead.displayTitle,
      });
      toast('Lead created — proposal draft ready', 'check-circle');
      go('proposal');
    } catch (e) {
      toast(e?.message || 'Could not create lead', 'info');
    } finally {
      setIsCreatingLead(false);
    }
  };

  const scoreClass = (score) => (score >= 88 ? 'strong' : score >= 72 ? 'good' : 'weak');
  const busy = isParsing || isMatching || isCreatingLead;

  return (
    <>
      <div className="page-head">
        <div className="row">
          <div>
            <h1>Smart Match</h1>
            <p>AI reads client messages, scores every listing, and ranks the best fits with a match %.</p>
          </div>
          <div className="spacer" />
          <button
            className="btn primary"
            disabled={busy}
            onClick={() => runMatch({
              requirements: matchReq,
              enquiryText: mode === 'paste' ? enquiry : undefined,
            })}
          >
            {busy ? <Loader2 className="spin" /> : <Zap />}
            {busy ? 'Matching…' : 'Find matches'}
          </button>
        </div>
      </div>

      <div className="card req-panel">
        <div className="req-modes">
          <div className="seg">
            <button className={mode === 'paste' ? 'on' : ''} onClick={() => setMode('paste')}>
              <MessageSquareText /> Paste client message
            </button>
            <button className={mode === 'form' ? 'on' : ''} onClick={() => setMode('form')}>
              <SlidersHorizontal /> Structured fields
            </button>
          </div>
          {parseSource && (
            <span className="match-source-pill">
              <Sparkles /> {parseSourceLabel(parseSource)}
            </span>
          )}
        </div>

        {mode === 'paste' && (
          <div className="req-body">
            <label className="fld">
              <span className="lab">Client enquiry (WhatsApp / email)</span>
              <textarea
                className="inp"
                rows={4}
                value={enquiry}
                onChange={(e) => setEnquiry(e.target.value)}
                placeholder="e.g. Need 25 seats in BKC Mumbai, budget around 12k per seat, meeting rooms and parking, move in 3 weeks…"
              />
            </label>
            <div className="req-paste-foot">
              <span className="ai-hint">
                <Sparkles /> AI extracts city, seats, budget, amenities — then scores your inventory
              </span>
              <button className="btn primary" onClick={parseEnquiry} disabled={busy || !enquiry.trim()}>
                {isParsing ? <Loader2 className="spin" /> : <Sparkles />}
                {isParsing ? 'Reading message…' : 'Parse & match'}
              </button>
            </div>
          </div>
        )}

        {mode === 'form' && (
          <div className="req-body">
            <div className="req-grid">
              <label className="fld">
                <span className="lab">City</span>
                <select className="inp" value={matchReq.city} onChange={(e) => updateReq('city', e.target.value)}>
                  {CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </label>
              <label className="fld">
                <span className="lab">Locality / micro-market</span>
                <input className="inp" value={matchReq.locality} onChange={(e) => updateReq('locality', e.target.value)} placeholder="e.g. Koramangala, BKC" />
              </label>
              <label className="fld">
                <span className="lab">Team size (seats)</span>
                <input className="inp tnum" type="number" min={0} value={matchReq.teamSize} onChange={(e) => updateReq('teamSize', Number(e.target.value) || 0)} />
              </label>
              <label className="fld">
                <span className="lab">Budget / seat (₹)</span>
                <input className="inp tnum" type="number" min={0} value={matchReq.budgetPerSeat} onChange={(e) => updateReq('budgetPerSeat', Number(e.target.value) || 0)} />
              </label>
              <label className="fld">
                <span className="lab">Move-in timeline</span>
                <input className="inp" value={matchReq.moveIn} onChange={(e) => updateReq('moveIn', e.target.value)} placeholder="e.g. In 2 weeks" />
              </label>
              <label className="fld">
                <span className="lab">Tier preference</span>
                <select className="inp" value={matchReq.tierPreference} onChange={(e) => updateReq('tierPreference', e.target.value)}>
                  <option value="any">Any</option>
                  <option value="premium">Premium</option>
                  <option value="standard">Standard / budget</option>
                </select>
              </label>
            </div>
            <div className="fld" style={{ marginTop: 12 }}>
              <span className="lab">Space type (optional)</span>
              <div className="amen-wrap">
                {SPACE_TYPES.map((t) => (
                  <button type="button" key={t} className={`amen-chip ${matchReq.spaceTypes.includes(t) ? 'on' : ''}`} onClick={() => toggleSpaceType(t)}>{t}</button>
                ))}
              </div>
            </div>
            <div className="fld" style={{ marginTop: 8 }}>
              <span className="lab">Must-have amenities</span>
              <div className="amen-wrap">
                {AMENITY_OPTIONS.map((a) => (
                  <button type="button" key={a} className={`amen-chip ${matchReq.amenities.includes(a) ? 'on' : ''}`} onClick={() => toggleAmenity(a)}>{a}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="req-summary">
          {matchReq.city && <span className="chip"><MapPin /> {matchReq.locality ? `${matchReq.locality}, ` : ''}{matchReq.city}</span>}
          {matchReq.teamSize > 0 && <span className="chip"><Users /> {matchReq.teamSize} seats</span>}
          {matchReq.budgetPerSeat > 0 && <span className="chip"><IndianRupee /> ≤ {inr(matchReq.budgetPerSeat)}/seat</span>}
          {matchReq.moveIn && <span className="chip"><Calendar /> {matchReq.moveIn}</span>}
          {matchReq.amenities.map((a) => <span key={a} className="chip">{a}</span>)}
        </div>
      </div>

      <div className="match-head">
        {hasRun ? (
          <div>
            <b className="tnum">{results.length}</b> ranked matches
            {meta ? <> · scored <b className="tnum">{meta.totalScored}</b> listings</> : null}
            <span className="dot-sep">·</span> best fit first
          </div>
        ) : (
          <div>Paste a client message or fill in requirements, then hit <b>Find matches</b>.</div>
        )}
      </div>

      {busy && !results.length ? (
        <div className="card empty match-loading">
          <Loader2 className="spin" />
          <div>Scoring inventory against your requirements…</div>
        </div>
      ) : !results.length && hasRun ? (
        <div className="card empty">
          <Search />
          <div>No strong matches found. Try widening budget, reducing seat count, or changing locality.</div>
        </div>
      ) : (
        <div className="match-list">
          {results.map((r) => {
            const l = r.listing;
            const score = r.score;
            const why = r.reasons || [];
            const tierWord = r.verdict || (score >= 88 ? 'Strong match' : score >= 72 ? 'Good match' : 'Possible');
            const isSelected = selectedIds.has(l.id);

            return (
              <div key={l.id} className={`match-card ${isSelected ? 'sel' : ''}`} onClick={() => toggleSelected(l.id)}>
                <div className={`mc-check ${isSelected ? 'on' : ''}`}>{isSelected ? <Check /> : null}</div>
                <div className={`mc-score ${scoreClass(score)}`}>
                  <div className="mc-pct tnum">{score}<span>%</span></div>
                  <div className="mc-verdict">{tierWord}</div>
                </div>
                <div className="mc-main">
                  <div className="mc-top">
                    <div><span className="mc-op">{l.operator}</span> <span className="mc-loc">{l.micro}, {l.city}</span></div>
                    <FreshBadge fresh={l.fresh} />
                    <span className="margin-tag no-sel" title="Internal only — not shown to client">
                      <Lock /> {l.tier === 'Premium' ? 'High margin' : 'Std margin'} · internal
                    </span>
                  </div>
                  <div className="mc-facts">
                    <span className="tnum">{l.seats} seats</span><span className="sep">·</span>
                    <span className="tnum">{inr(l.price)}/seat</span><span className="sep">·</span>
                    <span>{l.type}</span><span className="sep">·</span>
                    <span>{l.avail}</span>
                  </div>
                  <div className="mc-why">
                    {why.slice(0, 5).map((w) => (
                      <span key={w.text} className={`why ${w.ok ? 'ok' : 'no'}`}>
                        {w.ok ? <Check /> : <Minus />}{w.text}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="sticky-bar" style={{ display: selectedIds.size ? 'flex' : 'none' }}>
        <div><b className="tnum">{selectedIds.size}</b> spaces selected</div>
        <div className="spacer" />
        <button className="btn ghost" onClick={() => setSelectedIds(new Set())}>Clear</button>
        <button className="btn" onClick={createProposal} disabled={isCreatingLead}>
          <FileText /> Proposal only
        </button>
        <button className="btn primary lg" onClick={createLeadAndProposal} disabled={isCreatingLead}>
          {isCreatingLead ? <Loader2 className="spin" /> : <FileText />}
          {isCreatingLead ? 'Creating…' : `Create lead & proposal (${selectedIds.size})`}
        </button>
      </div>
    </>
  );
}
