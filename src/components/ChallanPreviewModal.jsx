import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle, 
  FileText, 
  Share2, 
  Mail, 
  MessageCircle, 
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import ChallanPreview from './ChallanPreview';
import { downloadChallanPDF, generateChallanPdfBlob } from '../utils/pdfGenerator';
import { shareViaWhatsApp, openEmailComposer, shareViaWebShare } from '../utils/shareUtils';

export default function ChallanPreviewModal({ 
  isOpen, 
  onClose, 
  challan, 
  companyDetails, 
  onPrint, 
  onDownloadPdf,
  onFinalizeSave 
}) {
  const [paperSize, setPaperSize] = useState('a4'); // 'a4', 'a5', 'thermal80', 'thermal58'
  const [copyType, setCopyType] = useState('original'); // 'original', 'duplicate', 'triplicate', 'all'
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !challan) return null;

  // Zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 140));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 60));
  const handleZoomReset = () => setZoomLevel(100);

  // PDF Download with user's selected paper size and copy type
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      if (onDownloadPdf) {
        await onDownloadPdf(challan, { paperSize, copyType });
      } else {
        await downloadChallanPDF(challan, companyDetails, { paperSize, copyType });
      }
    } catch (err) {
      console.error("Failed to download PDF:", err);
      alert("Error generating PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // WhatsApp share handler
  const handleWhatsAppShare = () => {
    shareViaWhatsApp(challan, companyDetails);
  };

  // Email composer handler
  const handleEmailShare = () => {
    openEmailComposer(challan, companyDetails);
  };

  // Web Share API handler
  const handleWebShare = async () => {
    setIsSharing(true);
    try {
      const blob = await generateChallanPdfBlob(challan, companyDetails, { paperSize, copyType });
      const dcNo = (challan.challanNumber || 'Challan').replace(/[/\\?%*:|"<>]/g, '-');
      const fileName = `DC-${dcNo}.pdf`;
      const res = await shareViaWebShare(blob, fileName, challan, companyDetails);
      if (res.unsupported) {
        // Fallback to email composer
        openEmailComposer(challan, companyDetails);
      }
    } catch (err) {
      console.error("Share error:", err);
    } finally {
      setIsSharing(false);
    }
  };

  // Print handler
  const handlePrint = () => {
    if (onPrint) {
      onPrint(challan, { paperSize, copyType });
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-6xl my-2 flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-white">
        
        {/* Top Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3 bg-slate-950 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400/10 rounded-lg text-amber-400 border border-amber-400/20">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">Delivery Challan Output</h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  challan.status === 'Draft' 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : challan.status === 'Cancelled'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {challan.status || 'Draft'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                DC No: <span className="font-mono text-amber-400 font-bold">{challan.challanNumber || 'Pending'}</span> • {challan.customerDetails?.name || (typeof challan.customer === 'string' ? challan.customer.split('\n')[0] : 'No Customer')}
              </p>
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* WhatsApp Share */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
              title="Share DC summary via WhatsApp"
            >
              <MessageCircle size={14} />
              <span className="hidden md:inline">WhatsApp</span>
            </button>

            {/* Email Composer */}
            <button
              type="button"
              onClick={handleEmailShare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
              title="Email Challan"
            >
              <Mail size={14} />
              <span className="hidden md:inline">Email</span>
            </button>

            {/* Native Share */}
            <button
              type="button"
              onClick={handleWebShare}
              disabled={isSharing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
              title="Share PDF Document"
            >
              <Share2 size={14} />
              <span className="hidden md:inline">{isSharing ? 'Sharing...' : 'Share'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-700"
              title="Print Challan"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black transition-colors cursor-pointer shadow-md shadow-amber-500/20"
              title="Download High-Res PDF"
            >
              <Download size={14} />
              <span>{isDownloading ? 'Generating...' : 'PDF'}</span>
            </button>

            {/* Finalize & Save if provided */}
            {onFinalizeSave && (
              <button
                type="button"
                onClick={onFinalizeSave}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer ml-1"
              >
                <CheckCircle size={14} />
                <span>Save</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
              aria-label="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Format & Copies Selector Sub-Bar */}
        <div className="flex flex-wrap items-center justify-between px-5 py-2.5 bg-slate-800/80 border-b border-slate-700 text-xs gap-3">
          {/* Paper Format Selector */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Format:</span>
            <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setPaperSize('a4')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  paperSize === 'a4' 
                    ? 'bg-amber-400 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                A4 (Full Sheet)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('a5')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  paperSize === 'a5' 
                    ? 'bg-amber-400 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                A5 (Half Sheet)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('thermal80')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  paperSize === 'thermal80' 
                    ? 'bg-amber-400 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm POS
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('thermal58')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  paperSize === 'thermal58' 
                    ? 'bg-amber-400 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm POS
              </button>
            </div>
          </div>

          {/* Copy Selector (A4 & A5 only) */}
          {(paperSize === 'a4' || paperSize === 'a5') && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <Layers size={13} className="text-amber-400" />
                Copy:
              </span>
              <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setCopyType('original')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    copyType === 'original' 
                      ? 'bg-blue-600 text-white font-bold' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Original for Recipient"
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => setCopyType('duplicate')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    copyType === 'duplicate' 
                      ? 'bg-blue-600 text-white font-bold' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Duplicate for Transporter"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => setCopyType('triplicate')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    copyType === 'triplicate' 
                      ? 'bg-blue-600 text-white font-bold' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Triplicate for Supplier"
                >
                  Triplicate
                </button>
                <button
                  type="button"
                  onClick={() => setCopyType('all')}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    copyType === 'all' 
                      ? 'bg-indigo-600 text-white font-bold' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="All 3 copies bundled"
                >
                  All 3 Copies
                </button>
              </div>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700 text-slate-300">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 hover:text-white cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="font-mono text-[11px] px-1 font-bold">{zoomLevel}%</span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 hover:text-white cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={13} />
            </button>
            {zoomLevel !== 100 && (
              <button
                type="button"
                onClick={handleZoomReset}
                className="p-1 hover:text-amber-400 cursor-pointer text-slate-400 ml-1"
                title="Reset zoom"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Modal Scrollable Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-950/60 min-h-[450px]">
          <div 
            style={{ 
              transform: `scale(${zoomLevel / 100})`, 
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out'
            }}
            className="flex flex-col items-center"
          >
            <ChallanPreview 
              challan={challan} 
              companyDetails={companyDetails} 
              paperSize={paperSize}
              copyType={copyType}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
