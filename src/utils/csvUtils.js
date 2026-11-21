/**
 * CSV Import & Export Utilities for Customers and Products
 * Includes formula-injection protection, Indian language UTF-8 BOM encoding,
 * row-level validation, and template generators.
 */

import { validateGstin } from './indianBusiness.js';

/**
 * Escapes CSV field value and protects against spreadsheet formula injection
 * (cells beginning with =, +, -, @, \t, \r)
 */
export const sanitizeCsvCell = (val) => {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();

  // Formula injection defense
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Double quotes escaping
  return `"${str.replace(/"/g, '""')}"`;
};

/**
 * Parses raw CSV text into array of rows and columns, handling multiline quoted cells
 */
export const parseRawCsv = (csvText) => {
  if (!csvText) return [];
  const cleanText = csvText.replace(/^\uFEFF/, '').trim(); // Remove UTF-8 BOM if present
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip next escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n of CRLF
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
};

// ============================================================================
// CUSTOMER CSV EXPORT & TEMPLATE
// ============================================================================

export const CUSTOMER_CSV_HEADERS = [
  'Customer Code',
  'Customer Name',
  'Company Name',
  'Customer Type',
  'Contact Person',
  'Phone Number',
  'Email Address',
  'GSTIN',
  'PAN',
  'Billing Address',
  'Billing City',
  'Billing State',
  'Billing PIN Code',
  'Delivery Address',
  'Delivery City',
  'Delivery State',
  'Delivery PIN Code',
  'Payment Terms',
  'Notes',
  'Status'
];

export const exportCustomersToCsv = (customersList) => {
  const headerRow = CUSTOMER_CSV_HEADERS.map(sanitizeCsvCell).join(',');
  const dataRows = (customersList || []).map(c => [
    sanitizeCsvCell(c.customerCode || ''),
    sanitizeCsvCell(c.name || ''),
    sanitizeCsvCell(c.companyName || ''),
    sanitizeCsvCell(c.customerType || 'Business'),
    sanitizeCsvCell(c.contactPerson || ''),
    sanitizeCsvCell(c.phone || ''),
    sanitizeCsvCell(c.email || ''),
    sanitizeCsvCell(c.gstin || ''),
    sanitizeCsvCell(c.pan || ''),
    sanitizeCsvCell(c.billingAddress || ''),
    sanitizeCsvCell(c.billingCity || ''),
    sanitizeCsvCell(c.billingState || ''),
    sanitizeCsvCell(c.billingPinCode || ''),
    sanitizeCsvCell(c.deliveryAddress || ''),
    sanitizeCsvCell(c.deliveryCity || ''),
    sanitizeCsvCell(c.deliveryState || ''),
    sanitizeCsvCell(c.deliveryPinCode || ''),
    sanitizeCsvCell(c.paymentTerms || ''),
    sanitizeCsvCell(c.notes || ''),
    sanitizeCsvCell(c.status || 'Active')
  ].join(','));

  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  return csvContent;
};

