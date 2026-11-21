import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { DEFAULT_TERMS_AND_CONDITIONS } from './indianBusiness.js';

/**
 * Standard Copy Types for Delivery Challans
 */
export const COPY_TYPES = [
  'ORIGINAL FOR RECIPIENT',
  'DUPLICATE FOR TRANSPORTER',
  'TRIPLICATE FOR SUPPLIER',
  'EXTRA COPY'
];

/**
 * Helper to convert image URL to base64 data URL
 */
const getBase64ImageFromUrl = async (url) => {
  if (!url) return null;
  if (typeof url === 'string' && url.startsWith('data:image/')) {
    return url;
  }
  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Failed to load company logo for PDF, using dynamic vector monogram:", error);
    return null;
  }
};

/**
 * Format Date from YYYY-MM-DD to DD/MM/YYYY
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

/**
 * Helper to format currency for PDF Helvetica font (Rs. instead of ₹ to avoid encoding box)
 */
export const formatPdfCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Rs. 0.00';
  }
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  
  return formatted.replace('₹', 'Rs. ');
};

const getCompanyInitials = (name) => {
  if (!name) return 'DC';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return (words[0][0] + (words[1] ? words[1][0] : '')).toUpperCase();
};

/**
 * Sanitizes a challan filename
 */
export const getChallanPdfFileName = (challan) => {
  const cleanNo = (challan?.challanNumber || 'DC').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `NAYARUVI-${cleanNo}.pdf`;
};

