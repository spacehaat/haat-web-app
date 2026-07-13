/* ============================================================
   FULL LISTING PROFILE SCHEMA  (six groups A–F)

   Field-behaviour tags:
     STATIC   — set once at onboarding, rarely changes
     DYNAMIC  — goes stale; freshness flow applies
     INTERNAL — never client-visible; shown only in Browser detail
   ============================================================ */

import { BUILDING_TYPES, SPACE_TYPES, AMEN } from './db.js';

export function _hash(s) {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

const EMPTY_PROFILE = {
  identity: {},
  capacity: {},
  pricing: {},
  salesIntel: {},
  operations: {},
  contactsMedia: {},
};

/** Return stored profile only — never invent demo values. */
export function profileOf(l) {
  if (!l) return { ...EMPTY_PROFILE };
  if (l.profile && typeof l.profile === 'object') return l.profile;
  return { ...EMPTY_PROFILE };
}

/** @deprecated No longer fabricates data. */
export function enrich(_l) {
  return profileOf(null);
}

function getNested(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((cur, key) => (cur == null ? undefined : cur[key]), obj);
}

function setNested(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function schemaFieldPaths(schema = INV_SCHEMA) {
  const paths = [];
  for (const group of schema) {
    for (const field of group.fields || []) {
      if (field.p) paths.push(field.p);
    }
  }
  return paths;
}

function readListingPath(listing, path) {
  if (!listing) return undefined;
  if (path.startsWith('core.')) return listing[path.slice(5)];
  if (path === 'images') return listing.images;
  return getNested(listing.profile, path);
}

function coerceFieldValue(field, raw) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (field.t === 'toggle') return Boolean(raw);
  if (field.t === 'num' || field.t === 'inr') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }
  if (field.t === 'list') {
    if (Array.isArray(raw)) return raw.filter(Boolean);
    return String(raw).split('\n').map((s) => s.trim()).filter(Boolean);
  }
  if (field.t === 'chips') return Array.isArray(raw) ? raw : [];
  return raw;
}

/** Build wizard draft from a stored listing (only real values). */
export function listingToDraft(listing) {
  const draft = {};
  if (!listing) return draft;
  for (const path of schemaFieldPaths()) {
    const val = readListingPath(listing, path);
    if (val !== undefined && val !== null && val !== '') draft[path] = val;
  }
  if (listing.tier) draft['core.tier'] = listing.tier;
  return draft;
}

/**
 * Convert wizard draft → API payload.
 * Only includes fields the user actually filled — no invented defaults.
 */
export function draftToListingPayload(draft) {
  const payload = {
    amenities: [],
    source: 'manual',
  };
  const profile = {};

  for (const group of INV_SCHEMA) {
    for (const field of group.fields || []) {
      if (!field.p || field.t === 'images') continue;
      const coerced = coerceFieldValue(field, draft[field.p]);
      if (coerced === undefined) continue;

      if (field.p.startsWith('core.')) {
        payload[field.p.slice(5)] = coerced;
      } else {
        setNested(profile, field.p, coerced);
      }
    }
  }

  if (draft['core.tier']) payload.tier = draft['core.tier'];
  if (Object.keys(profile).length) payload.profile = profile;
  return payload;
}

export function validateListingDraft(draft) {
  const errors = [];
  for (const group of INV_SCHEMA) {
    for (const field of group.fields || []) {
      if (!field.req) continue;
      const val = draft[field.p];
      if (val === undefined || val === null || val === '') {
        errors.push(`${field.l} is required`);
      }
    }
  }
  return errors;
}