export const generateCustomerCsvTemplate = () => {
  const headerRow = CUSTOMER_CSV_HEADERS.map(sanitizeCsvCell).join(',');
  const sample1 = [
    sanitizeCsvCell('CUS-0001'),
    sanitizeCsvCell('Larsen & Toubro Ltd'),
    sanitizeCsvCell('L&T Heavy Engineering Division'),
    sanitizeCsvCell('Business'),
    sanitizeCsvCell('Mr. R. Sharma'),
    sanitizeCsvCell('9876543210'),
    sanitizeCsvCell('purchase@lnt.com'),
    sanitizeCsvCell('27AAACL1234H1Z1'),
    sanitizeCsvCell('AAACL1234H'),
    sanitizeCsvCell('Gate No. 3, Powai Campus, Saki Vihar Road'),
    sanitizeCsvCell('Mumbai'),
    sanitizeCsvCell('Maharashtra'),
    sanitizeCsvCell('400072'),
    sanitizeCsvCell('Powai Works Bay 2'),
    sanitizeCsvCell('Mumbai'),
    sanitizeCsvCell('Maharashtra'),
    sanitizeCsvCell('400072'),
    sanitizeCsvCell('Net 30 Days'),
    sanitizeCsvCell('Priority customer for control panels'),
    sanitizeCsvCell('Active')
  ].join(',');

  const sample2 = [
    sanitizeCsvCell('CUS-0002'),
    sanitizeCsvCell('Karthik Electricals'),
    sanitizeCsvCell(''),
    sanitizeCsvCell('Individual'),
    sanitizeCsvCell('Karthik S'),
    sanitizeCsvCell('9443312345'),
    sanitizeCsvCell('karthik@gmail.com'),
    sanitizeCsvCell(''),
    sanitizeCsvCell(''),
    sanitizeCsvCell('14, Cross Cut Road, Gandhipuram'),
    sanitizeCsvCell('Coimbatore'),
    sanitizeCsvCell('Tamil Nadu'),
    sanitizeCsvCell('641012'),
    sanitizeCsvCell('14, Cross Cut Road, Gandhipuram'),
    sanitizeCsvCell('Coimbatore'),
    sanitizeCsvCell('Tamil Nadu'),
    sanitizeCsvCell('641012'),
    sanitizeCsvCell('Immediate'),
    sanitizeCsvCell('Direct retail contractor'),
    sanitizeCsvCell('Active')
  ].join(',');

  return '\uFEFF' + [headerRow, sample1, sample2].join('\r\n');
};

/**
 * Validates and parses imported Customer CSV
 */
