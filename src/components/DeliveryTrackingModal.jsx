import React, { useState } from 'react';
import { Navigation, X, Calendar, MapPin, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { recordDeliveryEvent, DELIVERY_STATUSES } from '../utils/tenantStorage';

const TRACKING_EVENT_TYPES = [
  { label: 'Shipment Picked Up', statusAfter: DELIVERY_STATUSES.DISPATCHED },
  { label: 'In Transit', statusAfter: DELIVERY_STATUSES.IN_TRANSIT },
  { label: 'Reached Destination Hub', statusAfter: DELIVERY_STATUSES.IN_TRANSIT },
  { label: 'Out for Delivery', statusAfter: DELIVERY_STATUSES.IN_TRANSIT },
  { label: 'Delivery Delayed', statusAfter: null },
  { label: 'Delivery Attempted', statusAfter: null },
  { label: 'Delivery Failed', statusAfter: DELIVERY_STATUSES.DELIVERY_FAILED },
  { label: 'Returned to Origin', statusAfter: DELIVERY_STATUSES.DELIVERY_FAILED },
  { label: 'Custom Note / Checkpoint', statusAfter: null }
];

export default function DeliveryTrackingModal({ isOpen, onClose, challan, onSuccess }) {
  const { currentCompany, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  const [selectedEvent, setSelectedEvent] = useState(TRACKING_EVENT_TYPES[1].label);
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [eventDate, setEventDate] = useState(todayStr);
  const [eventTime, setEventTime] = useState(timeStr);

  if (!isOpen || !challan) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim() && (selectedEvent.includes('Failed') || selectedEvent.includes('Delayed'))) {
      setError('A reason / note is required when recording a delayed or failed delivery.');
      return;
    }

    const matchedConfig = TRACKING_EVENT_TYPES.find(t => t.label === selectedEvent);
    const targetStatus = matchedConfig?.statusAfter || null;

    setLoading(true);
    try {
      const updated = await recordDeliveryEvent(currentCompany.id, challan.id, {
        eventType: selectedEvent,
        timestamp: `${eventDate}T${eventTime}:00Z`,
        location: location.trim(),
        note: note.trim(),
        statusAfter: targetStatus
      }, currentUser);

      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record tracking update.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg my-6 flex flex-col overflow-hidden animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400/10 rounded-lg text-amber-400 border border-amber-400/20">
              <Navigation size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Record Tracking Milestone</h3>
              <p className="text-xs text-slate-400">
                Challan #{challan.challanNumber || challan.id} • Current: {challan.deliveryStatus || 'In Progress'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Milestone Event Type <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
            >
              {TRACKING_EVENT_TYPES.map(t => (
                <option key={t.label} value={t.label}>
                  {t.label} {t.statusAfter ? `(Updates status to ${t.statusAfter})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Event Date
              </label>
              <input
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Event Time
              </label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Current Location / Hub / Checkpoint
            </label>
            <div className="relative">
              <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Salem Toll Plaza, Bangalore Outer Ring Hub..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Status Notes & Details {selectedEvent.includes('Failed') || selectedEvent.includes('Delayed') ? <span className="text-red-500">*</span> : ''}
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Detailed notes on the transit event, driver report, or delay reason..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>Saving...</>
              ) : (
                <>
                  <CheckCircle2 size={15} /> Save Tracking Event
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