/* INV_SCHEMA — drives the 6-step Add/Edit inventory wizard */
export const INV_SCHEMA = [
  { id: 'A', icon: 'MapPin', title: 'Identity & Location', tag: 'static', fields: [
    { p: 'core.operator',          l: 'Operator', req: true, ph: 'e.g. Awfis' },
    { p: 'identity.centreName',    l: 'Centre name', ph: 'auto if blank' },
    { p: 'core.city',              l: 'City', t: 'select', req: true, opts: () => ['Gurugram','Noida','Delhi','Bangalore','Mumbai','Pune','Hyderabad','Ahmedabad','Jaipur','Chennai','Lucknow','Indore'] },
    { p: 'core.micro',             l: 'Micro-market', req: true, ph: 'e.g. Koramangala' },
    { p: 'identity.address',       l: 'Full address', t: 'textarea', full: true, ph: 'Building, street, area, city, PIN' },
    { p: 'identity.mapsLink',      l: 'Google Maps link', full: true, ph: 'maps.google.com/…' },
    { p: 'identity.nearestMetro',  l: 'Nearest metro station' },
    { p: 'identity.nearestRail',   l: 'Nearest railway station' },
    { p: 'identity.floors',        l: 'Floor(s) occupied', ph: 'e.g. 3rd–5th floor' },
    { p: 'core.type',              l: 'Space type', t: 'select', req: true, opts: () => SPACE_TYPES },
    { p: 'identity.buildingType',  l: 'Building type', t: 'select', opts: () => BUILDING_TYPES },
    { p: 'identity.ownership',     l: 'Building ownership', t: 'select', opts: () => ['Leased','Developer-owned','Managed lease'] },
    { p: 'identity.entranceFacing', l: 'Entrance facing', t: 'select', opts: () => ['North','South','East','West','North-East','North-West','South-East','South-West'] },
    { p: 'identity.zoning',        l: 'Area type / zoning', ph: 'e.g. Commercial, SEZ' },
    { p: 'identity.superBuiltUp',  l: 'Super built-up', t: 'num', suf: 'sq ft' },
    { p: 'identity.carpet',        l: 'Carpet area', t: 'num', suf: 'sq ft' },
    { p: 'identity.layoutType',    l: 'Layout type', ph: 'e.g. Open-plan' },
    { p: 'identity.deskSize',      l: 'Desk size', ph: 'e.g. 4 × 2 ft' },
    { p: 'identity.vastu',         l: 'Vastu compliant', t: 'toggle' },
  ]},
  { id: 'B', icon: 'LayoutGrid', title: 'Capacity', tag: 'mixed', fields: [
    { p: 'capacity.totalSeats',        l: 'Total seats (excl. meeting/conf)', t: 'num' },
    { p: 'capacity.totalWorkstations', l: 'Total open workstations', t: 'num' },
    { p: 'capacity.totalCabins',       l: 'Total private cabins', t: 'num' },
    { p: 'capacity.cabinSeatsEach',    l: 'Seats per cabin', t: 'num' },
    { p: 'capacity.meetingRooms',      l: 'Meeting rooms', t: 'num' },
    { p: 'capacity.meetingRoomSeats',  l: 'Seats per meeting room', t: 'num' },
    { p: 'capacity.conferenceRooms',   l: 'Conference rooms', t: 'num' },
    { p: 'capacity.conferenceSeats',   l: 'Seats per conference room', t: 'num' },
    { div: 'Live availability', tag: 'live' },
    { p: 'core.seats',                 l: 'Open workstations available', t: 'num', req: true, live: true },
    { p: 'capacity.availCabins',       l: 'Private cabins available', t: 'num', live: true },
    { p: 'capacity.availCabinSeats',   l: 'Seats per available cabin', t: 'num', live: true },
    { p: 'capacity.hotDeskAvailable',  l: 'Hot desk available', t: 'toggle', live: true },
    { p: 'capacity.hotDeskCount',      l: 'Hot desks available (count)', t: 'num', live: true },
    { p: 'core.avail',                 l: 'Available from', live: true, ph: 'e.g. Available now' },
  ]},
  { id: 'C', icon: 'IndianRupee', title: 'Pricing', tag: 'live', fields: [
    { p: 'core.price',             l: 'Dedicated desk / seat / mo', t: 'inr', req: true },
    { p: 'pricing.hotDesk',        l: 'Hot desk charges / mo', t: 'inr' },
    { p: 'pricing.privateCabin',   l: 'Private cabin / seat / mo', t: 'inr' },
    { p: 'pricing.managedPerSqft', l: 'Managed office / sq ft', t: 'inr' },
    { p: 'pricing.confRoomHour',   l: 'Conference room / hour', t: 'inr' },
    { p: 'pricing.confRoomDay',    l: 'Conference room / day', t: 'inr' },
    { p: 'pricing.meetingRoomHour', l: 'Meeting room / hour', t: 'inr' },
    { p: 'pricing.dayPass',        l: 'Day pass', t: 'inr' },
    { p: 'pricing.carParking',     l: 'Car parking / mo', t: 'inr' },
    { p: 'pricing.twoWheeler',     l: '2-wheeler parking / mo', t: 'inr' },
    { p: 'pricing.signageBoard',   l: 'Signage board (reception)', t: 'inr' },
    { p: 'pricing.beyondHours',    l: 'Beyond-hours charges', full: true, ph: 'e.g. ₹150/hr after 10 PM' },
    { p: 'pricing.securityDeposit', l: 'Security deposit', ph: 'e.g. 2 months' },
    { p: 'pricing.noticePeriod',   l: 'Notice period', t: 'select', opts: () => ['1 month','2 months','3 months'] },
  ]},
  { id: 'D', icon: 'Lock', title: 'Sales Intelligence', tag: 'internal', fields: [
    { p: 'salesIntel.pitchingPrice',    l: 'Pitching price', t: 'inr' },
    { p: 'salesIntel.closingPrice',     l: 'Closing price', t: 'inr' },
    { p: 'salesIntel.yoyIncrement',     l: 'YoY increment', ph: 'e.g. 8%' },
    { p: 'salesIntel.competitors',      l: 'Nearby competitors (one per line)', t: 'list', full: true },
    { p: 'salesIntel.expansionPlans',   l: 'Expansion plans', t: 'textarea', full: true },
    { p: 'salesIntel.commissionAccount', l: 'Payment / commission account', t: 'textarea', full: true },
  ]},
  { id: 'E', icon: 'Clock', title: 'Operations', tag: 'mixed', fields: [
    { p: 'operations.timings',                l: 'Timings', ph: 'e.g. 9:00 AM – 9:00 PM' },
    { p: 'operations.daysOpen',               l: 'Days open', t: 'select', opts: () => ['Mon – Fri','Mon – Sat','All days'] },
    { p: 'operations.sundayVisits',            l: 'Client visits on Sunday', t: 'toggle' },
    { p: 'operations.managedOfficeAvailable',  l: 'Managed office available', t: 'toggle', live: true },
    { p: 'operations.virtualOfficeAvailable',  l: 'Virtual office available', t: 'toggle', live: true },
  ]},
  { id: 'F', icon: 'Contact', title: 'Contacts, Amenities & Media', tag: 'static', fields: [
    { p: 'contactsMedia.centerManager.name',    l: 'Centre manager — name' },
    { p: 'contactsMedia.centerManager.phone',   l: 'Centre manager — phone' },
    { p: 'contactsMedia.communityManager.name', l: 'Community manager — name' },
    { p: 'contactsMedia.communityManager.phone', l: 'Community manager — phone' },
    { p: 'contactsMedia.salesPhone',  l: 'Salesperson contact number' },
    { p: 'contactsMedia.salesEmail',  l: 'Sales email ID' },
    { p: 'contactsMedia.accountEmail', l: 'Account email ID' },
    { p: 'contactsMedia.carParkingAvailable', l: 'Car parking available', t: 'toggle' },
    { p: 'contactsMedia.carParkingSpaces',    l: 'Car parking spaces', t: 'num' },
    { p: 'contactsMedia.twoWheelerSpaces',    l: '2-wheeler parking spaces', t: 'num' },
    { p: 'core.amenities', l: 'Extra amenities', t: 'chips', full: true, choices: () => AMEN },
    { p: 'images',         l: 'Workspace photos', t: 'images', full: true },
    { p: 'contactsMedia.brochure',   l: 'Brochure / proposal PDF', full: true, ph: 'file name or link' },
    { p: 'contactsMedia.website',    l: 'Website link' },
    { p: 'contactsMedia.virtualTour', l: 'Virtual tour (YouTube)' },
    { p: 'contactsMedia.instagram',  l: 'Instagram link' },
    { p: 'contactsMedia.linkedin',   l: 'LinkedIn link' },
  ]},
];
