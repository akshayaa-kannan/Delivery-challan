import React from 'react';
import { formatCurrency, calculateTotals } from '../utils/calculations';
import { defaultCompanyDetails } from '../data/sampleData';
import { DEFAULT_TERMS_AND_CONDITIONS } from '../utils/indianBusiness';

export const COPY_LABELS = {
  original: 'ORIGINAL FOR RECIPIENT',
  duplicate: 'DUPLICATE FOR TRANSPORTER',
  triplicate: 'TRIPLICATE FOR SUPPLIER',
  extra: 'EXTRA COPY'
};

export default function ChallanPreview({ 
  challan, 
  companyDetails, 
  paperSize = 'a4', 
  copyType = 'original',
  documentSettings = {}
}) {
  const details = companyDetails || defaultCompanyDetails;
  
  if (!challan) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 p-8 font-sans">
        No challan data selected
      </div>
    );
  }

  // Determine whether monetary values are shown
  const isMonetary = challan.isMonetary !== false && documentSettings.hideRates !== true;

  // Calculate totals
  const totals = calculateTotals(challan.products || []);
  const { totalQuantity, totalAmount, totalTax, unitSummary } = totals;

  // Format date helper: converts YYYY-MM-DD to DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Fallback monogram if no logo is uploaded
  const getCompanyInitial = (name) => {
    if (!name) return 'DC';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + (words[1] ? words[1][0] : '')).toUpperCase();
  };

  // Normalize customer details
  const customerName = challan.customerDetails?.name || (typeof challan.customer === 'string' ? challan.customer.split('\n')[0] : '') || '';
  const customerBilling = challan.customerDetails?.billingAddress || (typeof challan.customer === 'string' ? challan.customer.split('\n').slice(1).join('\n') : '') || '';
  const customerDelivery = challan.customerDetails?.deliveryAddress || challan.transport?.deliveryLocation || customerBilling;
  const customerGstin = challan.customerDetails?.gstin || '';
  const customerPhone = challan.customerDetails?.phone || '';
  const customerContact = challan.customerDetails?.contactPerson || '';

  // Challan title text
  const docTitle = (challan.challanType || 'DELIVERY CHALLAN').toUpperCase();
  const currentCopyLabel = COPY_LABELS[copyType] || (copyType && copyType !== 'all' ? copyType.toUpperCase() : 'ORIGINAL FOR RECIPIENT');

  // Terms and Conditions text
  const termsText = documentSettings.termsAndConditions || details.termsAndConditions || DEFAULT_TERMS_AND_CONDITIONS;

  // Signatory Title
  const signatoryTitle = documentSettings.signatoryTitle || "Authorised Signatory";
  const receiverTitle = documentSettings.receiverTitle || "Receiver's Acknowledgment";

  // =========================================================================
  // THERMAL RECEIPT VIEW (80mm & 58mm)
  // =========================================================================
  if (paperSize === 'thermal80' || paperSize === 'thermal58') {
    const is58 = paperSize === 'thermal58';
    return (
      <div 
        id="challan-print-area"
        className={`bg-white text-black font-mono mx-auto shadow-xl p-4 border border-slate-300 print:border-none print:shadow-none print:p-0 ${
          is58 ? 'w-[58mm] max-w-[58mm] text-[9px]' : 'w-[80mm] max-w-[80mm] text-[10px]'
        }`}
      >
        {/* Header */}
        <div className="text-center pb-2 border-b border-dashed border-slate-900">
          <div className="font-black text-xs uppercase leading-tight tracking-wider">
            {details.companyName}
          </div>
          <div className="text-[9px] leading-tight mt-0.5 whitespace-pre-line text-slate-700">
            {details.address}
          </div>
          {details.gstNumber && (
            <div className="text-[9px] font-bold mt-0.5">GSTIN: {details.gstNumber}</div>
          )}
          {details.mobileNumber && (
            <div className="text-[9px]">Ph: {details.mobileNumber}</div>
          )}
          <div className="mt-1.5 inline-block font-black uppercase text-[10px] border border-slate-900 px-2 py-0.5">
            {docTitle}
          </div>
          <div className="text-[8px] font-bold uppercase mt-0.5 text-slate-600">
            {currentCopyLabel}
          </div>
        </div>

        {/* Challan & Customer Info */}
        <div className="py-2 border-b border-dashed border-slate-900 leading-tight space-y-0.5">
          <div className="flex justify-between font-bold">
            <span>DC No: {challan.challanNumber}</span>
            <span>{formatDate(challan.date)}</span>
          </div>
          {challan.purchaseOrderNumber && (
            <div>PO No: <span className="font-bold">{challan.purchaseOrderNumber}</span></div>
          )}
          {(challan.vehicleNumber || challan.transport?.vehicleNumber) && (
            <div>Veh No: <span className="font-bold">{challan.vehicleNumber || challan.transport?.vehicleNumber}</span></div>
          )}
          <div className="pt-1 mt-1 border-t border-dotted border-slate-300">
            <span className="font-bold uppercase block">To: {customerName}</span>
            {customerBilling && <p className="text-[9px] text-slate-600 leading-tight">{customerBilling}</p>}
            {customerGstin && <div>GSTIN: <span className="font-bold">{customerGstin}</span></div>}
          </div>
        </div>

        {/* Products List */}
        <div className="py-2 border-b border-dashed border-slate-900">
          <div className="flex justify-between font-bold text-[9px] pb-1 border-b border-slate-400">
            <span>Item Description</span>
            <span className="text-right">Qty</span>
          </div>
          <div className="divide-y divide-dotted divide-slate-200">
            {(challan.products || []).map((p, idx) => (
              <div key={idx} className="py-1">
                <div className="font-bold leading-tight flex justify-between">
                  <span>{idx + 1}. {p.name}</span>
                  <span className="font-black text-right shrink-0 ml-1">
                    {p.quantity} {p.unit || 'NOS'}
                  </span>
                </div>
                {(p.hsn || p.sku) && (
                  <div className="text-[8px] text-slate-500">
                    {p.hsn ? `HSN:${p.hsn} ` : ''}{p.sku ? `SKU:${p.sku}` : ''}
                  </div>
                )}
                {isMonetary && p.rate > 0 && (
                  <div className="flex justify-between text-[8px] text-slate-600">
                    <span>@ {formatCurrency(p.rate)}</span>
                    <span className="font-bold">{formatCurrency(p.amount || (p.quantity * p.rate))}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="py-2 border-b border-dashed border-slate-900 leading-tight space-y-0.5">
          <div className="flex justify-between font-bold">
            <span>Total Qty:</span>
            <span>{unitSummary || totalQuantity}</span>
          </div>
          {isMonetary && (
            <>
              {totalTax > 0 && (
                <div className="flex justify-between text-[9px] text-slate-600">
                  <span>Tax Amount:</span>
                  <span>{formatCurrency(totalTax)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                <span>Total Value:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </>
          )}
        </div>

        {/* Signatures */}
        <div className="pt-3 pb-1 space-y-4">
          <div className="flex justify-between items-end text-[8px]">
            <div>
              <div className="border-b border-dashed border-slate-500 w-20 h-4"></div>
              <div className="font-bold mt-0.5">{receiverTitle}</div>
            </div>
            <div className="text-right">
              <div className="font-bold">For {details.companyName}</div>
              <div className="h-4"></div>
              <div className="font-bold">{signatoryTitle}</div>
            </div>
          </div>
          <div className="text-center text-[8px] text-slate-500 tracking-wider uppercase border-t border-dotted border-slate-300 pt-1">
            {details.footerTagline || "Thank You For Your Business"}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // A4 & A5 MULTI-PAGE VIEW
  // =========================================================================
  const isA5 = paperSize === 'a5';
  const ROWS_PER_PAGE = isA5 ? 9 : 16;
  const allProducts = [...(challan.products || [])];
  
  while (allProducts.length < ROWS_PER_PAGE || allProducts.length % ROWS_PER_PAGE !== 0) {
    allProducts.push({ name: '', quantity: '', rate: '', amount: '', unit: '', hsn: '', sku: '' });
  }

  const pages = [];
  for (let i = 0; i < allProducts.length; i += ROWS_PER_PAGE) {
    pages.push(allProducts.slice(i, i + ROWS_PER_PAGE));
  }

  // Dynamic logo sizing in preview (1 mm ≈ 3.78 px)
  const configuredWidthMm = Math.max(15, Math.min(80, Number(details.logoWidth) || (details.logoSize === 'small' ? 34 : details.logoSize === 'large' ? 58 : 46)));
  const configuredHeightMm = Math.max(8, Math.min(35, Number(details.logoHeight) || (details.logoSize === 'small' ? 16 : details.logoSize === 'large' ? 26 : 21)));
  const scale = isA5 ? 0.75 : 1;
  const logoWidthPx = Math.round(configuredWidthMm * 3.78 * scale);
  const logoHeightPx = Math.round(configuredHeightMm * 3.78 * scale);

  return (
    <div className="flex flex-col gap-8 print:gap-0 bg-transparent font-sans">
      {pages.map((pageProducts, pageIdx) => {
        const isLastPage = pageIdx === pages.length - 1;
        const startIdx = pageIdx * ROWS_PER_PAGE;

        return (
          <div 
            key={pageIdx}
            id={isLastPage ? "challan-print-area" : undefined}
            className={`challan-preview-sheet flex flex-col justify-between text-black relative select-none print:m-0 print:shadow-none shadow-2xl overflow-hidden bg-white border border-slate-200 print:border-none ${
              isA5 ? 'p-4 sm:p-5 max-w-[148mm] min-h-[205mm]' : 'p-6 sm:p-8 max-w-[210mm] min-h-[285mm]'
            }`}
            style={{ pageBreakAfter: isLastPage ? 'auto' : 'always' }}
          >
            {/* Watermark Stamp for Draft or Cancelled */}
            {challan.status === 'Cancelled' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none overflow-hidden">
                <div className="border-[8px] border-red-600/30 rounded-2xl px-12 py-4 text-red-600/30 text-6xl md:text-7xl font-black tracking-widest uppercase transform -rotate-12 border-double">
                  Cancelled
                </div>
              </div>
            )}
            {challan.status === 'Draft' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none overflow-hidden">
                <div className="border-[8px] border-amber-600/20 rounded-2xl px-12 py-4 text-amber-600/20 text-6xl md:text-7xl font-black tracking-widest uppercase transform -rotate-12 border-double">
                  Draft
                </div>
              </div>
            )}

            <div>
              {/* 1. Dynamic Tenant Header */}
              <div className="flex justify-between items-start pb-2.5 border-b-2 border-slate-900">
                {/* Dynamic Logo Section */}
                <div className="w-[45%] flex flex-col pt-0.5">
                  {details.logoUrl ? (
                    <img 
                      src={details.logoUrl} 
                      alt={details.companyName || "Company Logo"} 
                      style={{ 
                        width: `${logoWidthPx}px`, 
                        height: `${logoHeightPx}px`, 
                        maxWidth: isA5 ? '200px' : '280px',
                        maxHeight: isA5 ? '80px' : '120px',
                        objectFit: details.lockAspectRatio === false ? 'fill' : 'contain',
                        display: 'block' 
                      }}
                      className="self-start transition-all duration-150"
                    />
                  ) : (
                    <div 
                      style={{ 
                        width: `${logoWidthPx}px`, 
                        height: `${logoHeightPx}px` 
                      }}
                      className="bg-slate-900 text-white rounded-lg flex items-center justify-center px-3 py-1 shadow-sm transition-all duration-150"
                    >
                      <span className={`font-black tracking-wider text-amber-400 ${isA5 ? 'text-base' : 'text-xl'}`}>
                        {getCompanyInitial(details.companyName)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Dynamic Company Details Section */}
                <div className="w-[55%] text-right">
                  <h1 className={`font-extrabold text-[#d32f2f] uppercase tracking-wide leading-none mb-1 ${isA5 ? 'text-base' : 'text-xl'}`}>
                    {details.companyName}
                  </h1>
                  <p className={`text-slate-800 leading-tight font-semibold whitespace-pre-line ${isA5 ? 'text-[8.5px]' : 'text-[10px]'}`}>
                    {details.address}
                  </p>
                  <div className={`mt-1 space-y-0.5 text-slate-900 font-bold ${isA5 ? 'text-[8.5px]' : 'text-[10px]'}`}>
                    {details.gstNumber && (
                      <p>GSTIN: <span className="font-mono">{details.gstNumber}</span></p>
                    )}
                    {details.mobileNumber && (
                      <p>Mobile: {details.mobileNumber}</p>
                    )}
                    {details.email && (
                      <p>Email: {details.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Title Capsule, Copy Badge & Page indicator */}
              <div className="my-2 flex justify-between items-center">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  Transportation under CGST Rule 55
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block border-2 border-slate-900 rounded-full font-black uppercase tracking-widest bg-white ${
                    isA5 ? 'px-3 py-0.5 text-[10px]' : 'px-6 py-0.5 text-xs'
                  }`}>
                    {docTitle}
                  </span>
                  <span className={`inline-block border border-slate-700 bg-slate-100 rounded px-2 py-0.5 font-bold uppercase tracking-wider text-slate-800 ${
                    isA5 ? 'text-[8px]' : 'text-[9px]'
                  }`}>
                    {currentCopyLabel}
                  </span>
                </div>
                <div className={`font-bold text-slate-600 font-mono ${isA5 ? 'text-[8.5px]' : 'text-[10px]'}`}>
                  Page {pageIdx + 1} of {pages.length}
                </div>
              </div>

              {/* 2. Customer & Challan Metadata Boxes Grid */}
              <div className={`grid grid-cols-2 gap-2.5 mb-2.5 ${isA5 ? 'text-[9.5px]' : 'text-xs'}`}>
                {/* Receiver & Delivery Address Box */}
                <div className="border border-slate-900 rounded-xl p-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-extrabold text-slate-900 uppercase">Consignee (To) :</span>
                      {customerGstin && (
                        <span className="text-[9px] font-mono font-bold text-slate-700">GSTIN: {customerGstin}</span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-950 uppercase">{customerName}</div>
                    {customerContact && (
                      <div className="text-[9.5px] text-slate-600 font-medium">Attn: {customerContact} {customerPhone ? `(${customerPhone})` : ''}</div>
                    )}
                    
                    <div className="mt-1">
                      <span className="text-[8.5px] font-bold text-slate-500 uppercase block">Billing Address:</span>
                      <p className="text-[9.5px] font-semibold text-slate-800 leading-tight whitespace-pre-wrap">
                        {customerBilling || "As per record"}
                      </p>
                    </div>

                    {customerDelivery && customerDelivery !== customerBilling && (
                      <div className="mt-1 pt-1 border-t border-dashed border-slate-200">
                        <span className="text-[8.5px] font-bold text-slate-500 uppercase block">Ship To / Delivery Site:</span>
                        <p className="text-[9.5px] font-semibold text-slate-800 leading-tight whitespace-pre-wrap">
                          {customerDelivery}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata & Transport Box */}
                <div className="border border-slate-900 rounded-xl p-2.5 flex flex-col justify-between">
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <div>
                      <span className="text-[9px] font-bold text-slate-600 block">DC No:</span>
                      <span className="font-mono font-black text-slate-950">{challan.challanNumber}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-600 block">Date:</span>
                      <span className="font-bold text-slate-950">{formatDate(challan.date)}</span>
                    </div>

                    {challan.financialYear && (
                      <div>
                        <span className="text-[8.5px] font-bold text-slate-600 block">Financial Year:</span>
                        <span className="font-bold text-slate-900 text-[9.5px]">{challan.financialYear}</span>
                      </div>
                    )}

                    {challan.purchaseOrderNumber && (
                      <div>
                        <span className="text-[8.5px] font-bold text-slate-600 block">PO No:</span>
                        <span className="font-bold text-slate-900 text-[9.5px]">{challan.purchaseOrderNumber}</span>
                      </div>
                    )}

                    {challan.workOrderNumber && (
                      <div>
                        <span className="text-[8.5px] font-bold text-slate-600 block">Work Order No:</span>
                        <span className="font-bold text-slate-900 text-[9.5px]">{challan.workOrderNumber}</span>
                      </div>
                    )}

                    {challan.jobWorkRef && (
                      <div>
                        <span className="text-[8.5px] font-bold text-slate-600 block">Job Work Ref:</span>
                        <span className="font-bold text-slate-900 text-[9.5px]">{challan.jobWorkRef}</span>
                      </div>
                    )}

                    {(challan.vehicleNumber || challan.transport?.vehicleNumber) && (
                      <div>
                        <span className="text-[8.5px] font-bold text-slate-600 block">Vehicle No:</span>
                        <span className="font-mono font-bold text-slate-950 text-[9.5px]">
                          {challan.vehicleNumber || challan.transport?.vehicleNumber}
                        </span>
                      </div>
                    )}

                    {challan.transport?.transporterName && (
                      <div>
                        <span className="text-[8.5px] font-bold text-slate-600 block">Transporter:</span>
                        <span className="font-medium text-slate-900 text-[9.5px]">{challan.transport.transporterName}</span>
                      </div>
                    )}

                    {challan.transport?.lrNumber && (
                      <div>
                        <span className="text-[8.5px] font-bold text-slate-600 block">LR / Transport No:</span>
                        <span className="font-mono text-slate-900 text-[9.5px]">{challan.transport.lrNumber}</span>
                      </div>
                    )}

                    {challan.transport?.ewayBillNumber && (
                      <div>
                        <span className="text-[8.5px] font-bold text-slate-600 block">E-Way Bill No:</span>
                        <span className="font-mono text-slate-900 text-[9.5px]">{challan.transport.ewayBillNumber}</span>
                      </div>
                    )}

                    {challan.returnable?.isReturnable && (
                      <div className="col-span-2 pt-1 mt-1 border-t border-dashed border-amber-300 bg-amber-50/60 px-1 rounded">
                        <span className="text-[8.5px] font-black text-amber-900 uppercase">
                          Returnable Goods • Expected Return: {formatDate(challan.returnable.returnDate) || 'Pending'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Items Table */}
              <div className="border-t-2 border-r-2 border-l-2 border-slate-900 rounded-t-xl overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                      <th className="py-1 px-1.5 border-r border-slate-700 text-center w-8">#</th>
                      <th className="py-1 px-2.5 border-r border-slate-700 text-left">Description of Goods</th>
                      <th className="py-1 px-1.5 border-r border-slate-700 text-center w-16">HSN/SAC</th>
                      <th className="py-1 px-1.5 border-r border-slate-700 text-right w-16">Qty</th>
                      {isMonetary && (
                        <>
                          <th className="py-1 px-1.5 border-r border-slate-700 text-right w-20">Rate</th>
                          <th className="py-1 px-2 border-slate-700 text-right w-24">Amount</th>
                        </>
                      )}
                      {!isMonetary && (
                        <th className="py-1 px-2 border-slate-700 text-left w-28">Remarks / Specs</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {pageProducts.map((p, idx) => {
                      const actualIdx = startIdx + idx + 1;
                      const hasData = Boolean(p.name);
                      return (
                        <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} text-[10px]`}>
                          <td className="py-1 px-1.5 border-r border-slate-900 text-center font-mono font-bold text-slate-700">
                            {hasData ? actualIdx : ''}
                          </td>
                          <td className="py-1 px-2.5 border-r border-slate-900 font-medium text-slate-900">
                            {hasData && (
                              <div>
                                <span className="font-bold text-slate-950 uppercase">{p.name}</span>
                                {p.sku && <span className="text-[8.5px] font-mono text-slate-500 ml-1.5">[{p.sku}]</span>}
                                {p.description && <p className="text-[8.5px] text-slate-600 leading-tight">{p.description}</p>}
                              </div>
                            )}
                          </td>
                          <td className="py-1 px-1.5 border-r border-slate-900 text-center font-mono text-slate-700">
                            {hasData ? (p.hsn || '-') : ''}
                          </td>
                          <td className="py-1 px-1.5 border-r border-slate-900 text-right font-mono font-bold text-slate-950">
                            {hasData ? `${p.quantity} ${p.unit || 'NOS'}` : ''}
                          </td>
                          {isMonetary && (
                            <>
                              <td className="py-1 px-1.5 border-r border-slate-900 text-right font-mono text-slate-800">
                                {hasData && p.rate !== undefined && p.rate !== '' ? formatCurrency(p.rate) : ''}
                              </td>
                              <td className="py-1 px-2 border-slate-900 text-right font-mono font-bold text-slate-950">
                                {hasData && (p.amount || (p.quantity && p.rate ? p.quantity * p.rate : '')) ? formatCurrency(p.amount || p.quantity * p.rate) : ''}
                              </td>
                            </>
                          )}
                          {!isMonetary && (
                            <td className="py-1 px-2 border-slate-900 text-left text-slate-600 text-[9px]">
                              {hasData ? (p.description || '-') : ''}
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {/* Table Totals Row on Last Page */}
                    {isLastPage && (
                      <tr className="bg-slate-100 text-[10px] font-black uppercase tracking-wide">
                        <td colSpan="2" className="py-1.5 px-3 border-t-2 border-r border-slate-900 text-right font-bold text-slate-800">
                          TOTAL ({totals.itemCount} items)
                        </td>
                        <td className="py-1.5 px-1.5 border-t-2 border-r border-slate-900 text-center font-mono text-slate-600">
                          -
                        </td>
                        <td className="py-1.5 px-1.5 border-t-2 border-r border-slate-900 text-right font-mono text-slate-950 font-black">
                          {unitSummary || totalQuantity}
                        </td>
                        {isMonetary && (
                          <>
                            <td className="py-1.5 px-1.5 border-t-2 border-r border-slate-900 text-right text-[8.5px] font-bold text-slate-600">
                              {totalTax > 0 ? `Tax: ${formatCurrency(totalTax)}` : ''}
                            </td>
                            <td className="py-1.5 px-2 border-t-2 border-slate-900 text-right font-mono text-slate-950 font-black">
                              {formatCurrency(totalAmount)}
                            </td>
                          </>
                        )}
                        {!isMonetary && (
                          <td className="py-1.5 px-2 border-t-2 border-slate-900 text-left text-[8.5px] font-bold text-slate-600">
                            Goods in good order
                          </td>
                        )}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Footer Section */}
            {isLastPage ? (
              <div className="flex flex-col mt-2">
                {/* Weight & Packaging Strip */}
                {(challan.weights?.totalGrossWeight || challan.totalGrossWeight || challan.weights?.grossWeight || challan.weights?.numberOfPackages || challan.weights?.actual) && (
                  <div className="px-2.5 py-1 border border-slate-300 rounded-lg bg-slate-50/70 mb-1.5 text-[9px] font-bold text-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span>PACKAGES: <strong className="font-mono">{challan.totalPackages || challan.weights?.numberOfPackages || challan.weights?.totalPackages || '—'} {challan.packagingType || challan.weights?.packageType || 'Pkgs'}</strong></span>
                      <span>NET WT: <strong className="font-mono">{challan.weights?.totalNetWeight !== undefined ? challan.weights.totalNetWeight : (challan.totalNetWeight || '—')} {challan.weights?.weightUnit || 'Kg'}</strong></span>
                      <span>TARE WT: <strong className="font-mono">{challan.weights?.totalPackagingWeight !== undefined ? challan.weights.totalPackagingWeight : (challan.weights?.tareWeight || '0')} {challan.weights?.weightUnit || 'Kg'}</strong></span>
                      <span>GROSS WT: <strong className="font-mono text-slate-950">{challan.weights?.totalGrossWeight !== undefined ? challan.weights.totalGrossWeight : (challan.totalGrossWeight || '—')} {challan.weights?.weightUnit || 'Kg'}</strong></span>
                    </div>
                    {(challan.weights?.actual?.weighbridgeReceiptNo || challan.weights?.actual?.receiptNumber) && (
                      <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        WB SLIP: #{challan.weights.actual.weighbridgeReceiptNo || challan.weights.actual.receiptNumber} ({challan.weights.actual.grossWeight} {challan.weights.actual.weightUnit || 'Kg'})
                      </span>
                    )}
                  </div>
                )}

                {/* Remarks & Delivery Instructions */}
                {(challan.remarks || challan.transport?.deliveryInstructions) && (
                  <div className="px-2.5 py-1 border border-slate-300 rounded-lg bg-slate-50/50 mb-1.5 text-xs">
                    {challan.transport?.deliveryInstructions && (
                      <p className="text-[9.5px] text-slate-700">
                        <strong className="text-slate-900">Delivery Instructions:</strong> {challan.transport.deliveryInstructions}
                      </p>
                    )}
                    {challan.remarks && (
                      <p className="text-[9.5px] text-slate-700">
                        <strong className="text-slate-900">Remarks:</strong> {challan.remarks}
                      </p>
                    )}
                  </div>
                )}

                {/* Terms and Conditions */}
                <div className="text-[8.5px] text-slate-600 leading-snug mb-2 border-t border-slate-300 pt-1.5">
                  <span className="font-bold text-slate-800 uppercase mr-1">Terms & Conditions:</span>
                  <span>{termsText}</span>
                </div>

                {/* Signatures Area */}
                <div className="my-1 pt-1 border-t-2 border-slate-900">
                  <div className="flex justify-between items-end">
                    {/* Receiver Signature */}
                    <div className="w-2/5">
                      <div className="text-[9.5px] font-extrabold text-slate-900 uppercase">{receiverTitle} :</div>
                      <div className="text-[8.5px] text-slate-600 mt-0.5">Received goods in good order and condition</div>
                      <div className="h-7 border-b border-dashed border-slate-400 mt-1.5 w-4/5"></div>
                      <div className="text-[8px] text-slate-500 mt-0.5 italic">(Receiver Name, Stamp & Signature)</div>
                    </div>
                    
                    {/* Authorized Signatory */}
                    <div className="w-1/2 text-right">
                      <span className="text-[8.5px] font-bold text-slate-600 block leading-none">For</span>
                      <span className="text-xs font-black text-[#d32f2f] uppercase leading-none block mt-1 tracking-wider">
                        {details.companyName}
                      </span>
                      <div className="h-7 mt-1.5"></div>
                      <div className="text-[9.5px] font-extrabold text-slate-900 uppercase tracking-wider">
                        {signatoryTitle}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Tagline Banner */}
                <div className="bg-slate-900 text-white text-center py-1.5 rounded-lg border border-slate-800 mt-1.5">
                  <span className="text-[9.5px] font-black uppercase tracking-[0.2em]">
                    {details.footerTagline || "Thank You For Your Business"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1 mt-3">
                <div className="text-right text-[9.5px] text-slate-500 italic">
                  Continued on next page...
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