// ============================================================================
// 1. A4 FORMAT RENDERER
// ============================================================================
const renderA4Pages = (pdf, challan, details, logoBase64, copyType, settings = {}, isFirstDocInPdf = true) => {
  const isMonetary = challan.isMonetary !== false && settings.showRates !== false;
  const tableX = 10;
  const tableW = 190;
  
  let colX;
  if (isMonetary) {
    colX = { sno: 22, products: 106, hsn: 126, qty: 148, rate: 172 };
  } else {
    colX = { sno: 22, products: 122, hsn: 144, qty: 168 };
  }

  const ROWS_PER_PAGE = 15;
  const rowH = 6.8;

  const allProducts = [...(challan.products || [])];
  while (allProducts.length < ROWS_PER_PAGE || allProducts.length % ROWS_PER_PAGE !== 0) {
    allProducts.push({ name: '', quantity: '', rate: '', amount: '', unit: '', hsn: '', sku: '' });
  }

  const totalPages = Math.ceil(allProducts.length / ROWS_PER_PAGE);
  let currentProdIdx = 0;

  const customerName = challan.customerDetails?.name || (typeof challan.customer === 'string' ? challan.customer.split('\n')[0] : '') || '';
  const customerBilling = challan.customerDetails?.billingAddress || (typeof challan.customer === 'string' ? challan.customer.split('\n').slice(1).join('\n') : '') || '';
  const customerDelivery = challan.customerDetails?.deliveryAddress || challan.transport?.deliveryLocation || customerBilling;
  const customerGstin = challan.customerDetails?.gstin || '';
  const customerPhone = challan.customerDetails?.phone || '';
  const docTitle = (settings.documentTitle || challan.challanType || 'DELIVERY CHALLAN').toUpperCase();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (!isFirstDocInPdf || pageNum > 1) {
      pdf.addPage('a4', 'portrait');
    }

    pdf.setLineWidth(0.2);
    pdf.setDrawColor(30, 41, 59);

    // Copy Type Header Flag (Top Banner if copy specified)
    if (copyType) {
      pdf.setFillColor(241, 245, 249);
      pdf.rect(10, 5, 190, 4.5, 'F');
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(71, 85, 105);
      pdf.text(copyType, 105, 8.2, { align: 'center' });
    }

    const headerTop = copyType ? 11 : 10;

    // Logo Section
    let targetWidth = 46;
    if (details.logoWidth) targetWidth = Math.max(15, Math.min(80, Number(details.logoWidth)));
    let targetHeight = 21;
    if (details.logoHeight) targetHeight = Math.max(8, Math.min(32, Number(details.logoHeight)));

    let logoDrawn = false;
    if (logoBase64) {
      try {
        const imgProps = pdf.getImageProperties(logoBase64);
        const fileType = imgProps?.fileType || 'PNG';
        if (details.lockAspectRatio && !details.logoHeight && imgProps?.width && imgProps?.height) {
          const aspectRatio = imgProps.width / imgProps.height;
          targetHeight = Math.min(32, Math.max(8, targetWidth / aspectRatio));
        }
        pdf.addImage(logoBase64, fileType, 10, headerTop, targetWidth, targetHeight);
        logoDrawn = true;
      } catch (e) {
        logoDrawn = false;
      }
    }
    
    if (!logoDrawn) {
      pdf.setFillColor(15, 23, 42);
      pdf.roundedRect(10, headerTop, targetWidth, targetHeight, 2, 2, 'F');
      pdf.setTextColor(245, 158, 11);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(Math.max(10, Math.min(18, Math.round(targetHeight * 0.7))));
      pdf.text(getCompanyInitials(details.companyName), 10 + (targetWidth / 2), headerTop + (targetHeight * 0.65), { align: 'center' });
    }

    // Company Profile (Right)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(211, 47, 47);
    pdf.text(details.companyName || "COMPANY NAME", 200, headerTop + 4, { align: 'right' });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(30, 41, 59);
    
    const addressLines = pdf.splitTextToSize(details.address || '', 110);
    pdf.text(addressLines, 200, headerTop + 9, { align: 'right' });
    
    let metaY = headerTop + 9 + (addressLines.length * 3.4);
    if (details.gstNumber) {
      pdf.text(`GSTIN: ${details.gstNumber}`, 200, metaY, { align: 'right' });
      metaY += 3.4;
    }
    if (details.mobileNumber) {
      pdf.text(`Mobile: ${details.mobileNumber}`, 200, metaY, { align: 'right' });
      metaY += 3.4;
    }
    if (details.email) {
      pdf.text(`Email: ${details.email}`, 200, metaY, { align: 'right' });
    }

    // Document Title Capsule
    const titleY = headerTop + 27;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(70, titleY, 70, 6, 3, 3, 'FD');
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(docTitle, 105, titleY + 4.2, { align: 'center' });

    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Page ${pageNum} of ${totalPages}`, 200, titleY + 4.2, { align: 'right' });

    // Customer Box & Metadata Box
    const boxY = titleY + 8;
    const boxH = 32;
    const tableY = boxY + boxH + 3;

    // Customer Box (Left)
    pdf.setLineWidth(0.2);
    pdf.setDrawColor(30, 41, 59);
    pdf.roundedRect(10, boxY, 93, boxH, 1.5, 1.5, 'S');
    
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(30, 41, 59);
    pdf.text("CONSIGNEE (TO):", 13, boxY + 4.5);
    
    if (customerGstin) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.text(`GSTIN: ${customerGstin}`, 100, boxY + 4.5, { align: 'right' });
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(customerName.substring(0, 45), 13, boxY + 9);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(51, 65, 85);

    let custY = boxY + 13;
    const billLines = pdf.splitTextToSize(`Address: ${customerBilling.replace(/\n/g, ', ')}`, 88);
    pdf.text(billLines.slice(0, 2), 13, custY);
    custY += Math.min(billLines.length, 2) * 3.2;

    if (customerDelivery && customerDelivery !== customerBilling) {
      const shipLines = pdf.splitTextToSize(`Delivery Site: ${customerDelivery.replace(/\n/g, ', ')}`, 88);
      pdf.text(shipLines.slice(0, 2), 13, custY);
      custY += Math.min(shipLines.length, 2) * 3.2;
    }
    if (customerPhone && settings.showCustomerContact !== false) {
      pdf.text(`Phone: ${customerPhone}`, 13, custY);
    }

    // Metadata Box (Right)
    pdf.roundedRect(107, boxY, 93, boxH, 1.5, 1.5, 'S');
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);

    let rightY = boxY + 4.5;
    pdf.text("DC No:", 110, rightY);
    pdf.text(challan.challanNumber || '', 132, rightY);

    pdf.text("Date:", 160, rightY);
    pdf.text(formatDate(challan.date), 175, rightY);
    rightY += 4.5;

    if (challan.purchaseOrderNumber) {
      pdf.text("PO No:", 110, rightY);
      pdf.setFont("helvetica", "normal");
      pdf.text(challan.purchaseOrderNumber, 132, rightY);
      pdf.setFont("helvetica", "bold");
    }
    if (challan.financialYear) {
      pdf.text("FY:", 160, rightY);
      pdf.setFont("helvetica", "normal");
      pdf.text(challan.financialYear, 175, rightY);
      pdf.setFont("helvetica", "bold");
    }
    rightY += 4.5;

    const vehNo = challan.vehicleNumber || challan.transport?.vehicleNumber;
    if (vehNo && settings.showTransport !== false) {
      pdf.text("Vehicle No:", 110, rightY);
      pdf.setFont("helvetica", "normal");
      pdf.text(vehNo, 132, rightY);
      pdf.setFont("helvetica", "bold");
    }
    if (challan.workOrderNumber) {
      pdf.text("WO No:", 160, rightY);
      pdf.setFont("helvetica", "normal");
      pdf.text(challan.workOrderNumber, 175, rightY);
      pdf.setFont("helvetica", "bold");
    }
    rightY += 4.5;

    if (challan.transport?.transporterName && settings.showTransport !== false) {
      pdf.text("Transporter:", 110, rightY);
      pdf.setFont("helvetica", "normal");
      pdf.text(challan.transport.transporterName.substring(0, 32), 132, rightY);
      pdf.setFont("helvetica", "bold");
      rightY += 4.5;
    }

    if (challan.transport?.lrNumber && settings.showTransport !== false) {
      pdf.text("LR / Doc No:", 110, rightY);
      pdf.setFont("helvetica", "normal");
      pdf.text(challan.transport.lrNumber, 132, rightY);
      pdf.setFont("helvetica", "bold");
    }
    if (challan.transport?.ewayBillNumber && settings.showTransport !== false) {
      pdf.text("E-Way Bill:", 160, rightY);
      pdf.setFont("helvetica", "normal");
      pdf.text(challan.transport.ewayBillNumber, 175, rightY);
    }

    // Products Table
    const isLastPage = (pageNum === totalPages);
    const rowsThisPage = ROWS_PER_PAGE;
    const currentTableH = 7 + (rowsThisPage * rowH) + (isLastPage ? 8 : 0);

    pdf.setLineWidth(0.2);
    pdf.setDrawColor(30, 41, 59);
    pdf.rect(tableX, tableY, tableW, currentTableH, 'S');

    // Column Separators
    pdf.line(colX.sno, tableY, colX.sno, tableY + currentTableH);
    pdf.line(colX.products, tableY, colX.products, tableY + currentTableH);
    pdf.line(colX.hsn, tableY, colX.hsn, tableY + currentTableH);
    pdf.line(colX.qty, tableY, colX.qty, tableY + currentTableH);
    if (isMonetary) {
      pdf.line(colX.rate, tableY, colX.rate, tableY + currentTableH);
    }

    // Table Header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42);
    pdf.text("S.No", (tableX + colX.sno) / 2, tableY + 4.8, { align: 'center' });
    pdf.text("ITEM DESCRIPTION & SPECS", colX.sno + 3, tableY + 4.8);
    pdf.text("HSN/SAC", (colX.products + colX.hsn) / 2, tableY + 4.8, { align: 'center' });
    pdf.text("QUANTITY", (colX.hsn + colX.qty) / 2, tableY + 4.8, { align: 'center' });
    
    if (isMonetary) {
      pdf.text("RATE", (colX.qty + colX.rate) / 2, tableY + 4.8, { align: 'center' });
      pdf.text("AMOUNT", (colX.rate + 200) / 2, tableY + 4.8, { align: 'center' });
    } else {
      pdf.text("REMARKS", (colX.qty + 200) / 2, tableY + 4.8, { align: 'center' });
    }
    pdf.line(tableX, tableY + 7, tableX + tableW, tableY + 7);

    // Data Rows
    const startRowY = tableY + 7;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);

    for (let i = 0; i < rowsThisPage; i++) {
      const prod = allProducts[currentProdIdx];
      const currentY = startRowY + i * rowH;
      const textY = currentY + 4.8;

      if (prod.name !== undefined && prod.name !== '') {
        pdf.text(String(currentProdIdx + 1), (tableX + colX.sno) / 2, textY, { align: 'center' });
        const nameText = (prod.sku && settings.showSku !== false) ? `${prod.name} (${prod.sku})` : prod.name;
        const truncatedName = nameText.length > 46 ? nameText.substring(0, 44) + "..." : nameText;
        pdf.text(truncatedName, colX.sno + 3, textY);
        
        pdf.text(prod.hsn || '-', (colX.products + colX.hsn) / 2, textY, { align: 'center' });

        if (prod.quantity) {
          const qtyText = prod.unit ? `${prod.quantity} ${prod.unit}` : String(prod.quantity);
          pdf.text(qtyText, (colX.hsn + colX.qty) / 2, textY, { align: 'center' });
        }

        if (isMonetary) {
          if (prod.rate !== undefined && prod.rate !== '') {
            pdf.text(parseFloat(prod.rate).toFixed(2), colX.rate - 2, textY, { align: 'right' });
          }
          if (prod.amount !== undefined && prod.amount !== '') {
            pdf.text(parseFloat(prod.amount).toFixed(2), 198, textY, { align: 'right' });
          }
        } else {
          if (prod.remarks) {
            pdf.text(prod.remarks.substring(0, 25), colX.qty + 3, textY);
          }
        }
      }

      if (i < rowsThisPage - 1 || isLastPage) {
        pdf.line(tableX, currentY + rowH, tableX + tableW, currentY + rowH);
      }
      currentProdIdx++;
    }

    if (isLastPage) {
      // Total Row
      const totalRowY = tableY + currentTableH - 8;
      pdf.setFillColor(245, 247, 250);
      pdf.rect(tableX + 0.1, totalRowY + 0.1, tableW - 0.2, 7.8, 'F');
      pdf.line(tableX, totalRowY, tableX + tableW, totalRowY);
      
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text("TOTAL", colX.sno + 3, totalRowY + 5.2);
      
      const realProducts = challan.products || [];
      const totalQty = realProducts.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0);
      pdf.text(String(totalQty), (colX.hsn + colX.qty) / 2, totalRowY + 5.2, { align: 'center' });
      
      if (isMonetary) {
        const totalAmount = realProducts.reduce((sum, p) => sum + ((parseFloat(p.quantity) || 0) * (parseFloat(p.rate) || 0)), 0);
        pdf.text(formatPdfCurrency(totalAmount), 198, totalRowY + 5.2, { align: 'right' });
      } else {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(7.5);
        pdf.text("Goods received in good condition", colX.qty + 3, totalRowY + 5.2);
      }

      // Weight Summary (if enabled or present)
      let bottomY = tableY + currentTableH + 3.5;

      const hasWeights = (challan.weights?.enabled || challan.weights?.totalGrossWeight || challan.totalGrossWeight || challan.weights?.grossWeight || challan.weights?.actual) && settings.showWeights !== false;
      if (hasWeights) {
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(203, 213, 225);
        pdf.roundedRect(10, bottomY, 190, 6, 1, 1, 'FD');
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.2);
        pdf.setTextColor(30, 41, 59);
        const w = challan.weights || {};
        const wtUnit = w.weightUnit || challan.weightUnit || 'Kg';
        const pkgs = challan.totalPackages || w.numberOfPackages || w.totalPackages || (challan.products || []).reduce((s, p) => s + (parseInt(p.quantity) || 0), 0) || '-';
        const pkgType = challan.packagingType || w.packageType || 'Packages';
        const grossVal = w.totalGrossWeight !== undefined ? w.totalGrossWeight : (w.grossWeight !== undefined ? w.grossWeight : (challan.totalGrossWeight || '-'));
        const tareVal = w.totalPackagingWeight !== undefined ? w.totalPackagingWeight : (w.tareWeight !== undefined ? w.tareWeight : '0');
        const netVal = w.totalNetWeight !== undefined ? w.totalNetWeight : (w.netWeight !== undefined ? w.netWeight : (challan.totalNetWeight || '-'));
        const wbSlip = (w.actual?.weighbridgeReceiptNo || w.actual?.receiptNumber) ? `   |   WB SLIP: #${w.actual.weighbridgeReceiptNo || w.actual.receiptNumber}` : '';

        pdf.text(`PACKAGES: ${pkgs} ${pkgType}   |   GROSS WT: ${grossVal} ${wtUnit}   |   TARE WT: ${tareVal} ${wtUnit}   |   NET WT: ${netVal} ${wtUnit}${wbSlip}`, 13, bottomY + 4.2);
        bottomY += 8.5;
      }

      // Remarks / Instructions Box
      const combinedNotes = [challan.remarks, challan.transport?.deliveryInstructions].filter(Boolean).join(' | ');
      const remarksText = combinedNotes || 'Goods delivered under Rule 55 of CGST Rules 2017 for transportation without sale.';
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      const remarksLines = pdf.splitTextToSize(remarksText, 184);
      const displayedRemarks = remarksLines.slice(0, 3);
      const remarksBoxH = Math.max(12, 5.5 + (displayedRemarks.length * 3.4));

      pdf.setDrawColor(203, 213, 225);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(10, bottomY, 190, remarksBoxH, 1.5, 1.5, 'FD');
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);
      pdf.text("REMARKS / INSTRUCTIONS:", 13, bottomY + 4);
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(30, 41, 59);
      displayedRemarks.forEach((line, lineIdx) => {
        pdf.text(line, 13, bottomY + 8 + (lineIdx * 3.4));
      });

      bottomY += remarksBoxH + 4;

      // Terms & Conditions
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text("TERMS & CONDITIONS:", 10, bottomY);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.2);
      pdf.setTextColor(100, 116, 139);
      const customTerms = settings.termsAndConditions || "1. Goods transported under Rule 55 of CGST Rules 2017 not for sale. 2. Dispatched in good order and condition.\n3. Any discrepancy must be reported immediately upon receipt. 4. Subject to local jurisdiction.";
      const termsLines = pdf.splitTextToSize(customTerms.replace(/\n/g, ' '), 186);
      pdf.text(termsLines.slice(0, 2), 10, bottomY + 3.2);

      bottomY += 10.5;

      // Signatures
      const sigY = Math.max(bottomY, 254);

      // Receiver Signature (Left)
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(30, 41, 59);
      pdf.text(settings.receiverLabel || "Receiver's Acknowledgment :", 10, sigY);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text(settings.receiverDeclaration || "Received goods in good order and condition", 10, sigY + 3.8);
      
      pdf.setLineWidth(0.2);
      pdf.setDrawColor(148, 163, 184);
      pdf.line(10, sigY + 16, 75, sigY + 16);
      
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(6.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text("(Receiver Name, Stamp & Signature)", 10, sigY + 19.5);

      // Authorised Signatory (Right)
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text("For", 200, sigY, { align: 'right' });
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(211, 47, 47);
      pdf.text(details.companyName || '', 200, sigY + 4, { align: 'right' });

      pdf.line(135, sigY + 16, 200, sigY + 16);
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(30, 41, 59);
      pdf.text(settings.signatoryLabel || "Authorised Signatory", 200, sigY + 19.5, { align: 'right' });
    }

    // Dynamic Footer Banner
    const bannerY = 288;
    pdf.setFillColor(15, 23, 42);
    pdf.roundedRect(10, bannerY, 190, 6.5, 1.5, 1.5, 'F');
    
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    const taglineText = (details.footerTagline || "Thank You For Your Business").toUpperCase();
    pdf.text(taglineText, 105, bannerY + 4.4, { align: 'center' });

    // Watermark
    if (challan.status === 'Cancelled') {
      pdf.saveState();
      pdf.setDrawColor(239, 68, 68);
      pdf.setTextColor(239, 68, 68);
      pdf.setLineWidth(2.5);
      pdf.rotate(-15, 105, 148.5);
      pdf.roundedRect(65, 137, 80, 22, 3, 3, 'S');
      pdf.setLineWidth(0.8);
      pdf.roundedRect(66.5, 138.5, 77, 19, 2, 2, 'S');
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(28);
      pdf.text("CANCELLED", 105, 151, { align: 'center' });
      pdf.restoreState();
    } else if (challan.status === 'Draft') {
      pdf.saveState();
      pdf.setDrawColor(217, 119, 6);
      pdf.setTextColor(217, 119, 6);
      pdf.setLineWidth(1.8);
      pdf.rotate(-15, 105, 148.5);
      pdf.roundedRect(70, 137, 70, 20, 3, 3, 'S');
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(24);
      pdf.text("DRAFT", 105, 150.5, { align: 'center' });
      pdf.restoreState();
    }
  }
};

