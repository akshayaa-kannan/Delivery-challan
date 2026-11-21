import {
  saveWarehouse,
  getWarehouses,
  getWarehouseById,
  deleteWarehouse,
  updateWarehouseStatus,
  recordOpeningStock,
  recordInventoryMovement,
  getInventoryMovements,
  calculateCurrentBalance,
  recordStockAdjustment,
  getStockAdjustments,
  createWarehouseTransfer,
  dispatchWarehouseTransfer,
  receiveWarehouseTransfer,
  getWarehouseTransfers,
  recordGoodsReceipt,
  getStockBalances,
  getInventorySummary,
  createChallan,
  recordDispatch,
  recordGoodsReturn,
  recordReturnInspection,
  updateChallan,
  saveProduct,
  MOVEMENT_TYPES,
  TRANSFER_STATUSES
} from '../utils/tenantStorage.js';

export async function runInventoryWarehouseTests() {
  console.log("\n=======================================================");
  console.log(" STARTING INVENTORY & WAREHOUSE MANAGEMENT VERIFICATION");
  console.log("=======================================================\n");

  const results = [];
  const assert = (desc, condition) => {
    if (condition) {
      console.log(`  ✓ ${desc}`);
      results.push({ desc, passed: true });
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      results.push({ desc, passed: false });
    }
  };

  const tenantA = "comp_test_inv_a_" + Date.now();
  const tenantB = "comp_test_inv_b_" + Date.now();
  const testUser = { uid: "usr_inv_tester", displayName: "Inv Tester", email: "tester@nayaruvi.in" };

  try {
    // ------------------------------------------------------------------------
    // 1. WAREHOUSE DIRECTORY & RULES
    // ------------------------------------------------------------------------
    // Case 1: Create primary warehouse
    const wh1 = await saveWarehouse(tenantA, {
      name: "Chennai Central Hub",
      warehouseType: "Main Warehouse",
      city: "Chennai",
      state: "Tamil Nadu",
      pinCode: "600001",
      contactPerson: "K. Rajan",
      phone: "9840112233",
      isDefault: true
    });
    assert("1. Create primary warehouse with WH-0001 code", wh1.warehouseCode === "WH-0001" && wh1.isDefault === true);

    // Case 2: Create second warehouse
    const wh2 = await saveWarehouse(tenantA, {
      name: "Sriperumbudur Factory Unit",
      warehouseType: "Factory",
      city: "Sriperumbudur",
      state: "Tamil Nadu",
      pinCode: "602105",
      contactPerson: "M. Selvam",
      phone: "9840445566",
      isDefault: false
    });
    assert("2. Create second warehouse with sequential WH-0002 code", wh2.warehouseCode === "WH-0002" && wh2.isDefault === false);

    // Case 3: Reject duplicate warehouse code in same tenant
    let dupCodeBlocked = false;
    try {
      await saveWarehouse(tenantA, {
        name: "Duplicate WH",
        warehouseCode: "WH-0001"
      });
    } catch (err) {
      dupCodeBlocked = true;
    }
    assert("3. Reject duplicate warehouse code in same workspace", dupCodeBlocked);

    // Case 4: Toggle warehouse status
    await updateWarehouseStatus(tenantA, wh2.id, "Inactive");
    const inactiveWh = await getWarehouseById(tenantA, wh2.id);
    assert("4. Deactivate warehouse status toggles to Inactive", inactiveWh.status === "Inactive");
    await updateWarehouseStatus(tenantA, wh2.id, "Active");

    // ------------------------------------------------------------------------
    // 2. PRODUCT CREATION & OPENING STOCK
    // ------------------------------------------------------------------------
    const prod1 = await saveProduct(tenantA, {
      name: "Solar Inverter 5kVA",
      category: "Power Equipment",
      unit: "NOS",
      rate: 45000,
      reorderLevel: 5,
      minStock: 2
    });

    const prod2 = await saveProduct(tenantA, {
      name: "Copper Grounding Cable",
      category: "Electricals",
      unit: "MTR",
      rate: 180,
      reorderLevel: 100,
      minStock: 50
    });

    // Case 5: Record opening stock
    const openMov = await recordOpeningStock(tenantA, {
      productId: prod1.id,
      productName: prod1.name,
      warehouseId: wh1.id,
      quantity: 20,
      unit: "NOS",
      reason: "Initial financial year opening stock"
    }, testUser);

    assert("5. Record opening stock posts movement into ledger", openMov.movementType === MOVEMENT_TYPES.OPENING_STOCK && openMov.newBalance === 20);

    // Case 6: Block duplicate opening stock initialization
    let dupOpeningBlocked = false;
    try {
      await recordOpeningStock(tenantA, {
        productId: prod1.id,
        warehouseId: wh1.id,
        quantity: 15,
        unit: "NOS"
      }, testUser);
    } catch (err) {
      dupOpeningBlocked = true;
    }
    assert("6. Block duplicate opening stock entry for same product & warehouse", dupOpeningBlocked);

    // ------------------------------------------------------------------------
    // 3. GOODS RECEIPT & STOCK ADJUSTMENTS
    // ------------------------------------------------------------------------
    // Case 7: Record goods receipt (GRN)
    const grn = await recordGoodsReceipt(tenantA, {
      destinationWarehouseId: wh1.id,
      supplierName: "Apex Solar Components Pvt Ltd",
      referenceNumber: "PO-2026-990",
      receiptDate: "2026-10-24",
      items: [
        { productId: prod1.id, productName: prod1.name, quantity: 10, unit: "NOS" },
        { productId: prod2.id, productName: prod2.name, quantity: 500, unit: "MTR" }
      ]
    }, testUser);

    const balAfterGrn = calculateCurrentBalance(tenantA, prod1.id, wh1.id);
    assert("7. Goods Receipt increases on-hand balance to 30 NOS", grn.receiptNumber === "GRN-0001" && balAfterGrn === 30);

    // Case 8: Positive adjustment
    const posAdj = await recordStockAdjustment(tenantA, {
      productId: prod1.id,
      warehouseId: wh1.id,
      quantity: 2,
      unit: "NOS",
      adjustmentType: "Positive Adjustment",
      reason: "Surplus found during quarterly bin audit"
    }, testUser);
    assert("8. Positive adjustment increases stock to 32 NOS", posAdj.afterQuantity === 32);

    // Case 9: Negative adjustment with required reason
    const negAdj = await recordStockAdjustment(tenantA, {
      productId: prod1.id,
      warehouseId: wh1.id,
      quantity: 1,
      unit: "NOS",
      adjustmentType: "Damaged Stock",
      reason: "Water droplet damage on casing during monsoon inspection"
    }, testUser);
    assert("9. Negative adjustment records reason and decreases stock to 31 NOS", negAdj.afterQuantity === 31 && negAdj.reason.includes("Water droplet"));

    // Case 10: Reject negative stock by default
    let negStockBlocked = false;
    try {
      await recordStockAdjustment(tenantA, {
        productId: prod1.id,
        warehouseId: wh1.id,
        quantity: 100,
        unit: "NOS",
        adjustmentType: "Negative Adjustment",
        reason: "Oversized reduction attempt"
      }, testUser);
    } catch (err) {
      negStockBlocked = true;
    }
    assert("10. Reject negative stock under default non-negative policy", negStockBlocked);

    // ------------------------------------------------------------------------
    // 4. DELIVERY CHALLAN INTEGRATION
    // ------------------------------------------------------------------------
    // Case 11: Draft challan does not deduct stock
    const draftChallan = await createChallan(tenantA, {
      challanNumber: "DC-INV-001",
      status: "Draft",
      warehouseId: wh1.id,
      products: [
        { productId: prod1.id, name: prod1.name, quantity: 5, unit: "NOS" }
      ]
    }, testUser);
    const balDuringDraft = calculateCurrentBalance(tenantA, prod1.id, wh1.id);
    assert("11. Draft challan does not deduct warehouse stock", balDuringDraft === 31);

    // Case 12: Finalized challan does not prematurely deduct stock
    await updateChallan(tenantA, draftChallan.id, { status: "Active" }, testUser);
    const balDuringFinalized = calculateCurrentBalance(tenantA, prod1.id, wh1.id);
    assert("12. Finalized challan does not prematurely deduct stock before dispatch", balDuringFinalized === 31);

    // Case 13: Dispatch deducts stock from selected warehouse
    await recordDispatch(tenantA, draftChallan.id, {
      warehouseId: wh1.id,
      dispatchDate: "2026-10-24",
      vehicleNumber: "TN 09 AB 1234"
    }, testUser);
    const balAfterDispatch = calculateCurrentBalance(tenantA, prod1.id, wh1.id);
    assert("13. Dispatch records stock issue reducing balance to 26 NOS", balAfterDispatch === 26);

    // Case 14: Duplicate dispatch call prevents double deduction
    await recordDispatch(tenantA, draftChallan.id, {
      warehouseId: wh1.id,
      dispatchDate: "2026-10-24"
    }, testUser);
    const balAfterDupDispatch = calculateCurrentBalance(tenantA, prod1.id, wh1.id);
    assert("14. Duplicate dispatch request does not duplicate deduction", balAfterDupDispatch === 26);

    // Case 15: Post-dispatch cancellation safely reverses stock
    await updateChallan(tenantA, draftChallan.id, { status: "Cancelled" }, testUser);
    const balAfterCancel = calculateCurrentBalance(tenantA, prod1.id, wh1.id);
    assert("15. Post-dispatch challan cancellation records stock reversal back to 31 NOS", balAfterCancel === 31);

    // ------------------------------------------------------------------------
    // 5. MULTI-WAREHOUSE TRANSFERS
    // ------------------------------------------------------------------------
    // Case 16: Create warehouse transfer between WH 1 and WH 2
    const transfer = await createWarehouseTransfer(tenantA, {
      sourceWarehouseId: wh1.id,
      destinationWarehouseId: wh2.id,
      items: [
        { productId: prod1.id, productName: prod1.name, requestedQuantity: 6, unit: "NOS" }
      ],
      notes: "Stock rebalance to factory warehouse"
    }, testUser);
    assert("16. Create transfer in Draft state with TRF-0001", transfer.transferNumber === "TRF-0001" && transfer.status === TRANSFER_STATUSES.DRAFT);

    // Case 17: Dispatch transfer: source on-hand decreases, in-transit increases
    const dispatchedTransfer = await dispatchWarehouseTransfer(tenantA, transfer.id, testUser);
    const wh1BalAfterTransferDispatch = calculateCurrentBalance(tenantA, prod1.id, wh1.id);
    const balancesWhileInTransit = await getStockBalances(tenantA, { warehouseId: wh2.id, productId: prod1.id });
    const inTransitQty = balancesWhileInTransit[0]?.inTransitQuantity || 0;

    assert("17. Transfer dispatch decreases source stock to 25 NOS & registers 6 NOS in transit", 
      wh1BalAfterTransferDispatch === 25 && inTransitQty === 6 && dispatchedTransfer.status === TRANSFER_STATUSES.IN_TRANSIT
    );

    // Case 18: Destination stock receipt
    const receivedTransfer = await receiveWarehouseTransfer(tenantA, transfer.id, {
      receiptDate: "2026-10-24",
      items: [
        { productId: prod1.id, receivedQuantity: 6, condition: "Good" }
      ]
    }, testUser);
    const wh2BalAfterReceipt = calculateCurrentBalance(tenantA, prod1.id, wh2.id);
    const balancesAfterReceipt = await getStockBalances(tenantA, { warehouseId: wh2.id, productId: prod1.id });

    assert("18. Transfer receipt increases destination stock to 6 NOS and clears in-transit",
      wh2BalAfterReceipt === 6 && balancesAfterReceipt[0]?.inTransitQuantity === 0 && receivedTransfer.status === TRANSFER_STATUSES.RECEIVED
    );

    // ------------------------------------------------------------------------
    // 6. RETURNABLE GOODS INTEGRATION
    // ------------------------------------------------------------------------
    // Case 19: Uninspected goods return does not add to usable stock
    const returnChallan = await createChallan(tenantA, {
      challanNumber: "DC-RET-001",
      status: "Active",
      warehouseId: wh1.id,
      products: [
        { productId: prod1.id, name: prod1.name, quantity: 4, unit: "NOS", isReturnable: true, returnableQty: 4 }
      ]
    }, testUser);
    await recordDispatch(tenantA, returnChallan.id, { warehouseId: wh1.id }, testUser); // 25 -> 21

    const returnTx = await recordGoodsReturn(tenantA, returnChallan.id, {
      returnDate: "2026-10-24",
      items: [
        { productId: prod1.id, name: prod1.name, returnedQuantity: 4 }
      ]
    }, testUser);

    const balUninspected = calculateCurrentBalance(tenantA, prod1.id, wh1.id);
    assert("19. Uninspected returned goods do not enter usable inventory (balance remains 21 NOS)", balUninspected === 21);

    // Case 20: Inspection with accepted goods credits usable stock; damaged goods excluded
    const txId = returnTx.returnTransactions[0].id;
    await recordReturnInspection(tenantA, returnChallan.id, txId, {
      inspectionDate: "2026-10-24",
      acceptedQty: 3,
      damagedQty: 1,
      disposition: "Accepted into inventory"
    }, testUser);

    const balAfterInspection = calculateCurrentBalance(tenantA, prod1.id, wh1.id);
    assert("20. Only accepted goods (3 NOS) are credited to usable stock (balance becomes 24 NOS, damaged 1 NOS excluded)", balAfterInspection === 24);

    // ------------------------------------------------------------------------
    // 7. INVENTORY DASHBOARD, SUMMARY & COMPATIBLE UNITS
    // ------------------------------------------------------------------------
    // Case 21: Compatible units aggregation
    const summary = await getInventorySummary(tenantA);
    const nosGroup = summary.stockByUnit.find(u => u.unit === "NOS");
    const mtrGroup = summary.stockByUnit.find(u => u.unit === "MTR");

    assert("21. Summary aggregates compatible units separately (NOS vs MTR, never summing into combined nonsense)",
      nosGroup && nosGroup.quantity === 30 && mtrGroup && mtrGroup.quantity === 500
    );

    // Case 22: Safe warehouse deletion blocking
    const delResult = await deleteWarehouse(tenantA, wh1.id);
    assert("22. Safely block deleting warehouse with historical ledger transactions",
      delResult.success === false && delResult.reason === "referenced_by_movements"
    );

    // ------------------------------------------------------------------------
    // 8. MULTI-TENANT ISOLATION
    // ------------------------------------------------------------------------
    // Case 23: Tenant B cannot access Tenant A warehouses or stock
    const tenantBWarehouses = await getWarehouses(tenantB);
    const tenantBBalances = await getStockBalances(tenantB);
    const tenantBMovements = await getInventoryMovements(tenantB);

    assert("23. Tenant B has strict data isolation from Tenant A warehouses and ledger",
      tenantBWarehouses.length === 0 && tenantBBalances.length === 0 && tenantBMovements.length === 0
    );

    // Case 24: Reconcile current balances against ledger
    const allMovements = await getInventoryMovements(tenantA, { productId: prod1.id, warehouseId: wh1.id });
    const computedSum = allMovements.reduce((acc, m) => m.movementDirection === "IN" ? acc + m.quantity : acc - m.quantity, 0);
    const liveBal = calculateCurrentBalance(tenantA, prod1.id, wh1.id);

    assert("24. Total current balance exactly reconciles with historical movement ledger sum (24 NOS)",
      Math.abs(computedSum - liveBal) < 0.0001 && liveBal === 24
    );

  } catch (err) {
    console.error("Test execution exception:", err);
    assert("Execution completed without uncaught exceptions", false);
  }

  const passed = results.filter(r => r.passed).length;
  console.log(`\nInventory & Warehouse Tests Completed: ${passed} / ${results.length} PASSED\n`);
  return results;
}
