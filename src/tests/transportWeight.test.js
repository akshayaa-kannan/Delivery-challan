import {
  weightToKg,
  kgToUnit,
  convertWeight,
  calculateShipmentWeights,
  calculateWeightDiscrepancy
} from '../utils/calculations.js';

import {
  getTransporters,
  getTransporterById,
  saveTransporter,
  deleteTransporter,
  updateTransporterStatus,
  generateNextTransporterCode,
  createChallan,
  getChallanById,
  recordActualWeight,
  getTransportStats,
  STORAGE_KEYS
} from '../utils/tenantStorage.js';

export async function runTransportWeightTests() {
  console.log("=== RUNNING WEIGHT & TRANSPORT MANAGEMENT TESTS ===");
  const results = [];

  const assert = (name, condition, extra = '') => {
    if (condition) {
      console.log(`  ✓ ${name}`);
      results.push({ name, passed: true });
    } else {
      console.error(`  ✗ ${name} ${extra ? `(${extra})` : ''}`);
      results.push({ name, passed: false, extra });
    }
  };

  const tenantA = "comp_transport_tenant_a";
  const tenantB = "comp_transport_tenant_b";

  try {
    // ------------------------------------------------------------------------
    // 1. WEIGHT UNIT CONVERSIONS TO BASE KG
    // ------------------------------------------------------------------------
    assert("1.1. Convert Grams to Kg (500g = 0.5kg)", weightToKg(500, 'g') === 0.5);
    assert("1.2. Convert Milligrams to Kg (250000mg = 0.25kg)", weightToKg(250000, 'mg') === 0.25);
    assert("1.3. Convert Metric Ton to Kg (2.5t = 2500kg)", weightToKg(2.5, 't') === 2500);
    assert("1.4. Convert Quintal to Kg (4q = 400kg)", weightToKg(4, 'q') === 400);
    assert("1.5. Convert Kg to Tonnes (2500kg = 2.5t)", kgToUnit(2500, 't') === 2.5);
    assert("1.6. Convert between units directly (1.5t to Quintal = 15q)", convertWeight(1.5, 't', 'q') === 15);

    // ------------------------------------------------------------------------
    // 2. SHIPMENT WEIGHT AGGREGATION & COMPLETENESS
    // ------------------------------------------------------------------------
    const fullWeightItems = [
      { name: "Motor 1HP", quantity: 2, unitNetWeight: 15, unitPackagingWeight: 1, weightUnit: "Kg" },
      { name: "Steel Brackets", quantity: 10, unitNetWeight: 500, unitPackagingWeight: 20, weightUnit: "g" } // 500g = 0.5kg net, 20g = 0.02kg tare
    ];

    const fullResult = calculateShipmentWeights(fullWeightItems, {
      packageTareWeight: 2, // shipment-level pallet / master box tare
      weightUnit: 'Kg',
      numberOfPackages: 3,
      packageType: 'Boxes'
    });

    // Motor net = 2 * 15 = 30kg. Motor tare = 2 * 1 = 2kg
    // Brackets net = 10 * 0.5 = 5kg. Brackets tare = 10 * 0.02 = 0.2kg
    // Total net = 35kg. Total packaging = 2 + 0.2 + 2 (pallet) = 4.2kg. Gross = 39.2kg
    assert("2.1. Full weights: Total Net Weight is exactly 35 Kg", fullResult.totalNetWeight === 35);
    assert("2.2. Full weights: Packaging Tare includes line tare + package tare (4.2 Kg)", fullResult.totalPackagingWeight === 4.2);
    assert("2.3. Full weights: Gross Weight matches Net + Tare (39.2 Kg)", fullResult.totalGrossWeight === 39.2);
    assert("2.4. Full weights completeness indicator is 'Complete'", fullResult.completeness === 'Complete');
    assert("2.5. Full weights missing items count is 0", fullResult.missingItemsCount === 0);

    // ------------------------------------------------------------------------
    // 3. INCOMPLETE WEIGHTS DETECTION & PREVENTING FAKE COMPLETENESS
    // ------------------------------------------------------------------------
    const partialWeightItems = [
      { name: "Motor 1HP", quantity: 1, unitNetWeight: 15, weightUnit: "Kg" },
      { name: "Rubber Gaskets", quantity: 50 } // No weight specified
    ];

    const partialResult = calculateShipmentWeights(partialWeightItems, { weightUnit: 'Kg' });
    assert("3.1. Partial weights: Completeness is 'Incomplete'", partialResult.completeness === 'Incomplete');
    assert("3.2. Partial weights: Detects 1 missing item", partialResult.missingItemsCount === 1);
    assert("3.3. Partial weights: Message warns user about incomplete weights", partialResult.completenessMessage.includes("1 of 2 item(s) have no weight"));

    const noWeightItems = [
      { name: "Service Item", quantity: 1 },
      { name: "Consulting", quantity: 1 }
    ];
    const noWeightResult = calculateShipmentWeights(noWeightItems, { weightUnit: 'Kg' });
    assert("3.4. Unspecified weights: Completeness is 'Unspecified'", noWeightResult.completeness === 'Unspecified');
    assert("3.5. Unspecified weights: Total Net is 0", noWeightResult.totalNetWeight === 0);

    // ------------------------------------------------------------------------
    // 4. DOUBLE-COUNTING PREVENTION
    // ------------------------------------------------------------------------
    // When line items already include packaging tare in their gross weight, shipment-level packaging
    // must not redundantly inflate gross weight.
    const itemsWithGross = [
      { name: "Packaged Pump", quantity: 1, unitGrossWeight: 20, unitPackagingWeight: 2, weightBasis: "GROSS_PER_UNIT", weightUnit: "Kg" }
    ];
    const doubleCountCheck = calculateShipmentWeights(itemsWithGross, { packageTareWeight: 0, weightUnit: 'Kg' });
    assert("4.1. Double-counting: Gross weight does not duplicate line packaging tare", doubleCountCheck.totalGrossWeight === 20 && doubleCountCheck.totalNetWeight === 18);

    // ------------------------------------------------------------------------
    // 5. LIVE WEIGHBRIDGE DISCREPANCY & TOLERANCE THRESHOLD AUDIT
    // ------------------------------------------------------------------------
    const discExact = calculateWeightDiscrepancy(100, 100, 2);
    assert("5.1. Exact weight match is 'Verified' with 0 kg diff", discExact.status === 'Verified' && discExact.discrepancyKg === 0);

    const discWithin = calculateWeightDiscrepancy(100, 101.5, 2); // 1.5% diff, within 2% tolerance
    assert("5.2. Weight within tolerance is 'Within Tolerance'", discWithin.status === 'Within Tolerance' && discWithin.discrepancyKg === 1.5);

    const discExcess = calculateWeightDiscrepancy(100, 106, 2); // 6% diff, exceeds 2% tolerance
    assert("5.3. Weight exceeding tolerance triggers 'Discrepancy Detected'", discExcess.status === 'Discrepancy Detected' && discExcess.discrepancyKg === 6);

    // ------------------------------------------------------------------------
    // 6. TRANSPORTER DIRECTORY CRUD & UNIQUE CODE GENERATION
    // ------------------------------------------------------------------------
    const code1 = await generateNextTransporterCode(tenantA);
    assert("6.1. Generated transporter code starts with TRN-", code1.startsWith('TRN-'));

    const savedTr = await saveTransporter(tenantA, {
      transporterCode: code1,
      name: "FastTrack Express Logistics",
      transporterType: "Road transport",
      contactPerson: "Rajesh Kumar",
      phone: "9840112233",
      email: "booking@fasttrack.in",
      gstin: "33AAAAA1111A1Z1",
      city: "Coimbatore",
      state: "Tamil Nadu",
      status: "Active"
    });

    assert("6.2. Saved transporter has valid ID and correct attributes", savedTr && savedTr.id && savedTr.name === "FastTrack Express Logistics");

    const fetchedTr = await getTransporterById(tenantA, savedTr.id);
    assert("6.3. Transporter fetched by ID matches saved data", fetchedTr && fetchedTr.contactPerson === "Rajesh Kumar");

    // Toggle status
    const deactTr = await updateTransporterStatus(tenantA, savedTr.id, "Inactive");
    assert("6.4. Transporter status toggles to Inactive", deactTr && deactTr.status === "Inactive");

    // Reactivate
    await updateTransporterStatus(tenantA, savedTr.id, "Active");

    // ------------------------------------------------------------------------
    // 7. RECORD ACTUAL WEIGHBRIDGE READING ON CHALLAN
    // ------------------------------------------------------------------------
    const testChallan = await createChallan(tenantA, {
      challanNumber: "DC-WT-001",
      date: "2026-10-24",
      status: "Finalized",
      customerDetails: { name: "Weight Test Client" },
      transport: {
        transporterId: savedTr.id,
        transporterName: savedTr.name,
        vehicleNumber: "TN 38 BZ 9999"
      },
      weights: {
        enabled: true,
        grossWeight: 500,
        netWeight: 480,
        tareWeight: 20,
        weightUnit: "Kg"
      },
      products: [{ name: "Cast Iron Flanges", quantity: 10, unit: "NOS", unitNetWeight: 48, weightUnit: "Kg" }]
    });

    assert("7.1. Challan created with initial calculated gross weight (500 Kg)", testChallan && testChallan.weights.grossWeight === 500);

    // Record weighbridge reading with discrepancy (515 kg measured vs 500 kg calculated)
    const weighingRecord = await recordActualWeight(tenantA, testChallan.id, {
      grossWeight: 515,
      tareWeight: 15,
      weightUnit: "Kg",
      weighingDate: "2026-10-24",
      weighingLocation: "Plant Weighbridge #1",
      weighedBy: "Gate Scale Operator",
      weighbridgeReceiptNo: "WB-2026-8801",
      discrepancyReason: "Pallet moisture variation"
    }, { name: "Scale Supervisor" });

    assert("7.2. Weighbridge actual gross weight recorded", weighingRecord && weighingRecord.weights.actual.grossWeight === 515);
    assert("7.3. Weighbridge discrepancy correctly calculated (+15 kg)", weighingRecord.weights.actual.differenceKg === 15);
    assert("7.4. Audit event appended to deliveryEvents log", weighingRecord.deliveryEvents.some(e => e.eventType === 'Weight Verified' && e.note.includes("WB-2026-8801")));

    // ------------------------------------------------------------------------
    // 8. TRANSPORTER DELETION SAFETY (PREVENT DELETION IF REFERENCED)
    // ------------------------------------------------------------------------
    const deleteAttempt = await deleteTransporter(tenantA, savedTr.id);
    assert("8.1. Deleting transporter referenced in challans is safely blocked", deleteAttempt.success === false && deleteAttempt.reason === 'referenced_by_challans');

    // ------------------------------------------------------------------------
    // 9. MULTI-TENANT ISOLATION
    // ------------------------------------------------------------------------
    const tenantATransporters = await getTransporters(tenantA);
    const tenantBTransporters = await getTransporters(tenantB);
    assert("9.1. Tenant B cannot see Tenant A's newly added transporter", !tenantBTransporters.some(t => t.id === savedTr.id));

    // ------------------------------------------------------------------------
    // 10. TRANSPORT HUB KPI STATS
    // ------------------------------------------------------------------------
    const statsA = await getTransportStats(tenantA);
    assert("10.1. Transport stats calculates total shipments", statsA.totalShipments >= 1);
    assert("10.2. Transport stats detects weight discrepancies", statsA.weightDiscrepancies >= 1);
    assert("10.3. Transport stats reflects transporter directory counts", statsA.activeTransporters >= 1);

  } catch (err) {
    console.error("FATAL ERROR IN TRANSPORT WEIGHT TESTS:", err);
    results.push({ name: "Execution Error", passed: false, extra: err.message });
  }

  const passed = results.filter(r => r.passed).length;
  console.log(`\nTransport & Weight Management: ${passed} / ${results.length} PASSED\n`);
  return results;
}