// ============================================================================
// 2. A5 FORMAT RENDERER (148mm x 210mm)
// ============================================================================
const renderA5Pages = (pdf, challan, details, logoBase64, copyType, settings = {}, isFirstDocInPdf = true) => {
  const isMonetary = challan.isMonetary !== false && settings.showRates !== false;
  const tableX = 6;
  const tableW = 136;
  
  let colX;
  if (isMonetary) {
    colX = { sno: 14, products: 72, hsn: 88, qty: 104, rate: 120 };
  } else {
    colX = { sno: 14, products: 86, hsn: 102, qty: 120 };
  }

  const ROWS_PER_PAGE = 9;
  const rowH = 6.2;

  const allProducts = [...(challan.products || [])];
  while (allProducts.length < ROWS_PER_PAGE || allProducts.length % ROWS_PER_PAGE !== 0) {
    allProducts.push({ name: '', quantity: '', rate: '', amount: '', unit: '', hsn: '', sku: '' });
  }

  const totalPages = Math.ceil(allProducts.length / ROWS_PER_PAGE);
  let currentProdIdx = 0;

  const customerName = challan.customerDetails?.name || (typeof challan.customer === 'string' ? challan.customer.split('\n')[0] : '') || '';
  const customerBilling = challan.customerDetails?.billingAddress || (typeof challan.customer === 'string' ? challan.customer.split('\n').slice(1).join('\n') : '') || '';
  const docTitle = (settings.documentTitle || challan.challanType || 'DELIVERY CHALLAN').toUpperCase();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (!isFirstDocInPdf || pageNum > 1) {
      pdf.addPage('a5', 'portrait');
    }

    pdf.setLineWidth(0.2);
    pdf.setDrawColor(30, 41, 59);

    if (copyType) {
      pdf.setFillColor(241, 245, 249);
      pdf.rect(6, 4, 136, 4, 'F');
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(copyType, 74, 7, { align: 'center' });
    }

    const headerTop = copyType ? 9 : 8;

    // Company Header A5
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(211, 47, 47);
    pdf.text(details.companyName || "COMPANY NAME", 142, headerTop + 3, { align: 'right' });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(30, 41, 59);
    const addr = pdf.splitTextToSize(details.address || '', 85);
    pdf.text(addr.slice(0, 2), 142, headerTop + 7, { align: 'right' });
    if (details.gstNumber) {
      pdf.text(`GSTIN: ${details.gstNumber}`, 142, headerTop + 13, { align: 'right' });
    }

    // Title
    const titleY = headerTop + 16;
    pdf.roundedRect(48, titleY, 52, 5, 2, 2, 'S');
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text(docTitle, 74, titleY + 3.5, { align: 'center' });
    pdf.setFontSize(6.5);
    pdf.text(`Page ${pageNum}/${totalPages}`, 142, titleY + 3.5, { align: 'right' });

    // Boxes
    const boxY = titleY + 7;
    const boxH = 22;
    pdf.roundedRect(6, boxY, 66, boxH, 1, 1, 'S');
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text("CONSIGNEE (TO):", 8, boxY + 4);
    pdf.setFontSize(7.5);
    pdf.text(customerName.substring(0, 34), 8, boxY + 8);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    const cLines = pdf.splitTextToSize(customerBilling.replace(/\n/g, ', '), 62);
    pdf.text(cLines.slice(0, 2), 8, boxY + 12);

    // Meta box
    pdf.roundedRect(76, boxY, 66, boxH, 1, 1, 'S');
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.text(`DC No: ${challan.challanNumber || ''}`, 78, boxY + 5);
    pdf.text(`Date: ${formatDate(challan.date)}`, 78, boxY + 9);
    if (challan.vehicleNumber) {
      pdf.text(`Vehicle: ${challan.vehicleNumber}`, 78, boxY + 13);
    }
    if (challan.purchaseOrderNumber) {
      pdf.text(`PO No: ${challan.purchaseOrderNumber}`, 78, boxY + 17);
    }

    // Table
    const tableY = boxY + boxH + 3;
    const isLastPage = (pageNum === totalPages);
    const currentTableH = 6 + (ROWS_PER_PAGE * rowH) + (isLastPage ? 7 : 0);

    pdf.rect(tableX, tableY, tableW, currentTableH, 'S');
    pdf.line(colX.sno, tableY, colX.sno, tableY + currentTableH);
    pdf.line(colX.products, tableY, colX.products, tableY + currentTableH);
    pdf.line(colX.hsn, tableY, colX.hsn, tableY + currentTableH);
    pdf.line(colX.qty, tableY, colX.qty, tableY + currentTableH);
    if (isMonetary) pdf.line(colX.rate, tableY, colX.rate, tableY + currentTableH);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.8);
    pdf.text("S.No", (tableX + colX.sno) / 2, tableY + 4.2, { align: 'center' });
    pdf.text("ITEMS", colX.sno + 2, tableY + 4.2);
    pdf.text("HSN", (colX.products + colX.hsn) / 2, tableY + 4.2, { align: 'center' });
    pdf.text("QTY", (colX.hsn + colX.qty) / 2, tableY + 4.2, { align: 'center' });
    if (isMonetary) {
      pdf.text("RATE", (colX.qty + colX.rate) / 2, tableY + 4.2, { align: 'center' });
      pdf.text("AMOUNT", (colX.rate + 142) / 2, tableY + 4.2, { align: 'center' });
    }
    pdf.line(tableX, tableY + 6, tableX + tableW, tableY + 6);

    const startRowY = tableY + 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.8);

    for (let i = 0; i < ROWS_PER_PAGE; i++) {
      const prod = allProducts[currentProdIdx];
      const curY = startRowY + i * rowH;
      const textY = curY + 4.2;

      if (prod.name) {
        pdf.text(String(currentProdIdx + 1), (tableX + colX.sno) / 2, textY, { align: 'center' });
        pdf.text(prod.name.substring(0, 30), colX.sno + 2, textY);
        pdf.text(prod.hsn || '-', (colX.products + colX.hsn) / 2, textY, { align: 'center' });
        pdf.text(`${prod.quantity || ''} ${prod.unit || ''}`, (colX.hsn + colX.qty) / 2, textY, { align: 'center' });
        if (isMonetary) {
          if (prod.rate) pdf.text(parseFloat(prod.rate).toFixed(2), colX.rate - 1, textY, { align: 'right' });
          if (prod.amount) pdf.text(parseFloat(prod.amount).toFixed(2), 140, textY, { align: 'right' });
        }
      }

      if (i < ROWS_PER_PAGE - 1 || isLastPage) {
        pdf.line(tableX, curY + rowH, tableX + tableW, curY + rowH);
      }
      currentProdIdx++;
    }

    if (isLastPage) {
      const totalRowY = tableY + currentTableH - 7;
      pdf.setFillColor(245, 247, 250);
      pdf.rect(tableX + 0.1, totalRowY + 0.1, tableW - 0.2, 6.8, 'F');
      pdf.line(tableX, totalRowY, tableX + tableW, totalRowY);
      pdf.setFont("helvetica", "bold");
      pdf.text("TOTAL", colX.sno + 2, totalRowY + 4.5);
      const realProducts = challan.products || [];
      const totalQty = realProducts.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0), 0);
      pdf.text(String(totalQty), (colX.hsn + colX.qty) / 2, totalRowY + 4.5, { align: 'center' });
      if (isMonetary) {
        const totalAmount = realProducts.reduce((sum, p) => sum + ((parseFloat(p.quantity) || 0) * (parseFloat(p.rate) || 0)), 0);
        pdf.text(formatPdfCurrency(totalAmount), 140, totalRowY + 4.5, { align: 'right' });
      }

      // Remarks & Signatures A5
      const botY = tableY + currentTableH + 3;
      pdf.roundedRect(6, botY, 136, 8, 1, 1, 'S');
      pdf.setFontSize(6);
      pdf.text(`Remarks: ${challan.remarks || 'Goods delivered under Rule 55'}`, 8, botY + 4.5);

      const sigY = botY + 11;
      pdf.text("Receiver Signature:", 6, sigY);
      pdf.line(6, sigY + 9, 45, sigY + 9);

      pdf.text("For " + (details.companyName || ''), 142, sigY, { align: 'right' });
      pdf.line(100, sigY + 9, 142, sigY + 9);
      pdf.text("Authorised Signatory", 142, sigY + 12, { align: 'right' });
    }

    // A5 Banner
    pdf.setFillColor(15, 23, 42);
    pdf.rect(6, 203, 136, 4.5, 'F');
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text((details.footerTagline || "Thank You For Your Business").toUpperCase(), 74, 206.2, { align: 'center' });
  }
};

