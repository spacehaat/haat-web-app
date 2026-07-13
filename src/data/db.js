/* ============================================================
   MOCK DATA LAYER  — all in-memory, resets on page reload.
   No backend, no localStorage.
   ============================================================ */

export const SPACE_TYPES = ['Hot desk', 'Dedicated desk', 'Private cabin', 'Managed office'];
export const AMEN = [
  'Wi-Fi','Parking','Cafeteria','Meeting rooms','24x7 access','AC',
  'Reception','Phone booths','Printer','Pantry','Metro <5min','Gym',
];
export const BUILDING_TYPES = ['IT park', 'Standalone', 'Mixed-use'];

export function freshOf(days) {
  if (days <= 5)  return { state: 'fresh',   label: `Verified ${days}d ago`, days };
  if (days <= 14) return { state: 'stale',   label: `${days}d ago`,          days };
  return               { state: 'expired', label: `${days}d — re-verify`, days };
}

let _id = 1;
export const uid = () => 'L' + (_id++);

function L(operator, city, micro, type, seats, price, days, amenities, tier, avail) {
  return { id: uid(), operator, city, micro, type, seats, price, days,
           amenities, tier, avail, fresh: freshOf(days) };
}
function A(kind, who, text, sub, mins) { return { kind, who, text, sub, mins }; }

export const DB = {
  me: { name: 'Rohit Mehra', city: 'Bangalore' },
  cities: ['All cities','Gurugram','Noida','Delhi','Bangalore','Mumbai','Pune','Hyderabad','Ahmedabad','Jaipur','Chennai','Lucknow','Indore'],

  kpis: {
    active: 1284,
    freshPct: 78,
    stale: 63,
    enquiries: 34,
    proposals: 19,
    avgTime: '1m 48s',
    avgTrend: -22,
  },

  listings: [
    L('Awfis','Bangalore','Koramangala','Private cabin',18,9000,2,['Wi-Fi','Parking','Cafeteria','Meeting rooms','24x7 access'],'Premium','Available now'),
    L('IndiQube','Bangalore','Indiranagar','Dedicated desk',25,8500,9,['Wi-Fi','Cafeteria','Metro <5min','Phone booths'],'Standard','Available now'),
    L('Smartworks','Bangalore','Whitefield','Managed office',60,7800,3,['Wi-Fi','Parking','Cafeteria','Gym','Reception','24x7 access'],'Premium','From 1 Jul'),
    L('91Springboard','Bangalore','HSR Layout','Hot desk',40,5500,23,['Wi-Fi','Cafeteria','AC'],'Standard','Available now'),
    L('alt.f','Mumbai','BKC','Private cabin',12,14500,2,['Wi-Fi','Parking','Reception','Meeting rooms','AC'],'Premium','Available now'),
    L('Smartworks','Mumbai','Andheri East','Dedicated desk',35,11000,11,['Wi-Fi','Cafeteria','Parking','24x7 access'],'Standard','Available now'),
    L('Table Space','Mumbai','Lower Parel','Managed office',80,13200,5,['Wi-Fi','Parking','Cafeteria','Gym','Reception','Phone booths'],'Premium','From 15 Jul'),
    L('Innov8','Gurugram','Cyber City, Gurgaon','Private cabin',16,12000,1,['Wi-Fi','Parking','Cafeteria','Metro <5min','24x7 access'],'Premium','Available now'),
    L('WeWork','Gurugram','Golf Course Road','Dedicated desk',30,12800,4,['Wi-Fi','Cafeteria','Gym','Reception','Phone booths','AC'],'Premium','Available now'),
    L('Awfis','Noida','Sector 62, Noida','Hot desk',50,4800,16,['Wi-Fi','Parking','AC','Pantry'],'Standard','Available now'),
    L('Smartworks','Noida','Sector 142, Noida','Managed office',120,5200,7,['Wi-Fi','Parking','Cafeteria','24x7 access','Reception'],'Standard','From 1 Aug'),
    L('IndiQube','Hyderabad','HITEC City','Private cabin',20,8800,3,['Wi-Fi','Parking','Cafeteria','Meeting rooms'],'Premium','Available now'),
    L('CoWrks','Hyderabad','Gachibowli','Dedicated desk',28,7600,12,['Wi-Fi','Cafeteria','Parking','Phone booths'],'Standard','Available now'),
    L('91Springboard','Pune','Baner','Hot desk',45,4600,6,['Wi-Fi','Cafeteria','AC','Parking'],'Standard','Available now'),
    L('Awfis','Pune','Kharadi','Private cabin',14,7200,2,['Wi-Fi','Parking','Meeting rooms','24x7 access'],'Premium','Available now'),
    L('Workafella','Chennai','Guindy','Managed office',55,6400,19,['Wi-Fi','Parking','Cafeteria','Reception'],'Standard','From 10 Jul'),
    L('IndiQube','Chennai','OMR','Dedicated desk',32,5900,4,['Wi-Fi','Cafeteria','AC','Metro <5min'],'Standard','Available now'),
    L('Smartworks','Bangalore','Outer Ring Road','Managed office',95,8100,1,['Wi-Fi','Parking','Cafeteria','Gym','Reception','24x7 access','Phone booths'],'Premium','Available now'),
    L('alt.f','Delhi','Connaught Place','Private cabin',10,15500,8,['Wi-Fi','Reception','Meeting rooms','Metro <5min','AC'],'Premium','Available now'),
    L('NestAway Work','Bangalore','Jayanagar','Hot desk',22,5000,28,['Wi-Fi','Cafeteria','AC'],'Standard','Available now'),
  ],

  inbox: makeInbox(),
  activity: [
    A('proposal','Rohit', 'sent a proposal to Acme Corp', '6 seats · Koramangala', 4),
    A('approve','Priya',  'approved IndiQube · HITEC City', '20-seat cabin published', 12),
    A('verify','System',  'auto-verified 14 listings', 'Whitefield cluster', 28),
    A('enquiry','Kabir',  'logged enquiry from Zluri', '30 seats · BKC', 41),
    A('proposal','Sneha', 'sent a proposal to Razorpay', '45 seats · Cyber City', 63),
    A('reject','Aditya',  'rejected a low-confidence message', 'duplicate listing', 88),
    A('verify','System',  'flagged 9 listings as stale', 'pending re-verification', 120),
  ],
};

