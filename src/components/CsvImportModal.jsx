import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Loader2,
  FileText
} from 'lucide-react';
import { 
  parseCustomerCsv, 
  parseProductCsv, 
  generateCustomerCsvTemplate, 
  generateProductCsvTemplate, 
  downloadCsvFile,
  sanitizeCsvCell
} from '../utils/csvUtils.js';

export default function CsvImportModal({ 
  isOpen, 
  onClose, 
  type = 'customers', // 'customers' or 'products'
  existingRecords = [], 
  onImportComplete 
}) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const isCustomers = type === 'customers';
  const entityTitle = isCustomers ? 'Customers' : 'Products';

  const handleDownloadTemplate = () => {
    const csvContent = isCustomers 
      ? generateCustomerCsvTemplate() 
      : generateProductCsvTemplate();
    const fileName = isCustomers 
      ? 'Nayaruvi_Customers_Template.csv' 
      : 'Nayaruvi_Products_Template.csv';
    downloadCsvFile(csvContent, fileName);
  };

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.csv') && uploadedFile.type !== 'text/csv') {
      setError("Please select a valid .csv file.");
      return;
    }

    if (uploadedFile.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit.");
      return;
    }

    setFile(uploadedFile);
    setError('');
    processFile(uploadedFile);
  };

  const processFile = (f) => {
    setParsing(true);
    setParseResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const result = isCustomers
          ? parseCustomerCsv(text, existingRecords)
          : parseProductCsv(text, existingRecords);

        setParseResult(result);
      } catch (err) {
        console.error(err);
        setError("Failed to parse CSV file: " + err.message);
      } finally {
        setParsing(false);
      }
    };
    reader.onerror = () => {
      setError("Error reading file from disk.");
      setParsing(false);
    };
    reader.readAsText(f, 'UTF-8');
  };

  const handleDownloadErrorReport = () => {
    if (!parseResult || !parseResult.errorRows.length) return;

    const headers = ['Row Number', 'Name', 'Reason for Failure'].map(sanitizeCsvCell).join(',');
    const rows = parseResult.errorRows.map(r => [
      sanitizeCsvCell(r.rowNumber),
      sanitizeCsvCell(r.name || ''),
      sanitizeCsvCell(r.reason)
    ].join(','));

    const content = '\uFEFF' + [headers, ...rows].join('\r\n');
    downloadCsvFile(content, `Import_Errors_${entityTitle}.csv`);
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    setImporting(true);
    try {
      await onImportComplete(parseResult.validRows);
      onClose();
    } catch (err) {
      setError("Import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl my-6 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/10 rounded-lg text-amber-400 border border-amber-400/20">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Import {entityTitle} via CSV</h3>
              <p className="text-xs text-slate-400">Batch upload records from an Excel or ERP exported spreadsheet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Download sample template info box */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl gap-3">
            <div>
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">Need the correct column format?</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Download our sample CSV template with standard column headers and example Indian business records.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black transition-colors shrink-0 cursor-pointer shadow-sm"
            >
              <Download size={14} />
              <span>Download Template</span>
            </button>
          </div>

          {/* File Upload Box */}
          {!parseResult && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-amber-50/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="mx-auto text-slate-400 mb-3" size={36} />
              <div className="text-sm font-bold text-slate-800">
                Click to upload your .csv file
              </div>
              <p className="text-xs text-slate-500 mt-1">
                CSV files up to 5MB supported. UTF-8 encoding recommended.
              </p>
            </div>
          )}

          {parsing && (
            <div className="p-8 text-center text-slate-600 flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-amber-500" size={28} />
              <span className="text-xs font-bold">Validating CSV rows...</span>
            </div>
          )}

          {/* Parse Result Summary & Preview */}
          {parseResult && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-xl text-xs">
                <div>
                  <span className="text-slate-400">File:</span> <span className="font-bold text-amber-400">{file?.name}</span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Choose another file
                </button>
              </div>

              {/* Status Counters */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                  <div className="text-lg font-black text-slate-800">{parseResult.summary.total}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Total Rows</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-lg font-black text-emerald-700">{parseResult.summary.valid}</div>
                  <div className="text-[10px] font-bold text-emerald-700 uppercase">Ready to Import</div>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <div className="text-lg font-black text-rose-700">{parseResult.summary.failed}</div>
                  <div className="text-[10px] font-bold text-rose-700 uppercase">Failed / Skipped</div>
                </div>
              </div>

              {/* Error Rows Table if any */}
              {parseResult.errorRows.length > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-900 uppercase flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-rose-600" />
                      Row Validation Warnings ({parseResult.errorRows.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadErrorReport}
                      className="text-[11px] font-bold text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download size={12} />
                      Download Error Report
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto divide-y divide-rose-200/60 text-xs">
                    {parseResult.errorRows.slice(0, 10).map((errRow, idx) => (
                      <div key={idx} className="py-1 text-[11px] text-rose-800 flex justify-between">
                        <span>Row {errRow.rowNumber} {errRow.name ? `(${errRow.name})` : ''}</span>
                        <span className="font-semibold text-rose-900">{errRow.reason}</span>
                      </div>
                    ))}
                    {parseResult.errorRows.length > 10 && (
                      <div className="pt-1 text-[10px] text-rose-600 italic">
                        + {parseResult.errorRows.length - 10} more errors. Download error report for full details.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Valid Rows Preview */}
              {parseResult.validRows.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700">Preview Valid Records (First 5):</span>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto bg-slate-50">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Code</th>
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">{isCustomers ? 'Phone / GSTIN' : 'Category / Unit'}</th>
                          <th className="py-2 px-3">{isCustomers ? 'City' : 'Default Rate'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[11px]">
                        {parseResult.validRows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-white">
                            <td className="py-1.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-3 font-mono font-bold text-blue-900">
                              {isCustomers ? (row.customerCode || 'Auto') : (row.productCode || row.sku || 'Auto')}
                            </td>
                            <td className="py-1.5 px-3 font-semibold text-slate-900">{row.name}</td>
                            <td className="py-1.5 px-3 text-slate-600">
                              {isCustomers ? (row.phone || row.gstin || '—') : `${row.category || 'General'} • ${row.unit || 'NOS'}`}
                            </td>
                            <td className="py-1.5 px-3 text-slate-600">
                              {isCustomers ? (row.billingCity || '—') : (row.rate ? `₹${row.rate}` : '0.00')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {parseResult && parseResult.validRows.length > 0 && (
            <button
              type="button"
              disabled={importing}
              onClick={handleConfirmImport}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              <span>{importing ? 'Importing...' : `Confirm & Import (${parseResult.validRows.length})`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
