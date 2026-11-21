import {
  createChallan,
  saveCustomer,
  saveProduct,
  saveWarehouse,
  recordGoodsReceipt,
  recordDispatch,
  recordDeliveryConfirmation,
  getDashboardAnalytics,
  getReportData,
  DATE_PRESETS,
  getDateRangeBounds,
  calcPercentageChange,
  sanitizeCSVCell,
  generateCSVString,
  STORAGE_KEYS
} from '../utils/tenantStorage.js';

export async function runDashboardReportsTests() {
  console.log('\n=======================================================');
  console.log(' STARTING DASHBOARD & REPORTS MODULE VERIFICATION');
  console.log('=======================================================\n');

  const results = [];
  const tenantA = 'tenant_dash_test_a';
  const tenantB = 'tenant_dash_test_b';

  const assert = (name, condition, extra = '') => {
    if (condition) {
      console.log(`  ✓ ${name}`);
      results.push({ name, passed: true });
    } else {
      console.error(`  ✗ ${name} ${extra ? `(${extra})` : ''}`);
      results.push({ name, passed: false, extra });
    }
  };

  try {
    // Clean up test tenants
    for (const key of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(`nayaruvi_${tenantA}_${key}`);
      localStorage.removeItem(`nayaruvi_${tenantB}_${key}`);
    }

    // ------------------------------------------------------------------------
    // TEST 1: Date Range Boundary Calculation & Presets
    // ------------------------------------------------------------------------
    const todayBounds = getDateRangeBounds(DATE_PRESETS.TODAY);
    assert(
      '1. Today preset computes identical start and end date with yesterday as comparison',
      todayBounds.startDate === todayBounds.endDate && todayBounds.prevStartDate === todayBounds.prevEndDate,
      `start=${todayBounds.startDate}, prev=${todayBounds.prevStartDate}`
    );

    const monthBounds = getDateRangeBounds(DATE_PRESETS.THIS_MONTH);
    assert(
      '2. This Month preset starts on the 1st of the current month',
      monthBounds.startDate.endsWith('-01'),
      `startDate: ${monthBounds.startDate}`
    );

    const customBounds = getDateRangeBounds(DATE_PRESETS.CUSTOM, '2026-10-01', '2026-10-10');
    assert(
      '3. Custom date range calculates 10-day span and matching 10-day preceding comparison window',
      customBounds.startDate === '2026-10-01' && customBounds.endDate === '2026-10-10' &&
      customBounds.prevEndDate === '2026-09-30' && customBounds.prevStartDate === '2026-09-21',
      `prevStart=${customBounds.prevStartDate}, prevEnd=${customBounds.prevEndDate}`
    );

    // ------------------------------------------------------------------------
    // TEST 2: Percentage Change Calculation Edge Cases
    // ------------------------------------------------------------------------
    assert(
      '4. Percentage change handles 0 -> 10 without Infinity or NaN (returns 100)',
      calcPercentageChange(10, 0) === 100
    );
    assert(
      '5. Percentage change handles 0 -> 0 as 0%',
      calcPercentageChange(0, 0) === 0
    );
    assert(
      '6. Percentage change handles 20 -> 30 as +50%',
      calcPercentageChange(30, 20) === 50
    );
    assert(
      '7. Percentage change handles 40 -> 20 as -50%',
      calcPercentageChange(20, 40) === -50
    );

    // ------------------------------------------------------------------------
    // TEST 3: Formula Injection Sanitization in CSV
    // ------------------------------------------------------------------------
    assert(
      '8. Formula injection character "=" is prepended with single quote',
      sanitizeCSVCell('=SUM(A1:A10)') === "'=SUM(A1:A10)"
    );
    assert(
      '9. Formula injection character "+" is prepended with single quote',
      sanitizeCSVCell('+123456') === "'+123456"
    );
    assert(
      '10. Formula injection character "-" is prepended with single quote',
      sanitizeCSVCell('-cmd|') === "'-cmd|"
    );
    assert(
      '11. Formula injection character "@" is prepended with single quote',
      sanitizeCSVCell('@IMPORT') === "'@IMPORT"
    );
    assert(
      '12. Normal string with comma is cleanly wrapped in double quotes',
      sanitizeCSVCell('Nagarajan, Chennai') === '"Nagarajan, Chennai"'
    );

    const csvOutput = generateCSVString(
      [{ key: 'name', label: 'Customer' }, { key: 'total', label: 'Qty' }],
      [{ name: '=DANGEROUS()', total: 10 }, { name: 'Acme Corp, Ltd', total: 20 }]
    );
    assert(
      '13. Full CSV string generated safely with header and escaped rows',
      csvOutput.includes("'=DANGEROUS()") && csvOutput.includes('"Acme Corp, Ltd"')
    );

    // ------------------------------------------------------------------------
    // SETUP TENANT A DATA: Warehouse, Products, Customers, Challans
    // ------------------------------------------------------------------------
    const wh = await saveWarehouse(tenantA, {
      name: 'Main Chennai Warehouse',
      type: 'Main Warehouse',
      city: 'Chennai',
      isDefault: true
    });

    const p1 = await saveProduct(tenantA, {
      name: 'Industrial Valve 50mm',
      unit: 'NOS',
      reorderLevel: 10,
      price: 2500
    });

    const p2 = await saveProduct(tenantA, {
      name: 'Copper Electrical Cable',
      unit: 'MTR',
      reorderLevel: 50,
      price: 120
    });

    // Inward stock via goods receipt
    await recordGoodsReceipt(tenantA, {
      destinationWarehouseId: wh.id,
      receiptDate: '2026-10-01',
      items: [
        { productId: p1.id, productName: p1.name, quantity: 30, unit: 'NOS' },
        { productId: p2.id, productName: p2.name, quantity: 200, unit: 'MTR' }
      ]
    });

    const cust1 = await saveCustomer(tenantA, {
      name: 'Tata Steel Processing Ltd',
      city: 'Jamshedpur',
      customerCode: 'CUS-TATA'
    });

    // Create 3 Challans in Tenant A:
    // DC 1: Standard Dispatched & Delivered in current month
    const dc1 = await createChallan(tenantA, {
      challanNumber: 'DC-DASH-001',
      date: '2026-10-10',
      customerId: cust1.id,
      customerDetails: cust1,
      warehouseId: wh.id,
      status: 'Finalized',
      products: [{ productId: p1.id, name: p1.name, quantity: 5, unit: 'NOS', rate: 2500 }],
      transportDetails: {
        vehicleNumber: 'TN-01-AB-1234',
        transporterName: 'VRL Logistics',
        expectedDeliveryDate: '2026-10-12'
      }
    });

    // Dispatch DC 1
    await recordDispatch(tenantA, dc1.id, {
      dispatchDate: '2026-10-10',
      warehouseId: wh.id
    });
    // Mark DC 1 Delivered
    await recordDeliveryConfirmation(tenantA, dc1.id, {
      deliveredDate: '2026-10-12',
      receiverName: 'Ramesh'
    });

    // DC 2: Returnable Challan - Dispatched, OVERDUE delivery, and pending return
    const dc2 = await createChallan(tenantA, {
      challanNumber: 'DC-DASH-002',
      date: '2026-10-05',
      customerId: cust1.id,
      customerDetails: cust1,
      warehouseId: wh.id,
      status: 'Finalized',
      challanType: 'Returnable Challan',
      returnable: {
        isReturnable: true,
        expectedReturnDate: '2026-10-15',
        returnReason: 'Testing and Calibration'
      },
      products: [{ productId: p1.id, name: p1.name, quantity: 2, unit: 'NOS', returnableQty: 2, rate: 2500 }],
      transportDetails: {
        vehicleNumber: 'TN-02-CD-5678',
        transporterName: 'Blue Dart',
        expectedDeliveryDate: '2026-10-08' // Past date -> OVERDUE delivery!
      }
    });

    await recordDispatch(tenantA, dc2.id, {
      dispatchDate: '2026-10-05',
      warehouseId: wh.id
    });

    // DC 3: Draft Challan
    await createChallan(tenantA, {
      challanNumber: 'DC-DASH-003',
      date: '2026-10-20',
      customerId: cust1.id,
      customerDetails: cust1,
      warehouseId: wh.id,
      status: 'Draft',
      products: [{ productId: p2.id, name: p2.name, quantity: 50, unit: 'MTR', rate: 120 }]
    });

    // ------------------------------------------------------------------------
    // TEST 4: getDashboardAnalytics on Tenant A
    // ------------------------------------------------------------------------
    const dashAnalytics = await getDashboardAnalytics(tenantA, {
      preset: DATE_PRESETS.CUSTOM,
      startDate: '2026-10-01',
      endDate: '2026-10-31'
    });

    assert(
      '14. KPI 1: Total period challans correctly counts all 3 challans',
      dashAnalytics.kpi.totalChallans === 3,
      `totalChallans=${dashAnalytics.kpi.totalChallans}`
    );

    assert(
      '15. KPI 2: Pending deliveries counts DC 2 (dispatched & not delivered)',
      dashAnalytics.kpi.pendingDeliveries === 1,
      `pendingDeliveries=${dashAnalytics.kpi.pendingDeliveries}`
    );

    assert(
      '16. KPI 3: Delivered challans counts DC 1',
      dashAnalytics.kpi.deliveredChallans === 1,
      `deliveredChallans=${dashAnalytics.kpi.deliveredChallans}`
    );

    assert(
      '17. KPI 4: Overdue deliveries identifies DC 2 past expectedDeliveryDate 2026-10-08',
      dashAnalytics.kpi.overdueDeliveries === 1,
      `overdueDeliveries=${dashAnalytics.kpi.overdueDeliveries}`
    );

    assert(
      '18. KPI 5: Outstanding returnables identifies DC 2 with 2 NOS pending return',
      dashAnalytics.kpi.outstandingReturnablesCount === 1 &&
      dashAnalytics.kpi.pendingReturnUnits.some(u => u.unit === 'NOS' && u.quantity === 2),
      `units=${JSON.stringify(dashAnalytics.kpi.pendingReturnUnits)}`
    );

    assert(
      '19. KPI 6: Compatible unit balances keeps NOS (23) and MTR (200) distinct without invalid sum',
      dashAnalytics.kpi.stockByUnit.some(u => u.unit === 'NOS' && u.quantity === 23) &&
      dashAnalytics.kpi.stockByUnit.some(u => u.unit === 'MTR' && u.quantity === 200),
      `stockByUnit=${JSON.stringify(dashAnalytics.kpi.stockByUnit)}`
    );

    assert(
      '20. KPI 7: Active customers reports 1 registered customer',
      dashAnalytics.kpi.activeCustomers === 1
    );

    assert(
      '21. Status distribution categorizes Draft (1), Dispatched (1), and Delivered (1)',
      dashAnalytics.statusDistribution.find(s => s.status === 'Draft')?.count === 1 &&
      dashAnalytics.statusDistribution.find(s => s.status === 'Dispatched / In Transit')?.count === 1 &&
      dashAnalytics.statusDistribution.find(s => s.status === 'Delivered')?.count === 1
    );

    assert(
      '22. Actionable Alerts detects Overdue Deliveries and Overdue Returns',
      dashAnalytics.alerts.some(a => a.id === 'alert_overdue_deliveries') &&
      dashAnalytics.alerts.some(a => a.id === 'alert_overdue_returns')
    );

    // ------------------------------------------------------------------------
    // TEST 5: getReportData Categories
    // ------------------------------------------------------------------------
    const challanRegReport = await getReportData(tenantA, 'challan_register', {
      startDate: '2026-10-01',
      endDate: '2026-10-31'
    });
    assert(
      '23. Challan Register report returns all 3 challans with formatted columns',
      challanRegReport.rows.length === 3 && challanRegReport.columns.length > 0
    );

    const pendingDelReport = await getReportData(tenantA, 'pending_deliveries');
    assert(
      '24. Pending Deliveries report returns DC 2 with days in transit calculated',
      pendingDelReport.rows.length === 1 && pendingDelReport.rows[0].challanNumber === 'DC-DASH-002'
    );

    const agingReport = await getReportData(tenantA, 'returnable_aging');
    assert(
      '25. Returnable Aging report buckets overdue items into aging categories',
      agingReport.rows.length === 4 && agingReport.rows.some(r => r.itemCount > 0)
    );

    const stockSummaryReport = await getReportData(tenantA, 'current_stock_summary');
    assert(
      '26. Current Stock Summary report lists both products with on-hand balances',
      stockSummaryReport.rows.length === 2
    );

    // ------------------------------------------------------------------------
    // TEST 6: Strict Multi-Tenant Data Isolation
    // ------------------------------------------------------------------------
    const tenantBAnalytics = await getDashboardAnalytics(tenantB, {
      startDate: '2026-10-01',
      endDate: '2026-10-31'
    });
    assert(
      '27. Tenant B has 0 challans in dashboard analytics (Strict Isolation from Tenant A)',
      tenantBAnalytics.kpi.totalChallans === 0 && tenantBAnalytics.kpi.deliveredChallans === 0
    );

    const tenantBStockReport = await getReportData(tenantB, 'current_stock_summary');
    assert(
      '28. Tenant B has 0 stock records in reports (Strict Isolation from Tenant A)',
      tenantBStockReport.rows.length === 0
    );

  } catch (err) {
    console.error('FATAL ERROR IN DASHBOARD & REPORTS TESTS:', err);
    results.push({ name: 'Execution Error', passed: false, extra: err.message });
  }

  const passed = results.filter(r => r.passed).length;
  console.log(`\nDashboard & Reports: ${passed} / ${results.length} PASSED\n`);
  return results;
}