// ============================================================================
// 3. THERMAL RECEIPT RENDERER (80mm & 58mm)
// ============================================================================
const renderThermalReceipt = (pdf, challan, details, widthMm = 80) => {
  const margin = 4;
  const contentW = widthMm - (margin * 2);
  const centerX = widthMm / 2;

  pdf.setFont("courier", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);

  let curY = 6;
  pdf.text(details.companyName || "NAYARUVI", centerX, curY, { align: 'center' });
  curY += 4;

  pdf.setFontSize(7);
  pdf.setFont("courier", "normal");
  if (details.address) {
    const lines = pdf.splitTextToSize(details.address.replace(/\n/g, ', '), contentW);
    pdf.text(lines.slice(0, 2), centerX, curY, { align: 'center' });
    curY += (lines.slice(0, 2).length * 3);
  }
  if (details.gstNumber) {
    pdf.text(`GST: ${details.gstNumber}`, centerX, curY, { align: 'center' });
    curY += 3;
  }
  if (details.mobileNumber) {
    pdf.text(`Ph: ${details.mobileNumber}`, centerX, curY, { align: 'center' });
    curY += 3;
  }

  // Divider
  curY += 1;
  pdf.text("-".repeat(widthMm > 60 ? 42 : 30), centerX, curY, { align: 'center' });
  curY += 3.5;

  // Title
  pdf.setFont("courier", "bold");
  pdf.setFontSize(8.5);
  pdf.text((challan.challanType || "DELIVERY CHALLAN").toUpperCase(), centerX, curY, { align: 'center' });
  curY += 4;

  pdf.setFont("courier", "normal");
  pdf.setFontSize(7);
  pdf.text(`DC No : ${challan.challanNumber || ''}`, margin, curY);
  curY += 3;
  pdf.text(`Date  : ${formatDate(challan.date)}`, margin, curY);
  curY += 3;
  
  if (challan.vehicleNumber) {
    pdf.text(`Veh No: ${challan.vehicleNumber}`, margin, curY);
    curY += 3;
  }

  const custName = challan.customerDetails?.name || (typeof challan.customer === 'string' ? challan.customer.split('\n')[0] : '');
  if (custName) {
    pdf.text(`To    : ${custName.substring(0, widthMm > 60 ? 30 : 20)}`, margin, curY);
    curY += 3;
  }

  // Divider
  pdf.text("-".repeat(widthMm > 60 ? 42 : 30), centerX, curY, { align: 'center' });
  curY += 3.5;

  // Items Header
  pdf.setFont("courier", "bold");
  if (widthMm > 60) {
    pdf.text("ITEM", margin, curY);
    pdf.text("QTY", margin + 38, curY);
    pdf.text("AMOUNT", widthMm - margin, curY, { align: 'right' });
  } else {
    pdf.text("ITEM", margin, curY);
    pdf.text("QTY", widthMm - margin, curY, { align: 'right' });
  }
  curY += 2;
  pdf.text("-".repeat(widthMm > 60 ? 42 : 30), centerX, curY, { align: 'center' });
  curY += 3;

  // Rows
  pdf.setFont("courier", "normal");
  let totalQty = 0;
  let totalAmount = 0;

  (challan.products || []).forEach((p, idx) => {
    if (!p.name) return;
    const q = parseFloat(p.quantity) || 0;
    const amt = parseFloat(p.amount) || (q * (parseFloat(p.rate) || 0));
    totalQty += q;
    totalAmount += amt;

    const itemName = `${idx + 1}. ${p.name}`.substring(0, widthMm > 60 ? 22 : 16);
    pdf.text(itemName, margin, curY);

    if (widthMm > 60) {
      pdf.text(`${q} ${p.unit || ''}`, margin + 38, curY);
      if (challan.isMonetary !== false) {
        pdf.text(amt.toFixed(2), widthMm - margin, curY, { align: 'right' });
      }
    } else {
      pdf.text(`${q} ${p.unit || ''}`, widthMm - margin, curY, { align: 'right' });
    }
    curY += 3.5;
  });

  // Total
  curY += 1;
  pdf.text("-".repeat(widthMm > 60 ? 42 : 30), centerX, curY, { align: 'center' });
  curY += 3.5;
  pdf.setFont("courier", "bold");
  pdf.text("TOTAL ITEMS:", margin, curY);
  pdf.text(String(totalQty), widthMm - margin, curY, { align: 'right' });
  curY += 3.5;

  if (challan.isMonetary !== false && totalAmount > 0) {
    pdf.text("TOTAL VALUE:", margin, curY);
    pdf.text(formatPdfCurrency(totalAmount), widthMm - margin, curY, { align: 'right' });
    curY += 3.5;
  }

  // Footer notes
  curY += 2;
  pdf.setFont("courier", "normal");
  pdf.setFontSize(6.5);
  pdf.text("Received in good condition", centerX, curY, { align: 'center' });
  curY += 6;

  pdf.text("Receiver Signature      Authorised Signatory", centerX, curY, { align: 'center' });
  curY += 6;
  pdf.text(details.footerTagline || "Thank You For Your Business", centerX, curY, { align: 'center' });
};

