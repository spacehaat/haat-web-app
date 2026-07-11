import { Building2, Calendar, Check, FileText, MapPin, TrainFront } from 'lucide-react';
import FreshBadge from './ui/FreshBadge.jsx';
import { allGalleryPhotos, inr } from '../utils/helpers.js';
import { profileOf } from '../data/schema.js';

export default function ProposalSpaceCard({ listing, index, total }) {
  const photos = allGalleryPhotos(listing, profileOf);
  const loc = `${listing.micro}, ${listing.city}`;

  return (
    <article className="pc-card">
      <header className="pc-head">
        <div className="pc-idx">
          <span className="pc-num tnum">{String(index + 1).padStart(2, '0')}</span>
          <span className="pc-of tnum">of {String(total).padStart(2, '0')}</span>
        </div>
        <div className="pc-title-wrap">
          <h3 className="pc-title">{listing.operator}</h3>
          <p className="pc-loc"><MapPin /> {loc}</p>
        </div>
        <FreshBadge fresh={listing.fresh} />
      </header>

      {photos.length > 0 && (
        <div className={`pc-gal${photos.length === 1 ? ' single' : ''}`}>
          {photos.map((ph, i) => (
            <figure className="pc-gal-cell" key={`${ph.src}-${i}`}>
              <img src={ph.src} alt={ph.label} loading="lazy" />
              <figcaption className="pc-gal-lbl">{ph.label || listing.type}</figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="pc-metrics">
        <div className="pc-metric">
          <span>Capacity</span>
          <b className="tnum">{listing.seats} seats</b>
        </div>
        <div className="pc-metric highlight">
          <span>Price / seat</span>
          <b className="tnum">{inr(listing.price)}/mo</b>
        </div>
        <div className="pc-metric">
          <span>Carpet area</span>
          <b className="tnum">{Number(listing.carpet || 0).toLocaleString('en-IN')} sq ft</b>
        </div>
        <div className="pc-metric">
          <span>Availability</span>
          <b>{listing.avail}</b>
        </div>
      </div>

      <div className="pc-facts">
        {listing.buildingType && (
          <span><Building2 /> {listing.buildingType}</span>
        )}
        {listing.nearestMetro && (
          <span><TrainFront /> {listing.nearestMetro}</span>
        )}
        {listing.securityDeposit && (
          <span><FileText /> Deposit {listing.securityDeposit}</span>
        )}
        {listing.noticePeriod && (
          <span><Calendar /> {listing.noticePeriod} notice</span>
        )}
      </div>

      {listing.amenities?.length > 0 && (
        <div className="pc-amen">
          {listing.amenities.map((a) => (
            <span key={a} className="chip"><Check /> {a}</span>
          ))}
        </div>
      )}
    </article>
  );
}
