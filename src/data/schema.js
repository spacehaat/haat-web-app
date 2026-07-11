/* ============================================================
   FULL LISTING PROFILE SCHEMA  (six groups A–F)

   Field-behaviour tags:
     STATIC   — set once at onboarding, rarely changes
     DYNAMIC  — goes stale; freshness flow applies
     INTERNAL — never client-visible; shown only in Browser detail
   ============================================================ */

import { BUILDING_TYPES, SPACE_TYPES, AMEN, freshOf } from './db.js';

const _NAMES = ['Ananya Rao','Vikram Shetty','Priya Nair','Rahul Desai','Meera Iyer','Arjun Kapoor','Sneha Reddy','Karan Malhotra'];
const _COMPETITORS = ['WeWork (2 floors)','Awfis · same block','IndiQube nearby','Smartworks across road','Table Space 500m','91Springboard adjacent'];
const _EXPANSION = ['Adding 1 floor by Q4','New tower wing planned 2026','No near-term expansion','Second centre in same micro-market','Fit-out of 40 more seats underway'];

export function _hash(s) {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
const _r2 = (n, step = 100) => Math.round(n / step) * step;

export function enrich(l) {
  const h = _hash(l.id + l.operator + l.micro);
  const pick = (arr, salt = 0) => arr[(h + salt * 7) % arr.length];
  const ded = l.price;
  const totalSeats = l.seats + 14 + (h % 46);
  const totalWk = Math.round(totalSeats * 0.7);
  const totalCab = Math.max(1, Math.round(totalSeats / 9));
  const availCab = Math.max(0, Math.round(totalCab * 0.4));
  const hasParking = l.amenities.includes('Parking');
  const slug = l.operator.toLowerCase().replace(/[^a-z]/g, '');
  const pin = (l.city === 'Bangalore' ? 560000 : l.city === 'Mumbai' ? 400000 : l.city === 'Hyderabad' ? 500000 : l.city === 'Pune' ? 411000 : l.city === 'Chennai' ? 600000 : 110000) + (h % 95);

  return {
    identity: {
      centreName:    `${l.operator} · ${l.micro}`,
      address:       `${100 + (h % 800)}, ${l.micro}, ${l.city} ${pin}`,
      mapsLink:      `maps.google.com/?q=${encodeURIComponent(l.operator + ' ' + l.micro)}`,
      nearestMetro:  pick(['Indiranagar','MG Road','Cyber City Rapid','HITEC City','Baner (proposed)','CP'], 1) + ` Metro · ${1 + (h % 9)} min`,
      nearestRail:   pick(['City Jn','Cantt','Central','Secunderabad Jn','Pune Jn'], 2) + ` · ${2 + (h % 13)} km`,
      floors:        pick(['Ground + 2 floors','3rd–5th floor','7th floor','2nd & 3rd floor','9th–11th floor'], 3),
      buildingType:  pick(BUILDING_TYPES, 4),
      ownership:     pick(['Leased','Developer-owned','Managed lease'], 5),
      entranceFacing:pick(['North','East','North-East','West'], 6),
      zoning:        pick(['Commercial','SEZ','IT / ITES','Mixed-use'], 7),
      vastu:         (h % 3 !== 0),
      superBuiltUp:  _r2(1200 + totalSeats * 98, 50),
      carpet:        _r2(950 + totalSeats * 74, 50),
      layoutType:    pick(['Open-plan','Cabin-heavy','Mixed open + cabins','Hybrid'], 8),
      deskSize:      pick(['4 × 2 ft','5 × 2.5 ft','L-shaped, 5 ft'], 9),
    },
    capacity: {
      totalSeats, totalWorkstations: totalWk,
      totalCabins: totalCab, cabinSeatsEach: 4,
      meetingRooms: 1 + (h % 4), meetingRoomSeats: 6,
      conferenceRooms: (h % 2) + 1, conferenceSeats: 12 + (h % 2) * 4,
      availWorkstations: l.seats,
      availCabins: availCab, availCabinSeats: 4,
      hotDeskAvailable: (l.type === 'Hot desk') || (h % 2 === 0),
      hotDeskCount: l.type === 'Hot desk' ? l.seats : (h % 12),
    },
    pricing: {
      hotDesk:         _r2(ded * 0.55),
      dedicatedDesk:   ded,
      privateCabin:    _r2(ded * 1.16),
      confRoomHour:    _r2(700 + (h % 6) * 100),
      confRoomDay:     _r2(4500 + (h % 6) * 500, 500),
      meetingRoomHour: _r2(450 + (h % 4) * 100),
      dayPass:         _r2(350 + (h % 4) * 50, 50),
      managedPerSqft:  85 + (h % 45),
      carParking:      _r2(2500 + (h % 6) * 500, 500),
      twoWheeler:      _r2(700 + (h % 4) * 100),
      beyondHours:     `Included till 10 PM · ₹${150 + (h % 3) * 50}/hr after`,
      signageBoard:    _r2(5000 + (h % 4) * 1000, 500),
      securityDeposit: `${2 + (h % 4)} months`,
      noticePeriod:    pick(['1 month','2 months','3 months'], 10),
    },
    salesIntel: {
      pitchingPrice:     _r2(ded * 1.12),
      closingPrice:      ded,
      yoyIncrement:      `${6 + (h % 9)}%`,
      competitors:       [pick(_COMPETITORS, 11), pick(_COMPETITORS, 12)].filter((v, i, a) => a.indexOf(v) === i),
      expansionPlans:    pick(_EXPANSION, 13),
      commissionAccount: `Spacehaat Brokerage · A/C ····${1000 + (h % 8999)} · ${pick(['8%','9%','10%','12%'], 14)} of first-year value`,
    },
    operations: {
      timings:  '9:00 AM – 9:00 PM',
      daysOpen: pick(['Mon – Sat','Mon – Fri','All days'], 15),
      sundayVisits: (h % 2 === 0),
      managedOfficeAvailable: (l.type === 'Managed office') || (h % 3 === 0),
      virtualOfficeAvailable: (h % 2 === 1),
    },
    contactsMedia: {
      centerManager:    { name: pick(_NAMES, 16), phone: `+91 98${100 + (h % 899)} ${10000 + (h % 89999)}` },
      communityManager: { name: pick(_NAMES, 17), phone: `+91 99${100 + (h % 899)} ${10000 + (h % 89999)}` },
      salesPhone:  `+91 80 ${4000 + (h % 5999)} 0${100 + (h % 899)}`,
      salesEmail:  `sales.${l.micro.toLowerCase().replace(/[^a-z]/g, '')}@${slug}.in`,
      accountEmail:`accounts@${slug}.in`,
      carParkingAvailable: hasParking,
      carParkingSpaces: hasParking ? 10 + (h % 50) : 0,
      twoWheelerSpaces: 20 + (h % 70),
      extraAmenities: l.amenities,
      gallery: ['Reception / lobby','Workstation bay','Cabin interior','Cafeteria'],
      brochure:  `${slug}_${l.micro.replace(/\W/g, '')}_brochure.pdf`,
      website:   `${slug}.in`,
      instagram: `@${slug}.spaces`,
      linkedin:  `linkedin.com/company/${slug}`,
      virtualTour: `youtu.be/tour-${l.id.toLowerCase()}`,
    },
  };
}

export function profileOf(l) {
  if (!l.profile) l.profile = enrich(l);
  return l.profile;
}

/* INV_SCHEMA — drives the 6-step Add/Edit inventory wizard */
export const INV_SCHEMA = [
  { id: 'A', icon: 'MapPin', title: 'Identity & Location', tag: 'static', fields: [
    { p: 'core.operator',          l: 'Operator', req: true, ph: 'e.g. Awfis' },
    { p: 'identity.centreName',    l: 'Centre name', ph: 'auto if blank' },
    { p: 'core.city',              l: 'City', t: 'select', req: true, opts: () => ['Bangalore','Mumbai','Delhi NCR','Hyderabad','Pune','Chennai'] },
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