export const parseCustomerCsv = (csvText, existingCustomers = []) => {
  const parsedRows = parseRawCsv(csvText);
  if (parsedRows.length <= 1) {
    return {
      validRows: [],
      errorRows: [{ rowNumber: 1, reason: "The uploaded CSV file is empty or contains only headers." }],
      summary: { total: 0, valid: 0, failed: 1 }
    };
  }

  const rawHeaders = parsedRows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const getColIndex = (keywords) => {
    return rawHeaders.findIndex(h => keywords.some(k => h.includes(k)));
  };

  const nameIdx = getColIndex(['customername', 'name']);
  const codeIdx = getColIndex(['customercode', 'code']);
  const compIdx = getColIndex(['companyname', 'company', 'businessname']);
  const typeIdx = getColIndex(['customertype', 'type']);
  const contactIdx = getColIndex(['contactperson', 'contact']);
  const phoneIdx = getColIndex(['phonenumber', 'phone', 'mobile']);
  const emailIdx = getColIndex(['emailaddress', 'email']);
  const gstinIdx = getColIndex(['gstin', 'gst']);
  const panIdx = getColIndex(['pan']);
  const billAddrIdx = getColIndex(['billingaddress', 'address']);
  const billCityIdx = getColIndex(['billingcity', 'city']);
  const billStateIdx = getColIndex(['billingstate', 'state']);
  const billPinIdx = getColIndex(['billingpincode', 'pincode', 'pin']);
  const delivAddrIdx = getColIndex(['deliveryaddress']);
  const delivCityIdx = getColIndex(['deliverycity']);
  const delivStateIdx = getColIndex(['deliverystate']);
  const delivPinIdx = getColIndex(['deliverypincode']);
  const termsIdx = getColIndex(['paymentterms', 'terms']);
  const notesIdx = getColIndex(['notes', 'remarks']);
  const statusIdx = getColIndex(['status']);

  if (nameIdx === -1) {
    return {
      validRows: [],
      errorRows: [{ rowNumber: 1, reason: "Required column 'Customer Name' was not found in the CSV header." }],
      summary: { total: parsedRows.length - 1, valid: 0, failed: parsedRows.length - 1 }
    };
  }

  const validRows = [];
  const errorRows = [];
  const seenCodes = new Set(existingCustomers.map(c => (c.customerCode || '').toLowerCase().trim()).filter(Boolean));
  const seenNames = new Set(existingCustomers.map(c => (c.name || '').toLowerCase().trim()).filter(Boolean));

  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    const rowNumber = i + 1;

    const rawName = nameIdx !== -1 ? (row[nameIdx] || '').trim() : '';
    if (!rawName) {
      errorRows.push({ rowNumber, name: '(Empty)', reason: "Customer Name is required." });
      continue;
    }

    const rawCode = codeIdx !== -1 ? (row[codeIdx] || '').trim() : '';
    if (rawCode && seenCodes.has(rawCode.toLowerCase())) {
      errorRows.push({ rowNumber, name: rawName, reason: `Customer code '${rawCode}' is already taken.` });
      continue;
    }

    const rawGstin = gstinIdx !== -1 ? (row[gstinIdx] || '').trim().toUpperCase() : '';
    if (rawGstin) {
      const gstinValidation = validateGstin(rawGstin);
      if (!gstinValidation.isValid) {
        errorRows.push({ rowNumber, name: rawName, reason: `Invalid GSTIN format: ${rawGstin}` });
        continue;
      }
    }

    if (rawCode) seenCodes.add(rawCode.toLowerCase());
    seenNames.add(rawName.toLowerCase());

    const billingAddress = billAddrIdx !== -1 ? (row[billAddrIdx] || '').trim() : '';
    const deliveryAddress = delivAddrIdx !== -1 ? (row[delivAddrIdx] || '').trim() : '';

    validRows.push({
      customerCode: rawCode,
      name: rawName,
      companyName: compIdx !== -1 ? (row[compIdx] || '').trim() : '',
      customerType: typeIdx !== -1 ? (row[typeIdx] || 'Business').trim() : 'Business',
      contactPerson: contactIdx !== -1 ? (row[contactIdx] || '').trim() : '',
      phone: phoneIdx !== -1 ? (row[phoneIdx] || '').trim() : '',
      email: emailIdx !== -1 ? (row[emailIdx] || '').trim() : '',
      gstin: rawGstin,
      pan: panIdx !== -1 ? (row[panIdx] || '').trim().toUpperCase() : '',
      billingAddress,
      billingCity: billCityIdx !== -1 ? (row[billCityIdx] || '').trim() : '',
      billingState: billStateIdx !== -1 ? (row[billStateIdx] || '').trim() : '',
      billingPinCode: billPinIdx !== -1 ? (row[billPinIdx] || '').trim() : '',
      deliveryAddress: deliveryAddress || billingAddress,
      deliveryCity: delivCityIdx !== -1 ? (row[delivCityIdx] || '').trim() : '',
      deliveryState: delivStateIdx !== -1 ? (row[delivStateIdx] || '').trim() : '',
      deliveryPinCode: delivPinIdx !== -1 ? (row[delivPinIdx] || '').trim() : '',
      sameAsBilling: !deliveryAddress || deliveryAddress === billingAddress,
      paymentTerms: termsIdx !== -1 ? (row[termsIdx] || '').trim() : '',
      notes: notesIdx !== -1 ? (row[notesIdx] || '').trim() : '',
      status: statusIdx !== -1 ? (row[statusIdx] || 'Active').trim() : 'Active'
    });
  }

  return {
    validRows,
    errorRows,
    summary: {
      total: parsedRows.length - 1,
      valid: validRows.length,
      failed: errorRows.length
    }
  };
};

// ============================================================================
// PRODUCT CSV EXPORT & TEMPLATE
// ============================================================================

export const PRODUCT_CSV_HEADERS = [
  'Product Code',
  'SKU',
  'Product Name',
  'Category',
  'Product Type',
  'Default Unit',
  'Default Rate',
  'HSN/SAC Code',
  'GST Tax Rate %',
  'Unit Weight',
  'Weight Unit',
  'Description',
  'Brand',
  'Model Number',
  'Barcode',
  'Returnable',
  'Status'
];

