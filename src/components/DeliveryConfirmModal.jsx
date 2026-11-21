import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, X, AlertCircle, PenLine, RotateCcw, PackageCheck, User, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { recordDeliveryConfirmation } from '../utils/tenantStorage';

export default function DeliveryConfirmModal({ isOpen, onClose, challan, onSuccess }) {
  const { currentCompany, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  // Receiver Info
  const [receiverName, setReceiverName] = useState(challan?.customerDetails?.contactPerson || '');
  const [receiverPhone, setReceiverPhone] = useState(challan?.customerDetails?.phone || '');
  const [receiverDesignation, setReceiverDesignation] = useState('Store In-Charge / Receiving Manager');
  const [deliveredDate, setDeliveredDate] = useState(todayStr);
  const [deliveredTime, setDeliveredTime] = useState(timeStr);
  const [deliveryLocation, setDeliveryLocation] = useState(
    challan?.customerDetails?.deliveryAddress || challan?.transportDetails?.deliveryLocation || ''
  );
  const [remarks, setRemarks] = useState('');

  // Item Quantities Breakdown
  const items = challan?.items || challan?.products || [];
  const [deliveries, setDeliveries] = useState([]);

  // Digital Signature Canvas
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (challan) {
      const initialDeliveries = items.map((it, idx) => {
        const expected = parseFloat(it.quantity) || 0;
        const prevDelivered = parseFloat(it.deliveredQuantity) || 0;
        const remaining = Math.max(0, expected - prevDelivered);

        return {
          serialNumber: it.serialNumber || idx + 1,
          productId: it.productId || null,
          name: it.name,
          unit: it.unit || 'NOS',
          expected,
          prevDelivered,
          remaining,
          deliveredThisEvent: remaining, // default to remaining for convenience
          condition: 'Good',
          remarks: ''
        };
      });
      setDeliveries(initialDeliveries);
    }
  }, [challan]);

  // Canvas drawing event handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleQtyChange = (index, val) => {
    const num = parseFloat(val) || 0;
    setDeliveries(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], deliveredThisEvent: num };
      return copy;
    });
    setError('');
  };

  const handleDeliverAll = () => {
    setDeliveries(prev => prev.map(d => ({ ...d, deliveredThisEvent: d.remaining })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!receiverName.trim()) {
      setError('Receiver Name is required to confirm delivery.');
      return;
    }

    const totalThisDelivery = deliveries.reduce((acc, d) => acc + (parseFloat(d.deliveredThisEvent) || 0), 0);
    if (totalThisDelivery <= 0) {
      setError('You must deliver at least one item quantity in this event.');
      return;
    }

    // Validate no item exceeds remaining quantity
    for (const d of deliveries) {
      const deliveredNow = parseFloat(d.deliveredThisEvent) || 0;
      if (deliveredNow > d.remaining + 0.0001) {
        setError(`Delivered quantity (${deliveredNow}) exceeds remaining quantity (${d.remaining}) for "${d.name}".`);
        return;
      }
    }

    let signatureDataUrl = null;
    if (hasSignature && canvasRef.current) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    }

    setLoading(true);
    try {
      const payload = {
        deliveredDate,
        deliveredTime,
        receiverName: receiverName.trim(),
        receiverPhone: receiverPhone.trim(),
        receiverDesignation: receiverDesignation.trim(),
        deliveryLocation: deliveryLocation.trim(),
        remarks: remarks.trim(),
        signatureDataUrl,
        itemDeliveries: deliveries.map(d => ({
          serialNumber: d.serialNumber,
          productId: d.productId,
          name: d.name,
          deliveredQuantity: parseFloat(d.deliveredThisEvent) || 0,
          condition: d.condition,
          remarks: d.remarks
        }))
      };

      const updated = await recordDeliveryConfirmation(currentCompany.id, challan.id, payload, currentUser);
      if (onSuccess) onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record delivery confirmation.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !challan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-400/10 rounded-lg text-emerald-400 border border-emerald-400/20">
              <PackageCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Record Delivery Confirmation</h3>
              <p className="text-xs text-slate-400">
                Challan #{challan.challanNumber || challan.id} • {challan.customerDetails?.name || 'Customer'}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Item Quantities Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <PackageCheck size={14} className="text-emerald-500" />
                <span>1. Line Items & Quantities Delivered</span>
              </h4>
              <button
                type="button"
                onClick={handleDeliverAll}
                className="text-[11px] font-bold text-amber-600 hover:text-amber-700 underline"
              >
                Deliver All Remaining Items
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3 text-center">Expected</th>
                    <th className="py-2.5 px-3 text-center">Prev. Delivered</th>
                    <th className="py-2.5 px-3 text-center">Remaining</th>
                    <th className="py-2.5 px-3 text-right">Delivered Now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveries.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {item.name}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">({item.unit})</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{item.expected}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">{item.prevDelivered}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600">{item.remaining}</td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max={item.remaining}
                          value={item.deliveredThisEvent}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          className="w-24 px-2 py-1 text-xs text-right font-mono font-bold border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Receiver Acknowledgement */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <User size={14} className="text-emerald-500" />
              <span>2. Receiver Details & Timestamps</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Receiver Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Person receiving goods"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Receiver Phone Number
                </label>
                <input
                  type="text"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  placeholder="Receiver mobile / phone"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={receiverDesignation}
                  onChange={(e) => setReceiverDesignation(e.target.value)}
                  placeholder="e.g. Store Keeper, Project Manager"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Delivered Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={deliveredDate}
                  onChange={(e) => setDeliveredDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Delivered Time
                </label>
                <input
                  type="time"
                  value={deliveredTime}
                  onChange={(e) => setDeliveredTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Delivery Site Address
                </label>
                <input
                  type="text"
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  placeholder="Delivery Site Location"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Digital Signature Pad */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <PenLine size={14} className="text-emerald-500" />
                <span>3. Receiver Digital Signature (Optional)</span>
              </label>
              {hasSignature && (
                <button
                  type="button"
                  onClick={clearSignature}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                >
                  <RotateCcw size={12} /> Clear Signature
                </button>
              )}
            </div>
            
            <div className="border border-slate-300 rounded-xl bg-slate-50/50 p-2 text-center">
              <canvas
                ref={canvasRef}
                width={500}
                height={120}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-28 bg-white border border-dashed border-slate-300 rounded-lg cursor-crosshair touch-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Draw receiver signature above using touch screen, mouse, or stylus
              </p>
            </div>
          </div>

          {/* Section 4: Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Delivery Remarks / Unloading Notes
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Unloaded into warehouse bay 3, inspected without transit damage..."
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
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>Confirming Delivery...</>
              ) : (
                <>
                  <CheckCircle2 size={15} /> Confirm & Save Delivery
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
