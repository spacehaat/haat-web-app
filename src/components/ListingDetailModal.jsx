import { useState } from 'react';
import {
  X,
  ChevronRight,
  MapPin,
  LayoutGrid,
  IndianRupee,
  Lock,
  Clock3,
  Contact,
  FileText,
  Globe,
  Share2,
  Link,
  Play,
  Image,
  Maximize2,
  Pencil,
  RefreshCw,
  Plus,
  Check,
} from 'lucide-react';
import FreshBadge from './ui/FreshBadge.jsx';
import { profileOf } from '../data/schema.js';
import { coverImg, inr, galleryPhotos, allGalleryPhotos } from '../utils/helpers.js';

function kv(label, value, dynamic = false) {
  const safe = value === undefined || value === null || value === '' ? '—' : value;
  return (
    <div className="dv-row" key={`${label}-${safe}`}>
      <span>{label}{dynamic ? <i className="dv-live" title="Dynamic" /> : null}</span>
      <b>{safe}</b>
    </div>
  );
}

function Section({ section, icon: Icon, title, tag, open, onToggle, children }) {
  return (
    <div className={`dv-sec ${open ? 'open' : ''} ${tag === 'internal' ? 'internal' : ''}`} data-sec={section}>
      <button className="dv-head" onClick={onToggle}>
        <ChevronRight className="dv-caret" />
        <Icon />
        <span className="dv-title">{title}</span>
        {tag === 'dynamic' ? (
          <span className="dv-pill live">Dynamic</span>
        ) : tag === 'internal' ? (
          <span className="dv-pill lock"><Lock /> Internal only</span>
        ) : (
          <span className="dv-pill static">Static</span>
        )}
      </button>
      <div className="dv-body">{children}</div>
    </div>
  );
}