export const exportProductsToCsv = (productsList) => {
  const headerRow = PRODUCT_CSV_HEADERS.map(sanitizeCsvCell).join(',');
  const dataRows = (productsList || []).map(p => [
    sanitizeCsvCell(p.productCode || ''),
    sanitizeCsvCell(p.sku || ''),
    sanitizeCsvCell(p.name || ''),
    sanitizeCsvCell(p.category || 'General'),
    sanitizeCsvCell(p.productType || 'Goods'),
    sanitizeCsvCell(p.unit || 'NOS'),
    sanitizeCsvCell(p.rate !== undefined && p.rate !== null ? p.rate : ''),
    sanitizeCsvCell(p.hsn || ''),
    sanitizeCsvCell(p.taxRate !== undefined && p.taxRate !== null ? p.taxRate : 18),
    sanitizeCsvCell(p.unitWeight !== undefined && p.unitWeight !== null ? p.unitWeight : ''),
    sanitizeCsvCell(p.weightUnit || 'Kg'),
    sanitizeCsvCell(p.description || ''),
    sanitizeCsvCell(p.brand || ''),
    sanitizeCsvCell(p.modelNumber || ''),
    sanitizeCsvCell(p.barcode || ''),
    sanitizeCsvCell(p.isReturnable ? 'Yes' : 'No'),
    sanitizeCsvCell(p.status || 'Active')
  ].join(','));

  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  return csvContent;
};

export const generateProductCsvTemplate = () => {
  const headerRow = PRODUCT_CSV_HEADERS.map(sanitizeCsvCell).join(',');
  const sample1 = [
    sanitizeCsvCell('PRD-0001'),
    sanitizeCsvCell('CP-01'),
    sanitizeCsvCell('Main Power Distribution Panel 415V'),
    sanitizeCsvCell('Electrical'),
    sanitizeCsvCell('Goods'),
    sanitizeCsvCell('NOS'),
    sanitizeCsvCell('85000'),
    sanitizeCsvCell('8537'),
    sanitizeCsvCell('18'),
    sanitizeCsvCell('250'),
    sanitizeCsvCell('Kg'),
    sanitizeCsvCell('Floor-standing 3-phase modular panel with ACB'),
    sanitizeCsvCell('Siemens / L&T'),
    sanitizeCsvCell('MPD-415-800A'),
    sanitizeCsvCell('8901234567890'),
    sanitizeCsvCell('No'),
    sanitizeCsvCell('Active')
  ].join(',');

  const sample2 = [
    sanitizeCsvCell('PRD-0002'),
    sanitizeCsvCell('CAL-KIT-01'),
    sanitizeCsvCell('Precision Calibration Test Tool Kit'),
    sanitizeCsvCell('Machinery'),
    sanitizeCsvCell('Returnable item'),
    sanitizeCsvCell('SET'),
    sanitizeCsvCell('0'),
    sanitizeCsvCell('9031'),
    sanitizeCsvCell('0'),
    sanitizeCsvCell('8.5'),
    sanitizeCsvCell('Kg'),
    sanitizeCsvCell('Site commissioning calibration kit (Must be returned in 14 days)'),
    sanitizeCsvCell('Fluke'),
    sanitizeCsvCell('FLUKE-754'),
    sanitizeCsvCell(''),
    sanitizeCsvCell('Yes'),
    sanitizeCsvCell('Active')
  ].join(',');

  return '\uFEFF' + [headerRow, sample1, sample2].join('\r\n');
};

/**
 * Validates and parses imported Product CSV
 */
