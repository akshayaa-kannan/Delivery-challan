/**
 * Indian Business, GST, and Financial Year Helper Utilities
 * Suitable for Delivery Challans under Indian Tax & Commercial laws (CGST Rule 55)
 */

export const INDIAN_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' }
];

export const STANDARD_UOMS = [
  { value: 'NOS', label: 'Nos (Numbers)' },
  { value: 'PCS', label: 'Pieces (Pcs)' },
  { value: 'KGS', label: 'Kilograms (Kg)' },
  { value: 'GMS', label: 'Grams (g)' },
  { value: 'TON', label: 'Tonnes (Ton)' },
  { value: 'LTR', label: 'Litres (Ltr)' },
  { value: 'MLT', label: 'Millilitres (ml)' },
  { value: 'MTR', label: 'Metres (m)' },
  { value: 'SQM', label: 'Square Metres (sq.m)' },
  { value: 'CUM', label: 'Cubic Metres (cu.m)' },
  { value: 'BOX', label: 'Boxes (Box)' },
  { value: 'BAG', label: 'Bags (Bag)' },
  { value: 'BDL', label: 'Bundles (Bdl)' },
  { value: 'SET', label: 'Sets (Set)' },
  { value: 'ROL', label: 'Rolls (Roll)' },
  { value: 'DRM', label: 'Drums (Drm)' },
  { value: 'PAC', label: 'Packs (Pack)' },
  { value: 'CRT', label: 'Cartons (Crt)' }
];

export const CHALLAN_TYPES = [
  { value: 'Delivery Challan', label: 'Delivery Challan (Supply of Goods)' },
  { value: 'Job Work Challan', label: 'Job Work Challan (Rule 55/143)' },
  { value: 'Returnable Challan', label: 'Returnable Challan (Demo / Tools / Testing)' },
  { value: 'Non-Returnable Challan', label: 'Non-Returnable Challan' },
  { value: 'Stock Transfer Challan', label: 'Stock Transfer / Inter-branch Challan' },
  { value: 'Approval Challan', label: 'Goods Sent for Approval / Exhibition' }
];

export const PACKAGE_TYPES = [
  'Boxes',
  'Wooden Crates',
  'Corrugated Cartons',
  'Pallets',
  'Bags / Gunny',
  'Bundles',
  'Steel Drums',
  'Loose / Open',
  'Packs'
];

export const GST_RATES = [0, 5, 12, 18, 28];

/**
 * Calculates current Indian Financial Year (April 1 to March 31)
 * Example: for 2026-10-23 -> { fyCode: '26-27', fullFy: '2026-2027' }
 */
export const getFinancialYear = (dateInput = new Date()) => {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const month = d.getMonth() + 1; // 1 to 12
  const year = d.getFullYear();

  let startYear;
  let endYear;

  if (month >= 4) {
    // April or later
    startYear = year;
    endYear = year + 1;
  } else {
    // Jan, Feb, Mar
    startYear = year - 1;
    endYear = year;
  }

  const startShort = String(startYear).slice(-2);
  const endShort = String(endYear).slice(-2);

  return {
    fyCode: `${startShort}-${endShort}`,
    fullFy: `${startYear}-${endYear}`,
    startYear,
    endYear
  };
};

/**
 * Extracts state code from GSTIN (First 2 digits in India)
 */
export const getStateCodeFromGstin = (gstin) => {
  if (!gstin || typeof gstin !== 'string') return '';
  const clean = gstin.trim().toUpperCase();
  if (clean.length >= 2 && /^\d{2}/.test(clean)) {
    return clean.slice(0, 2);
  }
  return '';
};

/**
 * Validates Indian GSTIN format (15 characters: 2 digits + 10 PAN chars + 1 entity + Z + 1 check digit)
 */
export const validateGstin = (gstin) => {
  if (!gstin) return { isValid: true, message: '' }; // Optional
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const clean = gstin.trim().toUpperCase();
  if (!regex.test(clean)) {
    return {
      isValid: false,
      message: 'Invalid GSTIN format (should be 15 alphanumeric characters, e.g. 33EGXPD3539N1ZR)'
    };
  }
  return { isValid: true, message: '' };
};