function makeInbox() {
  return [
    { id:'M1', ch:'wa', op:'Awfis', mins:6, conf:94,
      snippet:'Hi we have 25 seats avail at Indiranagar 8500/seat, 2 cabins…',
      raw:`Hi Rohit 👋 we have 25 seats avail at our Indiranagar centre, 8500/seat. Also 2 cabins (4-seater) free from next month. Parking + cafeteria included. Let me know if any client.`,
      att:null,
      prof:{ operator:'Awfis', city:'Bangalore', micro:'Indiranagar', type:'Dedicated desk', isNew:false,
             centre:'Awfis · Indiranagar', address:'418, 100ft Road, Indiranagar, Bangalore 560038',
             buildingType:'Mixed-use', totalSeats:120, totalCabins:14, manager:'Priya Nair',
             amenities:['Parking','Cafeteria','Wi-Fi','Metro <5min'] },
      dyn:{ availWorkstations:25, availCabins:'2 × 4-seater', hotDesk:'No', dedicatedDesk:8500, availFrom:'From next month' },
      low:[] },

    { id:'M2', ch:'em', op:'Smartworks', mins:24, conf:88,
      snippet:'Inventory update — Whitefield & ORR — PDF attached',
      raw:`Subject: Weekly inventory — Smartworks Bangalore\n\nHi team, attached is this week's availability for Outer Ring Road. ORR managed office can take up to 95 seats, premium fit-out, available now.\n\nRegards,\nLeasing, Smartworks`,
      att:{type:'pdf', name:'Smartworks_BLR_Inventory_Jun.pdf', meta:'2 pages · 480 KB'},
      prof:{ operator:'Smartworks', city:'Bangalore', micro:'Outer Ring Road', type:'Managed office', isNew:false,
             centre:'Smartworks · Outer Ring Road', address:'Prestige Tech Park, ORR, Bangalore 560103',
             buildingType:'IT park', totalSeats:240, totalCabins:22, manager:'Vikram Shetty',
             amenities:['Wi-Fi','Parking','Cafeteria','Gym','Reception','24x7 access'] },
      dyn:{ availWorkstations:95, availCabins:'4 × 6-seater', hotDesk:'No', managedPerSqft:110, availFrom:'Available now' },
      low:[] },

    { id:'M3', ch:'wa', op:'Local Operator (unverified)', mins:38, conf:62,
      snippet:'space avilable koramangla 12 seat good rate call me',
      raw:`space avilable koramangla 12 seat good rate call me 9876543210 fully furnished ac wifi ready to move`,
      att:null,
      prof:{ operator:'(unknown — confirm)', city:'Bangalore', micro:'Koramangala', type:'Dedicated desk', isNew:true,
             centre:'New centre — profile will be created on approval', address:'—',
             buildingType:'—', totalSeats:null, totalCabins:null, manager:'—',
             amenities:['AC','Wi-Fi'] },
      dyn:{ availWorkstations:12, hotDesk:'Yes · 12', dedicatedDesk:null, availFrom:'Available now' },
      low:['operator','dedicatedDesk'] },

    { id:'M4', ch:'em', op:'Table Space', mins:55, conf:91,
      snippet:'Lower Parel managed office — Excel sheet attached',
      raw:`Subject: Table Space — Mumbai availability\n\nPlease find attached the live sheet. Lower Parel can accommodate 80 seats, ready 15 July, ₹13,200/seat. Full amenities incl. gym.`,
      att:{type:'xls', name:'TableSpace_Mumbai_Live.xlsx', meta:'3 sheets · 64 KB'},
      prof:{ operator:'Table Space', city:'Mumbai', micro:'Lower Parel', type:'Managed office', isNew:false,
             centre:'Table Space · Lower Parel', address:'Peninsula Corp Park, Lower Parel, Mumbai 400013',
             buildingType:'IT park', totalSeats:210, totalCabins:18, manager:'Rahul Desai',
             amenities:['Wi-Fi','Parking','Cafeteria','Gym','Reception','Phone booths'] },
      dyn:{ availWorkstations:80, availCabins:'—', hotDesk:'No', dedicatedDesk:13200, availFrom:'From 15 Jul' },
      low:[] },

    { id:'M5', ch:'wa', op:'Innov8', mins:72, conf:96,
      snippet:'Cyber City cabin 16 seats ready, 12k/seat, parking + metro',
      raw:`Cyber City cabin 16 seats ready to move, 12k/seat. Parking available, metro 3 min walk. Cafeteria + 24x7. Premium tower.`,
      att:null,
      prof:{ operator:'Innov8', city:'Gurugram', micro:'Cyber City, Gurgaon', type:'Private cabin', isNew:false,
             centre:'Innov8 · Cyber City', address:'Building 8, DLF Cyber City, Gurgaon 122002',
             buildingType:'IT park', totalSeats:160, totalCabins:20, manager:'Karan Malhotra',
             amenities:['Parking','Metro <5min','Cafeteria','24x7 access','Wi-Fi'] },
      dyn:{ availCabins:'1 × 16-seater', hotDesk:'No', privateCabin:12000, availFrom:'Available now' },
      low:[] },

    { id:'M6', ch:'em', op:'CoWrks', mins:140, conf:73,
      snippet:'Gachibowli desks — price TBD, awaiting confirmation',
      raw:`Hi, Gachibowli has around 28 dedicated desks opening up. Price to be confirmed (likely ~7.5-7.8k). Will revert with exact figure. Cafeteria + parking standard.`,
      att:null,
      prof:{ operator:'CoWrks', city:'Hyderabad', micro:'Gachibowli', type:'Dedicated desk', isNew:false,
             centre:'CoWrks · Gachibowli', address:'Vasavi MPM, Gachibowli, Hyderabad 500032',
             buildingType:'Standalone', totalSeats:140, totalCabins:12, manager:'Sneha Reddy',
             amenities:['Cafeteria','Parking','Wi-Fi'] },
      dyn:{ availWorkstations:28, hotDesk:'No', dedicatedDesk:7600, availFrom:'Available now' },
      low:['dedicatedDesk'] },

    { id:'M7', ch:'wa', op:'91Springboard', mins:175, conf:90,
      snippet:'Baner hot desks 45 avail, 4600/seat, walk-ins ok',
      raw:`Baner centre — 45 hot desks available, 4600/seat. Walk-ins okay, AC + cafeteria + parking. Can hold for serious clients.`,
      att:null,
      prof:{ operator:'91Springboard', city:'Pune', micro:'Baner', type:'Hot desk', isNew:false,
             centre:'91Springboard · Baner', address:'Pentagon P4, Baner, Pune 411045',
             buildingType:'Mixed-use', totalSeats:130, totalCabins:8, manager:'Meera Iyer',
             amenities:['AC','Cafeteria','Parking','Wi-Fi'] },
      dyn:{ hotDesk:'Yes · 45 seats', hotDeskPrice:4600, availWorkstations:45, availFrom:'Available now' },
      low:[] },
  ];
}

export const freshHist = [62, 68, 65, 71, 74, 78];