export const parseProductCsv = (csvText, existingProducts = []) => {
  const parsedRows = parseRawCsv(csvText);
  if (parsedRows.length <= 1) {
    return {
      validRows: [],
      errorRows: [{ rowNumber: 1, reason: "The uploaded CSV file is empty or contains only headers." }],
      summary: { total: 0, valid: 0, failed: 1 }
    };
  }

  const rawHeaders = parsedRows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const getColIndex = (keywords) => {
    return rawHeaders.findIndex(h => keywords.some(k => h.includes(k)));
  };

  const nameIdx = getColIndex(['productname', 'itemname', 'name']);
  const codeIdx = getColIndex(['productcode', 'code']);
  const skuIdx = getColIndex(['sku']);
  const catIdx = getColIndex(['category']);
  const typeIdx = getColIndex(['producttype', 'type']);
  const unitIdx = getColIndex(['defaultunit', 'unit', 'uom']);
  const rateIdx = getColIndex(['defaultrate', 'rate', 'price']);
  const hsnIdx = getColIndex(['hsnsaccode', 'hsn', 'sac']);
  const taxIdx = getColIndex(['gsttaxrate', 'taxrate', 'tax', 'gst']);
  const wtIdx = getColIndex(['unitweight', 'weight']);
  const wtUnitIdx = getColIndex(['weightunit']);
  const descIdx = getColIndex(['description']);
  const brandIdx = getColIndex(['brand']);
  const modelIdx = getColIndex(['modelnumber', 'model']);
  const barcodeIdx = getColIndex(['barcode']);
  const returnableIdx = getColIndex(['returnable', 'isreturnable']);
  const statusIdx = getColIndex(['status']);

  if (nameIdx === -1) {
    return {
      validRows: [],
      errorRows: [{ rowNumber: 1, reason: "Required column 'Product Name' was not found in the CSV header." }],
      summary: { total: parsedRows.length - 1, valid: 0, failed: parsedRows.length - 1 }
    };
  }

  const validRows = [];
  const errorRows = [];
  const seenCodes = new Set(existingProducts.map(p => (p.productCode || p.sku || '').toLowerCase().trim()).filter(Boolean));

  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    const rowNumber = i + 1;

    const rawName = nameIdx !== -1 ? (row[nameIdx] || '').trim() : '';
    if (!rawName) {
      errorRows.push({ rowNumber, name: '(Empty)', reason: "Product Name is required." });
      continue;
    }

    const rawCode = codeIdx !== -1 ? (row[codeIdx] || '').trim() : '';
    const rawSku = skuIdx !== -1 ? (row[skuIdx] || '').trim() : (rawCode || '');

    const effectiveCode = rawCode || rawSku;
    if (effectiveCode && seenCodes.has(effectiveCode.toLowerCase())) {
      errorRows.push({ rowNumber, name: rawName, reason: `Product code/SKU '${effectiveCode}' is already taken.` });
      continue;
    }

    if (effectiveCode) seenCodes.add(effectiveCode.toLowerCase());

    const rawRate = rateIdx !== -1 ? parseFloat((row[rateIdx] || '').replace(/[^0-9.]/g, '')) : 0;
    const rawTax = taxIdx !== -1 ? parseFloat((row[taxIdx] || '').replace(/[^0-9.]/g, '')) : 0;
    const rawWeight = wtIdx !== -1 ? parseFloat((row[wtIdx] || '').replace(/[^0-9.]/g, '')) : null;
    const rawReturnable = returnableIdx !== -1 ? (row[returnableIdx] || '').toLowerCase() : '';
    const isReturnable = rawReturnable.includes('yes') || rawReturnable.includes('true') || rawReturnable.includes('1');

    validRows.push({
      productCode: rawCode,
      sku: rawSku || rawCode,
      name: rawName,
      category: catIdx !== -1 ? (row[catIdx] || 'General').trim() : 'General',
      productType: typeIdx !== -1 ? (row[typeIdx] || (isReturnable ? 'Returnable item' : 'Goods')).trim() : (isReturnable ? 'Returnable item' : 'Goods'),
      unit: unitIdx !== -1 ? (row[unitIdx] || 'NOS').trim().toUpperCase() : 'NOS',
      rate: isNaN(rawRate) ? 0 : rawRate,
      taxRate: isNaN(rawTax) ? 0 : rawTax,
      hsn: hsnIdx !== -1 ? (row[hsnIdx] || '').trim() : '',
      unitWeight: isNaN(rawWeight) ? null : rawWeight,
      weightUnit: wtUnitIdx !== -1 ? (row[wtUnitIdx] || 'Kg').trim() : 'Kg',
      description: descIdx !== -1 ? (row[descIdx] || '').trim() : '',
      brand: brandIdx !== -1 ? (row[brandIdx] || '').trim() : '',
      modelNumber: modelIdx !== -1 ? (row[modelIdx] || '').trim() : '',
      barcode: barcodeIdx !== -1 ? (row[barcodeIdx] || '').trim() : '',
      isReturnable,
      status: statusIdx !== -1 ? (row[statusIdx] || 'Active').trim() : 'Active'
    });
  }

  return {
    validRows,
    errorRows,
    summary: {
      total: parsedRows.length - 1,
      valid: validRows.length,
      failed: errorRows.length
    }
  };
};

/**
 * Triggers browser download of generated CSV file
 */
export const downloadCsvFile = (csvContent, fileName) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
