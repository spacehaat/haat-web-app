export function listingSearchHaystack(l) {
  const id = l.profile?.identity || {};
  return [
    l.operator,
    l.city,
    l.micro,
    l.type,
    l.tier,
    l.avail,
    id.centreName,
    id.address,
    id.nearestMetro,
    id.buildingType,
    ...(l.amenities || []),
  ].filter(Boolean).join(' ').toLowerCase();
}

export function listingMatchesSearch(l, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const hay = listingSearchHaystack(l);
  return q.split(/\s+/).every((token) => hay.includes(token));
}

export function filterListingsScope(listings, { cityFilter = 'All cities', searchQuery = '' } = {}) {
  return listings.filter((l) => {
    if (cityFilter !== 'All cities' && l.city !== cityFilter) return false;
    if (!listingMatchesSearch(l, searchQuery)) return false;
    return true;
  });
}

export function proposalMatchesSearch(p, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  const hay = [
    p.title,
    p.client?.name,
    p.client?.company,
    ...(p.summary?.cities || []),
    ...(p.summary?.operators || []),
  ].filter(Boolean).join(' ').toLowerCase();
  return q.split(/\s+/).every((token) => hay.includes(token));
}

export const inr = n => n == null ? '—' : '₹' + Number(n).toLocaleString('en-IN');

export function timeAgo(mins) {
  if (mins < 60) return mins + 'm ago';
  const h = Math.floor(mins / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

export const SAMPLE_ENQUIRY = 'Need 30 seats in Koramangala, budget ~9k, want to move in 2 weeks, prefer premium quiet space with meeting rooms';

export function coverNote(client, count, idx = 0) {
  const c = client.company || 'your team';
  const n = count;
  const variants = [
    `Hi ${client.name || 'there'}, thanks for the brief. Based on your requirement I've hand-picked ${n} space${n > 1 ? 's' : ''} that fit your team size, budget and preferred location — all verified for live availability. Happy to arrange visits this week.`,
    `Hi ${client.name || 'there'}, here are ${n} shortlisted option${n > 1 ? 's' : ''} for ${c}. Each is move-in ready with the amenities you asked for, and pricing is locked at current rates. Let me know which you'd like to tour.`,
    `Sharing ${n} curated workspace${n > 1 ? 's' : ''} for ${c} — matched on location, headcount and budget. All listings are freshness-verified, so what you see is genuinely available. Keen to hear your thoughts.`,
  ];
  return variants[idx % variants.length];
}

export function scoreListing(l, matchReq, sampleEnquiry = SAMPLE_ENQUIRY) {
  let s = 0;
  const why = [];
  if (l.city === matchReq.city) { s += 30; } else { s -= 40; }
  const locHit = matchReq.locality && (
    l.micro.toLowerCase().includes(matchReq.locality.toLowerCase()) ||
    matchReq.locality.toLowerCase().includes(l.micro.toLowerCase().split(',')[0])
  );
  if (locHit) { s += 26; why.push({ t: `Exact locality — ${l.micro}`, ok: true }); }
  else if (l.city === matchReq.city) { s += 10; why.push({ t: `Same city, ${l.micro}`, ok: true }); }

  if (l.seats >= matchReq.team) { s += 22; why.push({ t: `${l.seats} seats — fits team of ${matchReq.team}`, ok: true }); }
  else { s += 6; why.push({ t: `Only ${l.seats} seats — ${matchReq.team - l.seats} short`, ok: false }); }

  if (l.price <= matchReq.budget) { s += 22; why.push({ t: `${inr(l.price)}/seat — within budget`, ok: true }); }
  else if (l.price <= matchReq.budget * 1.2) { s += 9; why.push({ t: `${inr(l.price)}/seat — slightly over budget`, ok: false }); }
  else { why.push({ t: `${inr(l.price)}/seat — over budget`, ok: false }); }

  const am = matchReq.amenities.filter(a => l.amenities.includes(a));
  s += Math.min(am.length * 6, 12);
  if (am.length) why.push({ t: `Has ${am.join(', ')}`, ok: true });

  if (l.fresh.state === 'fresh') { s += 6; } else if (l.fresh.state === 'expired') { s -= 6; }
  if (l.tier === 'Premium' && /premium|quiet/i.test(sampleEnquiry)) { s += 4; why.push({ t: 'Premium fit-out', ok: true }); }

  const score = Math.max(35, Math.min(98, Math.round(s)));
  return { l, score, why, nearMiss: l.price > matchReq.budget && l.price <= matchReq.budget * 1.2 && score >= 68 };
}

export function clientSafeListing(l, profileOf) {
  const p = profileOf(l) || {};
  const identity = p.identity || {};
  const pricing = p.pricing || {};
  const contacts = p.contactsMedia || {};
  return {
    operator: l.operator, type: l.type, city: l.city, micro: l.micro, id: l.id, images: l.images,
    seats: l.seats, price: l.price, avail: l.avail, fresh: l.fresh, amenities: l.amenities,
    address: identity.address, nearestMetro: identity.nearestMetro, buildingType: identity.buildingType,
    carpet: identity.carpet,
    securityDeposit: pricing.securityDeposit, noticePeriod: pricing.noticePeriod,
    cabinPrice: pricing.privateCabin, dayPass: pricing.dayPass,
    brochure: contacts.brochure, website: contacts.website,
  };
}

export function galleryPhotos(l, profileOf) {
  return allGalleryPhotos(l, profileOf).slice(0, 5);
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function getPath(o, p) {
  return p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
}

export function setPath(o, p, v) {
  const ks = p.split('.'), last = ks.pop();
  let t = o;
  for (const k of ks) { if (t[k] == null) t[k] = {}; t = t[k]; }
  t[last] = v;
}

export function hashStr(s) {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/** Cover image: only real uploads — neutral placeholder if none. */
const EMPTY_COVER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360">'
  + '<rect fill="#E8F5E9" width="100%" height="100%"/>'
  + '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9A968E" font-family="system-ui,sans-serif" font-size="16">No photo</text>'
  + '</svg>',
);

export const coverImg = (l) =>
  (l.images && l.images[0]) ? l.images[0] : EMPTY_COVER;

/** Gallery: only photos the user uploaded. */
export function allGalleryPhotos(l, profileOf) {
  const p = profileOf?.(l) || {};
  const ups = l.images || [];
  const meta = l.photoMeta || [];
  if (!ups.length) return [];

  return ups.map((src, i) => {
    const m = meta[i] || {};
    return {
      src,
      label: m.label || `Photo ${i + 1}`,
      price: (m.price !== '' && m.price != null) ? Number(m.price) : undefined,
      unit: m.unit || '/seat',
      caption: m.caption,
    };
  });
}
