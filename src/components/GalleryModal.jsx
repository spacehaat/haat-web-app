import { useRef, useState } from 'react';
import {
  X, ArrowLeft, Pencil, Plus, Check, UploadCloud, Star, Loader2,
} from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { allGalleryPhotos, inr } from '../utils/helpers.js';
import { profileOf } from '../data/schema.js';
import { apiUploadImages } from '../utils/api.js';

function photosFromListing(listing) {
  if (listing.images?.length) {
    const meta = listing.photoMeta || [];
    return listing.images.map((src, i) => ({
      src,
      file: null,
      label: meta[i]?.label || '',
      price: meta[i]?.price ?? '',
    }));
  }
  return allGalleryPhotos(listing, profileOf).map((p) => ({
    src: p.src,
    file: null,
    label: p.label || '',
    price: p.price != null ? String(p.price) : '',
  }));
}

function GalleryView({ listing, photos, onClose, onBack, onEdit, onAddProposal }) {
  return (
    <>
      <div className="modal-head">
        {onBack && (
          <button className="x gal-back" onClick={onBack} title="Back to details">
            <ArrowLeft />
          </button>
        )}
        <div>
          <h3>Photo gallery</h3>
          <div className="mh-sub">
            {listing.operator} · {listing.micro} · {photos.length} photos
          </div>
        </div>
        <button className="x" onClick={onClose}><X /></button>
      </div>

      <div className="modal-body galm-body">
        <div className="galm-grid">
          {photos.map((ph, i) => (
            <figure className="galm-cell" key={`${ph.src}-${i}`}>
              <div className="galm-thumb">
                {i === 0 && <span className="gal-tag">Hero photo</span>}
                <img src={ph.src} alt={ph.label} loading="lazy" />
              </div>
              <figcaption className="galm-cap">
                <span>{ph.label}</span>
                {ph.price ? (
                  <b className="gal-price">
                    {inr(Number(ph.price))}
                    <small>{ph.unit || '/seat'}</small>
                  </b>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="modal-foot">
        {onBack && (
          <button className="btn" onClick={onBack}>
            <ArrowLeft /> Back to details
          </button>
        )}
        <div className="spacer" />
        <button className="btn" onClick={onEdit}>
          <Pencil /> Edit gallery
        </button>
        <button className="btn primary" onClick={onAddProposal}>
          <Plus /> Add to proposal
        </button>
      </div>
    </>
  );
}

function GalleryEditor({ listing, initialPhotos, onCancel, onSaved }) {
  const { saveGallery } = useApp();
  const fileRef = useRef(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const updatePhoto = (i, field, val) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      return next;
    });
  };

  const removePhoto = (i) => {
    setPhotos((prev) => {
      const removed = prev[i];
      if (removed?.file && removed.src?.startsWith('blob:')) {
        URL.revokeObjectURL(removed.src);
      }
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const setCover = (i) => {
    setPhotos((prev) => {
      const next = [...prev];
      const [item] = next.splice(i, 1);
      next.unshift(item);
      return next;
    });
  };

  const addFiles = (files) => {
    const imageFiles = [...files].filter((f) => f.type.startsWith('image/'));
    if (!imageFiles.length) return;

    setPhotos((prev) => [
      ...prev,
      ...imageFiles.map((file) => ({
        src: URL.createObjectURL(file),
        file,
        label: '',
        price: '',
      })),
    ]);
  };

  const handleSave = async () => {
    const valid = photos.filter((p) => p.src);
    if (!valid.length) return;

    setUploading(true);
    setUploadError('');

    try {
      const pending = valid.filter((p) => p.file);

      let uploaded = [];
      if (pending.length) {
        uploaded = await apiUploadImages(pending.map((p) => p.file), listing.id);
      }

      const merged = [];
      let uploadIdx = 0;
      for (const photo of valid) {
        if (photo.file) {
          const item = uploaded[uploadIdx++];
          merged.push({
            src: item.url,
            label: photo.label || '',
            price: photo.price ?? '',
          });
          if (photo.src?.startsWith('blob:')) URL.revokeObjectURL(photo.src);
        } else {
          merged.push({
            src: photo.src,
            label: photo.label || '',
            price: photo.price ?? '',
          });
        }
      }

      await saveGallery(
        listing.id,
        merged.map((p) => p.src),
        merged.map((p) => ({ label: p.label || '', price: p.price ?? '' })),
      );
      onSaved(merged);
    } catch (e) {
      setUploadError(e?.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="modal-head">
        <button className="x gal-back" onClick={onCancel} title="Cancel">
          <ArrowLeft />
        </button>
        <div>
          <h3>Edit gallery</h3>
          <div className="mh-sub">
            {listing.operator} · {listing.micro} · name, price &amp; cover
          </div>
        </div>
        <button className="x" onClick={onCancel}><X /></button>
      </div>

      <div className="modal-body galm-body">
        <div className="img-uploader">
          <div className="img-grid" id="gal-edit-grid">
            {photos.map((p, i) => (
              <div className="ph-card" key={`${p.src}-${i}`}>
                <div className={`img-thumb${i === 0 ? ' cover' : ''}`}>
                  <img src={p.src} alt={`Photo ${i + 1}`} />
                  {i === 0 ? (
                    <span className="cover-tag">Cover</span>
                  ) : (
                    <button
                      type="button"
                      className="img-cover"
                      title="Set as cover"
                      onClick={() => setCover(i)}
                    >
                      <Star />
                    </button>
                  )}
                  <button
                    type="button"
                    className="img-x"
                    onClick={() => removePhoto(i)}
                  >
                    <X />
                  </button>
                </div>
                <input
                  className="inp ph-name"
                  type="text"
                  value={p.label}
                  onChange={(e) => updatePhoto(i, 'label', e.target.value)}
                  placeholder="Photo name (e.g. Private cabin)"
                />
                <div className="ph-price">
                  <span className="ph-cur">₹</span>
                  <input
                    className="inp tnum"
                    type="text"
                    inputMode="numeric"
                    value={p.price}
                    onChange={(e) => updatePhoto(i, 'price', e.target.value.replace(/[^\d.]/g, ''))}
                    placeholder="Optional price"
                  />
                  <span className="ph-unit">/seat</span>
                </div>
              </div>
            ))}
          </div>

          <label
            className={`img-drop${dragging ? ' drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <UploadCloud />
            <span>Add photos</span>
            <small>JPG / PNG · first photo is the cover</small>
          </label>
        </div>
      </div>

      <div className="modal-foot">
        {uploadError && <span className="inv-err">{uploadError}</span>}
        <button className="btn" onClick={onCancel} disabled={uploading}>Cancel</button>
        <div className="spacer" />
        <button className="btn primary" onClick={handleSave} disabled={uploading || !photos.length}>
          {uploading ? <Loader2 className="spin" /> : <Check />}
          {uploading ? 'Uploading…' : 'Save gallery'}
        </button>
      </div>
    </>
  );
}

export default function GalleryModal({ listing: listingProp, onClose, onBack }) {
  const { listings, addToProposal } = useApp();
  const listing = listings.find((l) => l.id === listingProp.id) || listingProp;
  const [mode, setMode] = useState('view');
  const [photos, setPhotos] = useState(() => allGalleryPhotos(listing, profileOf));

  const handleAddProposal = () => {
    addToProposal(listing.id);
    onClose();
  };

  return (
    <div className="modal-bg show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-gallery">
        {mode === 'view' ? (
          <GalleryView
            listing={listing}
            photos={photos}
            onClose={onClose}
            onBack={onBack}
            onEdit={() => setMode('edit')}
            onAddProposal={handleAddProposal}
          />
        ) : (
          <GalleryEditor
            listing={listing}
            initialPhotos={photosFromListing(listing)}
            onCancel={() => setMode('view')}
            onSaved={(updated) => {
              setPhotos(updated.map((p, i) => {
                const defs = allGalleryPhotos(listing, profileOf);
                const d = defs[i] || {};
                return {
                  src: p.src,
                  label: p.label || d.label || `Photo ${i + 1}`,
                  price: p.price !== '' && p.price != null ? Number(p.price) : d.price,
                  unit: d.unit || '/seat',
                };
              }));
              setMode('view');
            }}
          />
        )}
      </div>
    </div>
  );
}
