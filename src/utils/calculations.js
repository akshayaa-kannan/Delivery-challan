/**
 * Financial and Quantity Calculation Utilities
 * Handles discounts, taxes, rounding, and UOM summaries.
 */

/**
 * Formats a number as Indian Rupee (INR) currency.
 * Example: 125000 -> ₹1,25,000.00
 * @param {number} value - The number to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value) => {
  if (value === undefined || value === null || isNaN(value)) {
    return '₹0.00';
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Formats decimal numbers with fixed precision (e.g., weights or rates)
 */
export const formatNumber = (value, decimals = 2) => {
  if (value === undefined || value === null || isNaN(value) || value === '') {
    return '0';
  }
  const num = parseFloat(value);
  return isNaN(num) ? '0' : num.toFixed(decimals);
};

/**
 * Calculates row amounts considering quantity, rate, discount (%), and tax (%).
 * @param {number|string} quantity 
 * @param {number|string} rate 
 * @param {number|string} discountPercent 
 * @param {number|string} taxPercent 
 * @returns {Object} { taxableAmount, discountAmount, taxAmount, amount }
 */
export const calculateRowAmount = (quantity, rate, discountPercent = 0, taxPercent = 0) => {
  const qty = parseFloat(quantity) || 0;
  const rt = parseFloat(rate) || 0;
  const discPct = Math.max(0, parseFloat(discountPercent) || 0);
  const txPct = Math.max(0, parseFloat(taxPercent) || 0);

  const baseTotal = qty * rt;
  const discountAmount = Math.round((baseTotal * (discPct / 100)) * 100) / 100;
  const taxableAmount = Math.max(0, baseTotal - discountAmount);
  const taxAmount = Math.round((taxableAmount * (txPct / 100)) * 100) / 100;
  const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

  return totalAmount;
};

/**
 * Detailed line breakdown for item row
 */
export const calculateLineItemBreakdown = (quantity, rate, discountPercent = 0, taxPercent = 0) => {
  const qty = parseFloat(quantity) || 0;
  const rt = parseFloat(rate) || 0;
  const discPct = Math.max(0, parseFloat(discountPercent) || 0);
  const txPct = Math.max(0, parseFloat(taxPercent) || 0);

  const baseTotal = qty * rt;
  const discountAmount = Math.round((baseTotal * (discPct / 100)) * 100) / 100;
  const taxableAmount = Math.max(0, baseTotal - discountAmount);
  const taxAmount = Math.round((taxableAmount * (txPct / 100)) * 100) / 100;
  const lineTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  return {
    quantity: qty,
    rate: rt,
    discountPercent: discPct,
    discountAmount,
    taxableAmount,
    taxPercent: txPct,
    taxAmount,
    lineTotal
  };
};

/**
 * Calculates totals for a list of products.
 * Handles both monetary challans and pure goods-movement challans.
 * Groups quantities by unit so incompatible units are not misleadingly summed.
 * @param {Array} products 
 * @returns {Object} { totalQuantity, totalAmount, totalTaxable, totalTax, totalDiscount, unitSummary, itemCount }
 */
