import {
  createChallan,
  getChallanById,
  recordDispatch,
  recordDeliveryEvent,
  recordDeliveryConfirmation,
  recordGoodsReturn,
  recordReturnInspection,
  getDeliveryStats,
  getReturnableStats,
  getReturnableItemsList,
  DELIVERY_STATUSES,
  RETURN_STATUSES,
  normalizeDeliveryStatus,
  computeChallanReturnStatus
} from '../utils/tenantStorage.js';

export async function runDeliveryReturnTests() {
  console.log("=== RUNNING DELIVERY STATUS & RETURNABLE GOODS TESTS ===");
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

  const tenantA = "comp_deliv_tenant_a";
  const tenantB = "comp_deliv_tenant_b";

  try {
    // ------------------------------------------------------------------------
    // 1. DRAFT CHALLAN CANNOT BE DISPATCHED PREMATURELY
    // ------------------------------------------------------------------------
    const draftChallan = await createChallan(tenantA, {
      challanNumber: "DC-DRAFT-001",
      date: "2026-10-23",
      status: "Draft",
      customerDetails: { name: "Draft Customer" },
      items: [{ name: "Hydraulic Pump", quantity: 5, unit: "NOS" }]
    });

    let draftDispatchBlocked = false;
    try {
      await recordDispatch(tenantA, draftChallan.id, {
        dispatchDate: "2026-10-23",
        vehicleNumber: "TN 38 AA 1111"
      });
    } catch (err) {
      draftDispatchBlocked = true;
    }
    assert("1. Draft challan cannot be dispatched prematurely", draftDispatchBlocked);

    // ------------------------------------------------------------------------
    // 2. FINALIZED CHALLAN CAN BE MARKED READY FOR DISPATCH & DISPATCHED
    // ------------------------------------------------------------------------
    const finalizedChallan = await createChallan(tenantA, {
      challanNumber: "DC-FIN-001",
      date: "2026-10-23",
      status: "Finalized",
      customerDetails: { 
        name: "L&T Construction",
        deliveryAddress: "Site 4, Coimbatore Bypass" 
      },
      items: [
        { 
          serialNumber: 1, 
          name: "Industrial Centrifugal Pump", 
          quantity: 10, 
          unit: "NOS",
          isReturnable: false
        },
        { 
          serialNumber: 2, 
          name: "Vibration Testing Meter", 
          quantity: 2, 
          unit: "SET",
          isReturnable: true,
          returnableQty: 2,
          expectedReturnDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
        }
      ]
    });

    const initStatus = normalizeDeliveryStatus(finalizedChallan);
    assert("2. Finalized challan defaults to Ready for Dispatch", initStatus === DELIVERY_STATUSES.READY_FOR_DISPATCH);

    // Record Dispatch
    const dispatchedChallan = await recordDispatch(tenantA, finalizedChallan.id, {
      dispatchDate: "2026-10-23",
      dispatchTime: "10:30",
      dispatchLocation: "Coimbatore Main Warehouse",
      destination: "Site 4, Coimbatore Bypass",
      transporterName: "VRL Logistics",
      vehicleNumber: "TN 38 CD 4567",
      driverName: "Murugan",
      driverPhone: "9876543210",
      lrNumber: "LR-789012",
      expectedDeliveryDate: "2026-10-25",
      remarks: "Fragile electronic meters loaded on top"
    });

    assert("3. Dispatch recorded and status transitioned to Dispatched", 
      dispatchedChallan.deliveryStatus === DELIVERY_STATUSES.DISPATCHED &&
      dispatchedChallan.dispatchDetails.vehicleNumber === "TN 38 CD 4567"
    );

    // ------------------------------------------------------------------------
    // 3. TRANSIT MILESTONE RECORDING & CHRONOLOGICAL TIMELINE
    // ------------------------------------------------------------------------
    const transitChallan = await recordDeliveryEvent(tenantA, finalizedChallan.id, {
      eventType: "In Transit",
      location: "Salem Toll Plaza Hub",
      note: "Vehicle crossed Salem checkpoint on time",
      statusAfter: DELIVERY_STATUSES.IN_TRANSIT
    });

    assert("4. Tracking event recorded and transitioned to In Transit", 
      transitChallan.deliveryStatus === DELIVERY_STATUSES.IN_TRANSIT &&
      transitChallan.deliveryEvents.length >= 2
    );

    // ------------------------------------------------------------------------
    // 4. PARTIAL DELIVERY CALCULATION & RESIDUAL BALANCE TRACKING
    // ------------------------------------------------------------------------
    // First partial delivery: Deliver 6 of 10 pumps, and 1 of 2 meters
    const partialConfirmChallan = await recordDeliveryConfirmation(tenantA, finalizedChallan.id, {
      deliveredDate: "2026-10-24",
      receiverName: "Karthik Subramanian",
      receiverPhone: "9876501234",
      receiverDesignation: "Store Manager",
      remarks: "Partial shipment unloaded at Bay 2",
      itemDeliveries: [
        { serialNumber: 1, name: "Industrial Centrifugal Pump", deliveredQuantity: 6 },
        { serialNumber: 2, name: "Vibration Testing Meter", deliveredQuantity: 1 }
      ]
    });

    assert("5. Partial delivery transitions to Partially Delivered", 
      partialConfirmChallan.deliveryStatus === DELIVERY_STATUSES.PARTIALLY_DELIVERED
    );

    const pumpItem = partialConfirmChallan.items.find(i => i.name === "Industrial Centrifugal Pump");
    const meterItem = partialConfirmChallan.items.find(i => i.name === "Vibration Testing Meter");

    assert("6. Line item remaining delivery quantities calculated correctly", 
      pumpItem.deliveredQuantity === 6 && pumpItem.remainingQuantity === 4 &&
      meterItem.deliveredQuantity === 1 && meterItem.remainingQuantity === 1
    );

    // ------------------------------------------------------------------------
    // 5. REJECT DELIVERIES EXCEEDING REMAINING QUANTITY
    // ------------------------------------------------------------------------
    let exceedDeliveryBlocked = false;
    try {
      await recordDeliveryConfirmation(tenantA, finalizedChallan.id, {
        deliveredDate: "2026-10-25",
        receiverName: "Karthik",
        itemDeliveries: [
          { serialNumber: 1, name: "Industrial Centrifugal Pump", deliveredQuantity: 10 } // Only 4 remaining!
        ]
      });
    } catch (err) {
      exceedDeliveryBlocked = true;
    }
    assert("7. Rejects delivered quantity exceeding remaining expected balance", exceedDeliveryBlocked);

    // ------------------------------------------------------------------------
    // 6. SECOND PARTIAL DELIVERY COMPLETES THE CHALLAN TO DELIVERED
    // ------------------------------------------------------------------------
    const fullDeliveredChallan = await recordDeliveryConfirmation(tenantA, finalizedChallan.id, {
      deliveredDate: "2026-10-25",
      receiverName: "Karthik Subramanian",
      receiverPhone: "9876501234",
      receiverDesignation: "Store Manager",
      remarks: "Final balance received and verified",
      itemDeliveries: [
        { serialNumber: 1, name: "Industrial Centrifugal Pump", deliveredQuantity: 4 },
        { serialNumber: 2, name: "Vibration Testing Meter", deliveredQuantity: 1 }
      ]
    });

    assert("8. Second partial delivery transitions challan to Delivered", 
      fullDeliveredChallan.deliveryStatus === DELIVERY_STATUSES.DELIVERED &&
      fullDeliveredChallan.deliveryConfirmation.isComplete === true
    );

    // ------------------------------------------------------------------------
    // 7. RETURNABLE GOODS LIFECYCLE & RETURN TRACKING
    // ------------------------------------------------------------------------
    // Challan has 2 Vibration Testing Meters issued on returnable terms
    const initialRetStatus = computeChallanReturnStatus(fullDeliveredChallan);
    assert("9. Challan with outstanding returnable goods marked Awaiting Return", 
      initialRetStatus === RETURN_STATUSES.AWAITING_RETURN
    );

    // Record Partial Return: Customer returns 1 of the 2 meters
    const partialReturnChallan = await recordGoodsReturn(tenantA, finalizedChallan.id, {
      returnDate: "2026-10-26",
      receivedBy: "Inspector Anand",
      returnLocation: "Inspection Bay 1",
      condition: "Good",
      reason: "Initial testing completed",
      remarks: "Unit 1 returned with cables and test probe intact",
      items: [
        { serialNumber: 2, name: "Vibration Testing Meter", returnedQuantity: 1, condition: "Good" }
      ]
    });

    assert("10. Partial goods return transitions to Partially Returned", 
      partialReturnChallan.returnStatus === RETURN_STATUSES.PARTIALLY_RETURNED
    );

    const retMeterItem = partialReturnChallan.items.find(i => i.name === "Vibration Testing Meter");
    assert("11. Returnable item calculates 1 returned and 1 outstanding", 
      retMeterItem.returnedQty === 1 && retMeterItem.outstandingReturnQty === 1
    );

    // ------------------------------------------------------------------------
    // 8. REJECT RETURN EXCEEDING OUTSTANDING QUANTITY
    // ------------------------------------------------------------------------
    let exceedReturnBlocked = false;
    try {
      await recordGoodsReturn(tenantA, finalizedChallan.id, {
        returnDate: "2026-10-27",
        receivedBy: "Inspector Anand",
        items: [
          { serialNumber: 2, name: "Vibration Testing Meter", returnedQuantity: 5 } // Only 1 remaining!
        ]
      });
    } catch (err) {
      exceedReturnBlocked = true;
    }
    assert("12. Rejects goods return exceeding outstanding returnable quantity", exceedReturnBlocked);

    // ------------------------------------------------------------------------
    // 9. RETURN INSPECTION RECORDING
    // ------------------------------------------------------------------------
    const latestTx = partialReturnChallan.returnTransactions[0];
    const inspectedChallan = await recordReturnInspection(tenantA, finalizedChallan.id, latestTx.id, {
      inspectionDate: "2026-10-26",
      inspector: "QA Engineer Selvam",
      acceptedQty: 1,
      damagedQty: 0,
      incompleteQty: 0,
      rejectedQty: 0,
      disposition: "Accepted into inventory",
      notes: "Calibration verified within standard tolerance"
    });

    assert("13. Return inspection recorded with disposition outcome", 
      inspectedChallan.returnTransactions[0].inspection !== null &&
      inspectedChallan.returnTransactions[0].inspection.disposition === "Accepted into inventory"
    );

    // ------------------------------------------------------------------------
    // 10. FINAL RETURN COMPLETES RETURNABLE CYCLE TO RETURNED
    // ------------------------------------------------------------------------
    const fullyReturnedChallan = await recordGoodsReturn(tenantA, finalizedChallan.id, {
      returnDate: "2026-10-28",
      receivedBy: "Inspector Anand",
      returnLocation: "Inspection Bay 1",
      condition: "Good",
      reason: "Job finished",
      items: [
        { serialNumber: 2, name: "Vibration Testing Meter", returnedQuantity: 1, condition: "Good" }
      ]
    });

    assert("14. Final return transitions return status to Returned", 
      fullyReturnedChallan.returnStatus === RETURN_STATUSES.RETURNED
    );

    // ------------------------------------------------------------------------
    // 11. DYNAMIC OVERDUE CALCULATION
    // ------------------------------------------------------------------------
    const overdueChallan = await createChallan(tenantA, {
      challanNumber: "DC-OVERDUE-001",
      date: "2026-09-01",
      status: "Finalized",
      challanType: "Returnable Challan",
      returnable: {
        isReturnable: true,
        expectedReturnDate: "2026-09-15" // Past date!
      },
      customerDetails: { name: "Overdue Client Pvt Ltd" },
      items: [
        { name: "Heavy Spindle Tool", quantity: 1, isReturnable: true, returnableQty: 1, returnedQty: 0 }
      ]
    });

    const overdueStatus = computeChallanReturnStatus(overdueChallan);
    assert("15. Past expected return date with outstanding items marks Overdue", 
      overdueStatus === RETURN_STATUSES.OVERDUE
    );

    // ------------------------------------------------------------------------
    // 12. CANCELLED CHALLANS PREVENT DISPATCH & DELIVERY
    // ------------------------------------------------------------------------
    const cancelledChallan = await createChallan(tenantA, {
      challanNumber: "DC-CANCEL-001",
      date: "2026-10-23",
      status: "Cancelled",
      customerDetails: { name: "Cancelled Corp" },
      items: [{ name: "Steel Plate", quantity: 5 }]
    });

    let cancelDispatchBlocked = false;
    try {
      await recordDispatch(tenantA, cancelledChallan.id, { dispatchDate: "2026-10-23" });
    } catch (err) {
      cancelDispatchBlocked = true;
    }
    assert("16. Cancelled challan cannot be dispatched", cancelDispatchBlocked);

    let cancelDeliveryBlocked = false;
    try {
      await recordDeliveryConfirmation(tenantA, cancelledChallan.id, {
        deliveredDate: "2026-10-23",
        receiverName: "Anyone",
        itemDeliveries: [{ name: "Steel Plate", deliveredQuantity: 5 }]
      });
    } catch (err) {
      cancelDeliveryBlocked = true;
    }
    assert("17. Cancelled challan cannot be confirmed as delivered", cancelDeliveryBlocked);

    // ------------------------------------------------------------------------
    // 13. STATISTICAL AGGREGATION
    // ------------------------------------------------------------------------
    const deliveryStats = await getDeliveryStats(tenantA);
    assert("18. getDeliveryStats aggregates deliveries by category", 
      deliveryStats.total >= 4 && deliveryStats.delivered >= 1 && deliveryStats.cancelled >= 1
    );

    const returnableStats = await getReturnableStats(tenantA);
    assert("19. getReturnableStats aggregates returnable metrics", 
      returnableStats.totalReturnableChallans >= 2 && returnableStats.overdue >= 1
    );

    const returnableItems = await getReturnableItemsList(tenantA);
    assert("20. getReturnableItemsList returns flattened tracking items", 
      returnableItems.length >= 2 && returnableItems.some(i => i.productName === "Vibration Testing Meter")
    );

    // ------------------------------------------------------------------------
    // 14. MULTI-TENANT ISOLATION
    // ------------------------------------------------------------------------
    const tenantBStats = await getDeliveryStats(tenantB);
    const tenantBItems = await getReturnableItemsList(tenantB);
    assert("21. Tenant B cannot see Tenant A's delivery or return statistics", 
      tenantBStats.total === 0 && tenantBItems.length === 0
    );

  } catch (err) {
    console.error("Test execution exception:", err);
    results.push({ name: "Execution Exception", passed: false, extra: err.message });
  }

  const passedCount = results.filter(r => r.passed).length;
  console.log(`\nDelivery & Returnable Tests Completed: ${passedCount} / ${results.length} PASSED\n`);
  return results;
}