// ============================================================================
// MAIN PDF GENERATOR ENGINE
// ============================================================================

/**
 * Builds a jsPDF document instance with full support for A4, A5, Thermal, and Multi-Copy.
 */
export const buildChallanPdf = async (challan, companyDetails, options = {}) => {
  if (!challan) throw new Error("Challan data missing");

  const paperSize = options.paperSize || options.documentSettings?.defaultPaperSize || 'a4';
  const settings = options.documentSettings || {};

  const COPY_LABELS_MAP = {
    original: 'ORIGINAL FOR RECIPIENT',
    duplicate: 'DUPLICATE FOR TRANSPORTER',
    triplicate: 'TRIPLICATE FOR SUPPLIER',
    extra: 'EXTRA COPY'
  };

  let selectedCopies;
  if (options.copies && Array.isArray(options.copies) && options.copies.length > 0) {
    selectedCopies = options.copies;
  } else if (options.copyType === 'all') {
    selectedCopies = ['ORIGINAL FOR RECIPIENT', 'DUPLICATE FOR TRANSPORTER', 'TRIPLICATE FOR SUPPLIER'];
  } else if (options.copyType) {
    selectedCopies = [COPY_LABELS_MAP[options.copyType] || options.copyType];
  } else {
    selectedCopies = ['ORIGINAL FOR RECIPIENT'];
  }

  const details = companyDetails || {
    companyName: "DELIVERY CHALLAN",
    address: "Registered Business Address",
    gstNumber: "",
    mobileNumber: "",
    phoneNumber: "",
    footerTagline: "Thank you for your business"
  };

  let logoBase64 = null;
  if (details.logoUrl) {
    logoBase64 = await getBase64ImageFromUrl(details.logoUrl);
  }

  let pdf;
  if (paperSize === 'a5') {
    pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  } else if (paperSize === 'thermal80') {
    const estHeight = Math.max(120, 60 + ((challan.products?.length || 1) * 6));
    pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, estHeight] });
  } else if (paperSize === 'thermal58') {
    const estHeight = Math.max(120, 60 + ((challan.products?.length || 1) * 6));
    pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [58, estHeight] });
  } else {
    // Default A4
    pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  }

  let isFirstDoc = true;

  if (paperSize === 'thermal80' || paperSize === 'thermal58') {
    renderThermalReceipt(pdf, challan, details, paperSize === 'thermal58' ? 58 : 80);
  } else if (paperSize === 'a5') {
    for (const copy of selectedCopies) {
      renderA5Pages(pdf, challan, details, logoBase64, copy, settings, isFirstDoc);
      isFirstDoc = false;
    }
  } else {
    // A4
    for (const copy of selectedCopies) {
      renderA4Pages(pdf, challan, details, logoBase64, copy, settings, isFirstDoc);
      isFirstDoc = false;
    }
  }

  return pdf;
};