export default function ListingDetailModal({
  listing,
  proposalAdded,
  onClose,
  onEdit,
  onGallery,
  onAddProposal,
  onRemoveProposal,
  onRequestUpdate,
}) {
  const p = profileOf(listing);
  const I = p.identity;
  const C = p.capacity;
  const P = p.pricing;
  const S = p.salesIntel;
  const O = p.operations;
  const F = p.contactsMedia;

  const quickGallery = galleryPhotos(listing, profileOf);
  const fullGallery = allGalleryPhotos(listing, profileOf);
  const hero = quickGallery[0] || fullGallery[0];
  const rest = quickGallery.slice(1, 5);
  const more = Math.max(fullGallery.length - (1 + rest.length), 0);

  const [openSections, setOpenSections] = useState({
    A: true,
    B: false,
    C: false,
    D: false,
    E: false,
    F: false,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="modal-bg show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <h3>{listing.operator} · {listing.micro}</h3>
            <div className="mh-sub">
              {listing.type} · {listing.city} · <FreshBadge fresh={listing.fresh} />
            </div>
          </div>
          <button className="x" onClick={onClose}><X /></button>
        </div>

        <div className="modal-body dv-modal">
          <img className="dv-hero" src={coverImg(listing, 640, 300)} alt={`${listing.operator} ${listing.micro}`} />
          <div className="dv-quick">
            <div>
              <span>Seats available</span>
              <b className="tnum">{listing.seats}</b>
            </div>
            <div>
              <span>From</span>
              <b className="tnum">{inr(listing.price)}</b>
              <i>/seat/mo</i>
            </div>
            <div>
              <span>Available</span>
              <b>{listing.avail}</b>
            </div>
          </div>

          <Section
            section="A"
            icon={MapPin}
            title="A · Identity & Location"
            tag="static"
            open={openSections.A}
            onToggle={() => toggleSection('A')}
          >
            <div className="dv-grid">
              {kv('Centre name', I.centreName)}
              {kv('Building type', I.buildingType)}
              {kv('Full address', I.address)}
              {kv('Maps link', I.mapsLink)}
              {kv('Nearest metro', I.nearestMetro)}
              {kv('Nearest railway', I.nearestRail)}
              {kv('Floor(s) occupied', I.floors)}
              {kv('Ownership', I.ownership)}
              {kv('Entrance facing', I.entranceFacing)}
              {kv('Zoning / area type', I.zoning)}
              {kv('Vastu compliant', I.vastu ? 'Yes' : 'No')}
              {kv('Layout type', I.layoutType)}
              {kv('Super built-up', `${Number(I.superBuiltUp || 0).toLocaleString('en-IN')} sq ft`)}
              {kv('Carpet area', `${Number(I.carpet || 0).toLocaleString('en-IN')} sq ft`)}
              {kv('Desk size', I.deskSize)}
            </div>
          </Section>

          <Section
            section="B"
            icon={LayoutGrid}
            title="B · Capacity"
            tag="dynamic"
            open={openSections.B}
            onToggle={() => toggleSection('B')}
          >
            <div className="dv-grid">
              {kv('Total seats (excl. meeting/conf)', C.totalSeats)}
              {kv('Total open workstations', C.totalWorkstations)}
              {kv('Total private cabins', `${C.totalCabins} (${C.cabinSeatsEach}-seater)`)}
              {kv('Meeting rooms', `${C.meetingRooms} (${C.meetingRoomSeats}-seat)`)}
              {kv('Conference rooms', `${C.conferenceRooms} (${C.conferenceSeats}-seat)`)}
              <div className="dv-divide">Live availability</div>
              {kv('Open workstations available', C.availWorkstations, true)}
              {kv('Private cabins available', `${C.availCabins} (${C.availCabinSeats}-seater)`, true)}
              {kv('Hot desk available', C.hotDeskAvailable ? `Yes · ${C.hotDeskCount} seats` : 'No', true)}
            </div>
          </Section>

          <Section
            section="C"
            icon={IndianRupee}
            title="C · Pricing"
            tag="dynamic"
            open={openSections.C}
            onToggle={() => toggleSection('C')}
          >
            <div className="dv-grid">
              {kv('Hot desk', `${inr(P.hotDesk)}/mo`, true)}
              {kv('Dedicated desk', `${inr(P.dedicatedDesk)}/seat/mo`, true)}
              {kv('Private cabin', `${inr(P.privateCabin)}/seat/mo`, true)}
              {kv('Managed office', `₹${P.managedPerSqft}/sq ft`, true)}
              {kv('Conference room (hr)', inr(P.confRoomHour), true)}
              {kv('Conference room (day)', inr(P.confRoomDay), true)}
              {kv('Meeting room (hr)', inr(P.meetingRoomHour), true)}
              {kv('Day pass', inr(P.dayPass), true)}
              {kv('Car parking', `${inr(P.carParking)}/mo`, true)}
              {kv('2-wheeler parking', `${inr(P.twoWheeler)}/mo`, true)}
              {kv('Beyond-hours', P.beyondHours, true)}
              {kv('Signage board (reception)', inr(P.signageBoard), true)}
              {kv('Security deposit', P.securityDeposit, true)}
              {kv('Notice period', P.noticePeriod, true)}
            </div>
          </Section>

          <Section
            section="D"
            icon={Lock}
            title="D · Sales Intelligence"
            tag="internal"
            open={openSections.D}
            onToggle={() => toggleSection('D')}
          >
            <div className="dv-grid">
              {kv('Pitching price', inr(S.pitchingPrice))}
              {kv('Closing price', inr(S.closingPrice))}
              {kv('YoY increment', S.yoyIncrement)}
              {kv('Nearby competitors', (S.competitors || []).join('; '))}
              {kv('Expansion plans', S.expansionPlans)}
              {kv('Commission / payment a/c', S.commissionAccount)}
            </div>
          </Section>

          <Section
            section="E"
            icon={Clock3}
            title="E · Operations"
            tag="static"
            open={openSections.E}
            onToggle={() => toggleSection('E')}
          >
            <div className="dv-grid">
              {kv('Timings', O.timings)}
              {kv('Days open', O.daysOpen)}
              {kv('Sunday client visits', O.sundayVisits ? 'Yes' : 'No')}
              {kv('Managed office available', O.managedOfficeAvailable ? 'Yes' : 'No', true)}
              {kv('Virtual office available', O.virtualOfficeAvailable ? 'Yes' : 'No', true)}
            </div>
          </Section>

          <Section
            section="F"
            icon={Contact}
            title="F · Contacts, Amenities & Media"
            tag="static"
            open={openSections.F}
            onToggle={() => toggleSection('F')}
          >
            <div className="dv-grid">
              {kv('Centre manager', `${F.centerManager?.name || '—'} · ${F.centerManager?.phone || '—'}`)}
              {kv('Community manager', `${F.communityManager?.name || '—'} · ${F.communityManager?.phone || '—'}`)}
              {kv('Sales contact', F.salesPhone)}
              {kv('Sales email', F.salesEmail)}
              {kv('Account email', F.accountEmail)}
              {kv('Car parking', F.carParkingAvailable ? `Yes · ${F.carParkingSpaces} spaces` : 'No')}
              {kv('2-wheeler spaces', F.twoWheelerSpaces)}
            </div>

            <div className="dv-sub2">Extra amenities</div>
            <div className="amen-wrap" style={{ marginBottom: 12 }}>
              {(F.extraAmenities || listing.amenities || []).map((a) => (
                <span key={a} className="chip">{a}</span>
              ))}
            </div>

            {hero ? (
              <>
                <div className="dv-sub2">Photo gallery</div>
                <div className="gal">
                  <div className="gal-hero" onClick={() => onGallery(listing)}>
                    <img src={hero.src} alt={hero.label} />
                    <span className="gal-tag">Hero photo</span>
                    <div className="gal-hero-cap">{hero.caption || listing.type}</div>
                  </div>

                  <div className="gal-grid">
                    {rest.map((ph, idx) => (
                      <figure className="gal-cell" key={`${ph.src}-${idx}`} onClick={() => onGallery(listing)}>
                        <div className="gal-thumb">
                          <img src={ph.src} alt={ph.label} />
                          <button className="gal-act" title="View gallery"><Maximize2 /></button>
                        </div>
                        <figcaption className="gal-cap">
                          <span>{ph.label}</span>
                          {ph.price ? <b className="gal-price">{inr(ph.price)}<small>/seat</small></b> : null}
                        </figcaption>
                      </figure>
                    ))}
                  </div>

                  <button className="gal-more" onClick={() => onGallery(listing)}>
                    <Image /> {more > 0 ? `+${more} more photos in gallery` : 'View full gallery'}
                  </button>
                </div>
              </>
            ) : null}

            <div className="dv-sub2" style={{ marginTop: 16 }}>Links</div>
            <div className="dv-links">
              <span className="chip"><FileText /> {F.brochure || 'Brochure'}</span>
              <span className="chip"><Globe /> {F.website || 'Website'}</span>
              <span className="chip"><Share2 /> {F.instagram || 'Instagram'}</span>
              <span className="chip"><Link /> LinkedIn</span>
              <span className="chip"><Play /> Virtual tour</span>
            </div>
          </Section>
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn" onClick={() => onRequestUpdate(listing.id)}>
            <RefreshCw /> Mark verified
          </button>
          <button className="btn" onClick={() => onEdit(listing)}>
            <Pencil /> Edit listing
          </button>
          {proposalAdded ? (
            <>
              <button className="btn success" disabled>
                <Check /> Added
              </button>
              <button
                className="btn danger"
                onClick={() => onRemoveProposal?.(listing.id)}
              >
                <X /> Remove
              </button>
            </>
          ) : (
            <button
              className="btn primary"
              onClick={() => {
                onAddProposal(listing.id);
                onClose();
              }}
            >
              <Plus /> Add to proposal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