export const calculateTotals = (products = []) => {
  let totalQuantity = 0;
  let totalAmount = 0;
  let totalTaxable = 0;
  let totalTax = 0;
  let totalDiscount = 0;
  const unitMap = {};
  let validItemCount = 0;

  products.forEach((curr) => {
    const qty = parseFloat(curr.quantity) || 0;
    const rate = parseFloat(curr.rate) || 0;
    const discPct = parseFloat(curr.discount || curr.discountPercent) || 0;
    const taxPct = parseFloat(curr.taxRate || curr.taxPercent) || 0;

    if (curr.name && curr.name.trim()) {
      validItemCount++;
    }

    const breakdown = calculateLineItemBreakdown(qty, rate, discPct, taxPct);

    totalQuantity += qty;
    totalDiscount += breakdown.discountAmount;
    totalTaxable += breakdown.taxableAmount;
    totalTax += breakdown.taxAmount;
    totalAmount += breakdown.lineTotal;

    const unit = (curr.unit || 'nos').toUpperCase();
    unitMap[unit] = (unitMap[unit] || 0) + qty;
  });

  // Build clean unit summary string, e.g. "4 NOS, 2 PCS"
  const unitSummary = Object.entries(unitMap)
    .filter(([_, q]) => q > 0)
    .map(([u, q]) => `${q} ${u}`)
    .join(', ');

  return {
    itemCount: validItemCount,
    totalQuantity: Math.round(totalQuantity * 1000) / 1000,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalTaxable: Math.round(totalTaxable * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    unitMap,
    unitSummary: unitSummary || `${totalQuantity} Items`
  };
};

/**
 * Calculates Net Weight = Gross Weight - Tare Weight.
 * Validates against negative weight.
 */
export const calculateNetWeight = (grossWeight, tareWeight) => {
  if (grossWeight === undefined || grossWeight === null || grossWeight === '') {
    return { netWeight: 0, isValid: true, error: '' };
  }

  const gross = parseFloat(grossWeight);
  const tare = parseFloat(tareWeight) || 0;

  if (isNaN(gross) || gross < 0) {
    return { netWeight: 0, isValid: false, error: 'Gross weight must be a valid positive number' };
  }

  if (isNaN(tare) || tare < 0) {
    return { netWeight: 0, isValid: false, error: 'Tare weight must be a valid positive number' };
  }

  if (tare > gross) {
    return {
      netWeight: 0,
      isValid: false,
      error: 'Tare weight cannot exceed gross weight'
    };
  }

  const net = Math.round((gross - tare) * 1000) / 1000;
  return { netWeight: net, isValid: true, error: '' };
};

// ============================================================================
// MODULE 5: COMPREHENSIVE WEIGHT & TRANSPORT CALCULATION ENGINE
// ============================================================================

// Conversion factors to kilograms (Base internal standard unit)
const WEIGHT_UNIT_TO_KG = {
  mg: 0.000001,
  milligram: 0.000001,
  milligrams: 0.000001,
  g: 0.001,
  gm: 0.001,
  gms: 0.001,
  gram: 0.001,
  grams: 0.001,
  kg: 1,
  kgs: 1,
  kilogram: 1,
  kilograms: 1,
  q: 100,
  quintal: 100,
  quintals: 100,
  t: 1000,
  ton: 1000,
  tons: 1000,
  tonne: 1000,
  tonnes: 1000,
  mt: 1000
};

export const normalizeWeightUnit = (unit) => {
  if (!unit) return 'Kg';
  const u = String(unit).trim().toLowerCase();
  if (u === 'mg' || u.startsWith('milli')) return 'mg';
  if (u === 'g' || u === 'gm' || u === 'gms' || u.startsWith('gram')) return 'g';
  if (u === 't' || u.startsWith('ton') || u === 'mt') return 't';
  if (u === 'q' || u.startsWith('quintal')) return 'q';
  return 'Kg';
};

export const weightToKg = (value, unit = 'Kg') => {
  if (value === undefined || value === null || value === '' || isNaN(value)) return null;
  const num = parseFloat(value);
  if (num < 0) return null;
  const u = String(unit).trim().toLowerCase();
  const factor = WEIGHT_UNIT_TO_KG[u] || 1;
  return num * factor;
};

export const kgToUnit = (kgValue, targetUnit = 'Kg') => {
  if (kgValue === undefined || kgValue === null || isNaN(kgValue)) return null;
  const num = parseFloat(kgValue);
  const u = String(targetUnit).trim().toLowerCase();
  const factor = WEIGHT_UNIT_TO_KG[u] || 1;
  return num / factor;
};

export const convertWeight = (value, fromUnit = 'Kg', toUnit = 'Kg') => {
  const kg = weightToKg(value, fromUnit);
  if (kg === null) return null;
  return kgToUnit(kg, toUnit);
};

export const calculateShipmentWeights = (items = [], packagingDetails = {}, explicitWeights = {}) => {
  const targetDisplayUnit = packagingDetails.weightUnit || explicitWeights.weightUnit || 'Kg';
  let totalNetKg = 0;
  let totalGrossKg = 0;
  let totalLinePackagingKg = 0;
  let itemsWithWeightCount = 0;
  const validItems = items.filter(it => it.name && it.name.trim() !== '');
  const totalItemCount = validItems.length;

  validItems.forEach(item => {
    const qty = parseFloat(item.quantity) || 0;
    const unitNet = parseFloat(item.unitNetWeight !== undefined ? item.unitNetWeight : item.unitWeight);
    const unitGross = parseFloat(item.unitGrossWeight);
    const unitPackaging = parseFloat(item.unitPackagingWeight !== undefined ? item.unitPackagingWeight : item.packagingWeight) || 0;
    const itemUnit = item.weightUnit || 'Kg';

    let hasLineWeight = false;

    if (!isNaN(unitNet) && unitNet > 0) {
      hasLineWeight = true;
      const netKg = weightToKg(unitNet * qty, itemUnit);
      if (netKg !== null) totalNetKg += netKg;
    }

    if (!isNaN(unitGross) && unitGross > 0) {
      hasLineWeight = true;
      const grossKg = weightToKg(unitGross * qty, itemUnit);
      if (grossKg !== null) totalGrossKg += grossKg;
      const pkgKg = weightToKg(unitPackaging * qty, itemUnit) || 0;
      totalLinePackagingKg += pkgKg;
      if (isNaN(unitNet) || unitNet <= 0) {
        totalNetKg += Math.max(0, grossKg - pkgKg);
      }
    } else if (!isNaN(unitNet) && unitNet > 0) {
      // If gross is not explicitly specified, gross = net + packaging
      const pkgKg = weightToKg(unitPackaging * qty, itemUnit) || 0;
      totalLinePackagingKg += pkgKg;
    }

    if (hasLineWeight) itemsWithWeightCount++;
  });

  // Packaging-level weights
  const pkgTareExplicit = parseFloat(
    packagingDetails.packageTareWeight !== undefined 
      ? packagingDetails.packageTareWeight 
      : (packagingDetails.packagingWeight !== undefined ? packagingDetails.packagingWeight : explicitWeights.tareWeight)
  );

  let shipmentPackagingKg = totalLinePackagingKg;
  if (!isNaN(pkgTareExplicit) && pkgTareExplicit > 0) {
    const pkgUnit = packagingDetails.weightUnit || explicitWeights.weightUnit || 'Kg';
    const pkgExplicitKg = weightToKg(pkgTareExplicit, pkgUnit) || 0;
    shipmentPackagingKg += pkgExplicitKg;
  }

  // Double-counting prevention & total gross computation:
  if (totalGrossKg === 0) {
    totalGrossKg = totalNetKg + shipmentPackagingKg;
  } else {
    // If line gross weights were already specified, ensure any shipment-level tare is included
    const extraShipmentTare = !isNaN(pkgTareExplicit) && pkgTareExplicit > 0 
      ? (weightToKg(pkgTareExplicit, packagingDetails.weightUnit || explicitWeights.weightUnit || 'Kg') || 0)
      : 0;
    totalGrossKg += extraShipmentTare;
  }

  // Explicit override if user entered manual overall gross weight
  const manualGross = parseFloat(explicitWeights.grossWeight);
  if (!isNaN(manualGross) && manualGross > 0) {
    const manualKg = weightToKg(manualGross, explicitWeights.weightUnit || 'Kg');
    if (manualKg !== null) {
      totalGrossKg = manualKg;
      if (totalNetKg === 0) {
        totalNetKg = Math.max(0, totalGrossKg - shipmentPackagingKg);
      }
    }
  }

  const netDisplay = Math.round((kgToUnit(totalNetKg, targetDisplayUnit) || 0) * 1000) / 1000;
  const packagingDisplay = Math.round((kgToUnit(shipmentPackagingKg, targetDisplayUnit) || 0) * 1000) / 1000;
  const grossDisplay = Math.round((kgToUnit(totalGrossKg, targetDisplayUnit) || 0) * 1000) / 1000;

  let completeness = 'Complete';
  const missingCount = totalItemCount - itemsWithWeightCount;
  if (totalItemCount === 0 || itemsWithWeightCount === 0) {
    completeness = 'Unspecified';
  } else if (missingCount > 0) {
    completeness = 'Incomplete';
  }

  const pkgCount = parseInt(
    packagingDetails.numberOfPackages !== undefined 
      ? packagingDetails.numberOfPackages 
      : (packagingDetails.totalPackages !== undefined ? packagingDetails.totalPackages : explicitWeights.numberOfPackages), 
    10
  ) || 0;

  const warningMsg = completeness === 'Incomplete' 
    ? `Weight summary incomplete — ${missingCount} of ${totalItemCount} item(s) have no weight information.`
    : (completeness === 'Complete' ? 'Complete weight summary' : 'No weight recorded');

  return {
    totalNetWeight: netDisplay,
    netWeight: netDisplay,
    totalPackagingWeight: packagingDisplay,
    packagingWeight: packagingDisplay,
    tareWeight: packagingDisplay,
    totalGrossWeight: grossDisplay,
    grossWeight: grossDisplay,
    weightUnit: targetDisplayUnit,
    netWeightKg: Math.round(totalNetKg * 1000) / 1000,
    grossWeightKg: Math.round(totalGrossKg * 1000) / 1000,
    packagingWeightKg: Math.round(shipmentPackagingKg * 1000) / 1000,
    totalPackages: pkgCount,
    totalPackageCount: pkgCount,
    packageType: packagingDetails.packageType || explicitWeights.packageType || 'Boxes',
    itemsWithWeightCount,
    totalItemCount,
    missingItemsCount: missingCount,
    missingWeightItems: missingCount,
    completeness,
    isComplete: completeness === 'Complete',
    warning: warningMsg,
    completenessMessage: warningMsg
  };
};

export const calculateWeightDiscrepancy = (calculatedGrossKg, actualGrossKg, tolerancePercent = 2) => {
  if (calculatedGrossKg === undefined || calculatedGrossKg === null || isNaN(calculatedGrossKg) ||
      actualGrossKg === undefined || actualGrossKg === null || isNaN(actualGrossKg)) {
    return { hasDiscrepancy: false, differenceKg: 0, percentage: 0, status: 'Unverified' };
  }

  const calc = parseFloat(calculatedGrossKg);
  const actual = parseFloat(actualGrossKg);
  const diff = Math.round((actual - calc) * 1000) / 1000;
  const percent = calc > 0 ? Math.round((Math.abs(diff) / calc) * 10000) / 100 : 0;
  const isWithinTolerance = percent <= tolerancePercent;

  let status = 'Verified';
  if (diff !== 0) {
    status = isWithinTolerance ? 'Within Tolerance' : 'Discrepancy Detected';
  }

  return {
    differenceKg: diff,
    discrepancyKg: diff,
    percentage: percent,
    discrepancyPercentage: percent,
    status,
    isWithinTolerance,
    isDiscrepancy: !isWithinTolerance && diff !== 0,
    message: diff === 0
      ? 'Actual weight exactly matches calculated weight.'
      : `${diff > 0 ? '+' : ''}${diff} kg (${percent}%) difference vs calculated weight.`
  };
};