/**
 * Validates Indian Vehicle Registration Number (e.g., TN-01-AB-1234 or TN01AB1234)
 */
export const validateVehicleNumber = (vehNo) => {
  if (!vehNo) return { isValid: true, message: '' }; // Optional
  const clean = vehNo.trim().toUpperCase().replace(/[\s-]/g, '');
  const regex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/;
  if (!regex.test(clean)) {
    return {
      isValid: false,
      message: 'Vehicle number format recommended: e.g. TN-01-AB-1234'
    };
  }
  return { isValid: true, message: '' };
};

export const CUSTOMER_TYPES = [
  'Business',
  'Individual',
  'Dealer',
  'Distributor',
  'Supplier',
  'Other'
];

export const PRODUCT_TYPES = [
  'Goods',
  'Service',
  'Returnable item',
  'Consumable',
  'Other'
];

export const DEFAULT_PRODUCT_CATEGORIES = [
  'Electrical',
  'Hardware',
  'Machinery',
  'Spare Parts',
  'Raw Materials',
  'Packaging',
  'Office Supplies',
  'Finished Goods',
  'Services',
  'General'
];

export const WEIGHT_UNITS = [
  { value: 'Kg', label: 'Kilograms (Kg)', factorToKg: 1 },
  { value: 'g', label: 'Grams (g)', factorToKg: 0.001 },
  { value: 't', label: 'Metric Tonnes (t)', factorToKg: 1000 },
  { value: 'mg', label: 'Milligrams (mg)', factorToKg: 0.000001 },
  { value: 'q', label: 'Quintals (q)', factorToKg: 100 }
];

export const WEIGHT_BASES = [
  { value: 'NET_PER_UNIT', label: 'Net product weight per unit' },
  { value: 'GROSS_PER_UNIT', label: 'Gross packaged weight per unit' },
  { value: 'PACKAGING_PER_UNIT', label: 'Packaging tare weight per unit' }
];

export const TRANSPORTER_TYPES = [
  'Road transport',
  'Courier',
  'Parcel service',
  'Air cargo',
  'Rail transport',
  'Sea freight',
  'Self-delivery',
  'Other'
];

export const VEHICLE_TYPES = [
  'Light Commercial Vehicle (LCV)',
  'Mini Truck (e.g. Tata Ace)',
  'Heavy Goods Vehicle (HGV)',
  'Container Truck',
  'Trailer',
  'Pickup Truck',
  'Three-Wheeler / Auto',
  'Two-Wheeler',
  'Tanker',
  'Van',
  'Other'
];

export const FREIGHT_PAYMENT_RESPONSIBILITIES = [
  'To Pay (Consignee)',
  'Paid (Consignor)',
  'Billed (On Account)',
  'Included in Agreed Price',
  'Third Party',
  'Not Applicable'
];

export const WEIGHING_METHODS = [
  'Certified Weighbridge',
  'Electronic Platform Scale',
  'Warehouse Floor Scale',
  'Manual Spring Scale',
  'Calculated / Estimated'
];

export const DIMENSION_UNITS = [
  { value: 'cm', label: 'Centimetres (cm)' },
  { value: 'mm', label: 'Millimetres (mm)' },
  { value: 'm', label: 'Metres (m)' },
  { value: 'in', label: 'Inches (in)' }
];

/**
 * Standard Delivery Challan Declaration & Terms (under CGST Rule 55)
 */
export const DEFAULT_TERMS_AND_CONDITIONS = [
  '1. Goods are transported under Rule 55 of CGST Rules 2017 not for sale.',
  '2. Goods mentioned herein have been dispatched in good order and condition.',
  '3. Any discrepancy must be reported immediately upon receipt of goods.',
  '4. Receiver acknowledgment with stamp and signature is required on delivery.'
];

/**
 * Format monetary amount into Indian Rupee (INR) format (e.g. ₹1,25,000.00)
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format ISO or standard date string to Indian standard DD/MM/YYYY format
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