/**
 * Downloads a single Challan PDF
 */
export const downloadChallanPDF = async (challan, companyDetails, options = {}) => {
  const pdf = await buildChallanPdf(challan, companyDetails, options);
  const fileName = options.fileName || getChallanPdfFileName(challan);
  pdf.save(fileName);
  return Promise.resolve(fileName);
};

/**
 * Generates and returns a raw Blob of the Challan PDF
 */
export const generateChallanPdfBlob = async (challan, companyDetails, options = {}) => {
  const pdf = await buildChallanPdf(challan, companyDetails, options);
  return pdf.output('blob');
};

/**
 * Combines multiple challans into a single combined PDF document
 */
export const downloadCombinedChallansPDF = async (challansList, companyDetails, options = {}) => {
  if (!challansList || challansList.length === 0) {
    throw new Error("No challans selected for combined PDF export");
  }

  const paperSize = options.paperSize || 'a4';
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: paperSize === 'a5' ? 'a5' : 'a4'
  });

  const details = companyDetails || { companyName: "DELIVERY CHALLAN" };
  let logoBase64 = null;
  if (details.logoUrl) {
    logoBase64 = await getBase64ImageFromUrl(details.logoUrl);
  }

  let isFirstDocInPdf = true;

  for (const challan of challansList) {
    if (paperSize === 'a5') {
      renderA5Pages(pdf, challan, details, logoBase64, '', options.documentSettings || {}, isFirstDocInPdf);
    } else {
      renderA4Pages(pdf, challan, details, logoBase64, '', options.documentSettings || {}, isFirstDocInPdf);
    }
    isFirstDocInPdf = false;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `Nayaruvi-Challans-Combined-${todayStr}.pdf`;
  pdf.save(fileName);
  return Promise.resolve(fileName);
};

/**
 * Exports multiple challans bundled into a ZIP archive containing individual PDFs
 */
export const exportChallansToZip = async (challansList, companyDetails, options = {}, onProgress = null) => {
  if (!challansList || challansList.length === 0) {
    throw new Error("No challans selected for ZIP export");
  }

  const zip = new JSZip();
  const folder = zip.folder("Delivery_Challans");

  const total = challansList.length;
  for (let i = 0; i < total; i++) {
    const ch = challansList[i];
    if (onProgress) onProgress(i + 1, total, ch.challanNumber);
    const blob = await generateChallanPdfBlob(ch, companyDetails, options);
    const fileName = getChallanPdfFileName(ch);
    folder.file(fileName, blob);
  }

  const content = await zip.generateAsync({ type: "blob" });
  const todayStr = new Date().toISOString().split('T')[0];
  const zipName = `Nayaruvi-Delivery-Challans-${todayStr}.zip`;

  // Trigger download
  const link = document.createElement("a");
  link.href = URL.createObjectURL(content);
  link.download = zipName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return Promise.resolve(zipName);
};
