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
  const p = profileOf(l);
  return {
    operator: l.operator, type: l.type, city: l.city, micro: l.micro, id: l.id, images: l.images,
    seats: l.seats, price: l.price, avail: l.avail, fresh: l.fresh, amenities: l.amenities,
    address: p.identity.address, nearestMetro: p.identity.nearestMetro, buildingType: p.identity.buildingType,
    carpet: p.identity.carpet,
    securityDeposit: p.pricing.securityDeposit, noticePeriod: p.pricing.noticePeriod,
    cabinPrice: p.pricing.privateCabin, dayPass: p.pricing.dayPass,
    brochure: p.contactsMedia.brochure, website: p.contactsMedia.website,
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

const WORKSPACE_IMGS = [
  'photo-1497366754035-f200968a6e72','photo-1497366811353-6870744d04b2','photo-1524758631624-e2822e304c36',
  'photo-1556761175-5973dc0f32e7','photo-1497215728101-856f4ea42174','photo-1604328698692-f76ea9498e76',
  'photo-1521737604893-d14cc237f11d','photo-1531973576160-7125cd663d86','photo-1600508774634-4e11d34730e2',
  'photo-1542744173-8e7e53415bb0','photo-1505373877841-8d25f7d46678','photo-1568992687947-868a62a9f521',
  'photo-1604328471151-b52226907017','photo-1556761175-b413da4baf72','photo-1572025442646-866d16c84a54',
];

export function hashStr(s) {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function imgUrl(seed, w = 600, h = 360) {
  const idx = hashStr(String(seed)) % WORKSPACE_IMGS.length;
  return `https://images.unsplash.com/${WORKSPACE_IMGS[idx]}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
}

export const coverImg = (l, w = 600, h = 360) =>
  (l.images && l.images[0]) ? l.images[0] : imgUrl(l.id, w, h);

export function allGalleryPhotos(l, profileOf) {
  const p = profileOf(l);
  const cab = p.capacity.cabinSeatsEach || 4;
  const defs = [
    { label: 'Hero photo', caption: `${l.type} area — matches client request` },
    { label: 'Reception & entrance' },
    { label: `Private cabin — ${cab} seater`, price: p.pricing.privateCabin, unit: '/seat' },
    { label: 'Meeting room' },
    { label: 'Cafeteria & breakout' },
    { label: 'Dedicated desk bay', price: p.pricing.dedicatedDesk, unit: '/seat' },
    { label: 'Hot desk zone', price: p.pricing.hotDesk, unit: '/seat' },
    { label: 'Conference room', price: p.pricing.confRoomDay, unit: '/day' },
    { label: 'Phone booth' }, { label: 'Lounge & breakout' }, { label: 'Pantry' },
    { label: 'Terrace / balcony' }, { label: 'Car parking' }, { label: 'Corridor & common area' },
    { label: 'Washrooms' }, { label: 'Building facade' },
  ];
  const ups = l.images || [], meta = l.photoMeta || [];
  const pick = (m, d) => ({
    label: (m && m.label) ? m.label : (d.label || 'Photo'),
    price: (m && m.price !== '' && m.price != null) ? Number(m.price) : d.price,
    unit: d.unit || '/seat', caption: d.caption,
  });
  if (ups.length) return ups.map((src, i) => ({ src, ...pick(meta[i], defs[i] || { label: `Photo ${i + 1}` }) }));
  return defs.map((d, i) => ({ src: imgUrl(l.id + '-g' + i, 400, 300), ...pick(null, d) }));
}
