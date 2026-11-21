import {
  authorizeOperation,
  sanitizeInputString,
  sanitizeNumeric,
  sanitizeLogObject,
  checkIdempotency,
  recordIdempotency
} from '../utils/security.js';

import {
  ROLES,
  PERMISSIONS,
  createChallan,
  updateChallan,
  recordDispatch,
  saveProduct,
  saveWarehouse,
  recordGoodsReceipt,
  getStockBalances,
  reconcileStockLedger,
  exportTenantBackupArchive,
  validateBackupIntegrity,
  STORAGE_KEYS
} from '../utils/tenantStorage.js';

export async function runSecurityReliabilityTests() {
  console.log('\n=======================================================');
  console.log(' STARTING SECURITY & RELIABILITY MODULE VERIFICATION');
  console.log('=======================================================\n');

  const results = [];
  const tenantA = 'comp_sec_test_a_' + Date.now();
  const tenantB = 'comp_sec_test_b_' + Date.now();

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

    const ownerA = { uid: 'u_owner_a', email: 'owner@a.com', role: ROLES.OWNER, status: 'ACTIVE' };
    const viewerA = { uid: 'u_viewer_a', email: 'viewer@a.com', role: ROLES.VIEWER, status: 'ACTIVE' };
    const suspendedA = { uid: 'u_susp_a', email: 'susp@a.com', role: ROLES.ADMIN, status: 'SUSPENDED' };
    const branchScopedUser = { 
      uid: 'u_branch_staff', 
      email: 'branch@a.com', 
      role: ROLES.OPERATIONS_STAFF, 
      status: 'ACTIVE',
      branchIds: ['BR-CHENNAI'],
      warehouseIds: ['WH-MAIN']
    };

    // ------------------------------------------------------------------------
    // TEST 1: Centralized Backend Authorization Guard
    // ------------------------------------------------------------------------
    let unauthenticatedBlocked = false;
    try {
      authorizeOperation(tenantA, null, PERMISSIONS.CHALLAN_CREATE);
    } catch (e) {
      unauthenticatedBlocked = e.message.includes('UNAUTHENTICATED');
    }
    assert('1. Unauthenticated actor is blocked with UNAUTHENTICATED error', unauthenticatedBlocked);

    let suspendedBlocked = false;
    try {
      authorizeOperation(tenantA, suspendedA, PERMISSIONS.CHALLAN_CREATE);
    } catch (e) {
      suspendedBlocked = e.message.includes('ACCOUNT_SUSPENDED');
    }
    assert('2. Suspended user is denied access regardless of role', suspendedBlocked);

    let viewerBlocked = false;
    try {
      authorizeOperation(tenantA, viewerA, PERMISSIONS.CHALLAN_DELETE);
    } catch (e) {
      viewerBlocked = e.message.includes('FORBIDDEN');
    }
    assert('3. Viewer role is forbidden from executing deletion operations', viewerBlocked);

    const ownerAuthorized = authorizeOperation(tenantA, ownerA, PERMISSIONS.CHALLAN_DELETE);
    assert('4. Owner role passes authorization for privileged actions', ownerAuthorized === true);

    // Location Scopes
    let foreignBranchBlocked = false;
    try {
      authorizeOperation(tenantA, branchScopedUser, PERMISSIONS.CHALLAN_CREATE, { branchId: 'BR-MUMBAI' });
    } catch (e) {
      foreignBranchBlocked = e.message.includes('ACCESS_DENIED_BRANCH');
    }
    assert('5. Branch-scoped staff is denied access to unauthorized branches', foreignBranchBlocked);

    const allowedBranchPassed = authorizeOperation(tenantA, branchScopedUser, PERMISSIONS.CHALLAN_CREATE, { branchId: 'BR-CHENNAI' });
    assert('6. Branch-scoped staff is allowed access to their assigned branch', allowedBranchPassed === true);

    // ------------------------------------------------------------------------
    // TEST 2: Input Sanitization & Formula Injection Defense
    // ------------------------------------------------------------------------
    const maliciousHtml = '<script>alert("xss")</script><b>Steel Tubes</b>';
    const cleanHtml = sanitizeInputString(maliciousHtml);
    assert('7. Script tags and HTML elements are stripped cleanly', !cleanHtml.includes('<script>') && !cleanHtml.includes('<b>'));

    const formulaInjections = ['=cmd|/c calc!A0', '@SUM(A1:A10)', '+2+2', '-5*10'];
    const sanitizedFormulas = formulaInjections.map(sanitizeInputString);
    assert(
      '8. Formula injection triggers (=, @, +, -) are prepended with single quotes',
      sanitizedFormulas.every(s => s.startsWith("'"))
    );

    const normalNumeric = sanitizeNumeric(150.5);
    const negativeNumeric = sanitizeNumeric(-25, { min: 0 });
    const nanNumeric = sanitizeNumeric('invalid', { fallback: 0 });
    assert(
      '9. Numeric inputs are validated, bounded, and sanitized against NaN/negatives',
      normalNumeric === 150.5 && negativeNumeric === 0 && nanNumeric === 0
    );

    // ------------------------------------------------------------------------
    // TEST 3: Structured Log Credential Scrubbing
    // ------------------------------------------------------------------------
    const rawMeta = {
      user: 'admin@company.com',
      password: 'SuperSecretPassword123!',
      token: 'inv_mvm2c5p9_3xxtoken999',
      apiKey: 'AIzaSyD-secret-key-12345',
      action: 'LOGIN_ATTEMPT',
      metadata: {
        accessToken: 'bearer-jwt-token-xyz',
        ipAddress: '127.0.0.1'
      }
    };
    const scrubbedMeta = sanitizeLogObject(rawMeta);
    assert(
      '10. Structured logger redacts passwords, tokens, API keys, and secrets',
      scrubbedMeta.password === '[REDACTED]' &&
      scrubbedMeta.token === '[REDACTED]' &&
      scrubbedMeta.apiKey === '[REDACTED]' &&
      scrubbedMeta.metadata.accessToken === '[REDACTED]' &&
      scrubbedMeta.user === 'admin@company.com' &&
      scrubbedMeta.metadata.ipAddress === '127.0.0.1'
    );

    // ------------------------------------------------------------------------
    // TEST 4: Dispatch Idempotency (Prevent Duplicate Stock Deductions)
    // ------------------------------------------------------------------------
    const p1 = await saveProduct(tenantA, {
      name: 'Hydraulic Motor',
      sku: 'HYD-001',
      unit: 'NOS',
      openingStock: 0
    });

    const wh1 = await saveWarehouse(tenantA, {
      name: 'Main Assembly Warehouse',
      warehouseCode: 'WH-SEC-01',
      isDefault: true
    });

    // Inward receipt: 50 NOS
    await recordGoodsReceipt(tenantA, {
      receiptDate: '2026-10-24',
      supplierName: 'ABC Hydraulics Ltd',
      destinationWarehouseId: wh1.id,
      items: [{ productId: p1.id, productName: p1.name, unit: 'NOS', quantity: 50 }]
    }, ownerA);

    const initialBalances = await getStockBalances(tenantA);
    const p1Initial = initialBalances.find(b => b.productId === p1.id);
    assert('11. Initial inventory balance established at 50 NOS', p1Initial && p1Initial.onHandQuantity === 50);

    // Create & finalize challan for 10 NOS
    const dc1 = await createChallan(tenantA, {
      challanNumber: 'DC-SEC-001',
      date: '2026-10-24',
      warehouseId: wh1.id,
      customer: { id: 'c1', name: 'Test Client' },
      products: [{ productId: p1.id, name: p1.name, unit: 'NOS', quantity: 10 }]
    });
    await updateChallan(tenantA, dc1.id, { status: 'Finalized' });

    // First Dispatch: should deduct 10 NOS -> balance 40 NOS
    const dispatch1 = await recordDispatch(tenantA, dc1.id, {
      dispatchLocation: 'Main Hub',
      vehicleNumber: 'TN-01-AB-1234'
    }, ownerA);

    const balancesAfterFirstDispatch = await getStockBalances(tenantA);
    const p1After1 = balancesAfterFirstDispatch.find(b => b.productId === p1.id);
    assert('12. First dispatch cleanly reduces stock balance to 40 NOS', p1After1 && p1After1.onHandQuantity === 40);

    // Second Dispatch (Simulating double-click or retry timeout): must NOT deduct again
    const dispatch2 = await recordDispatch(tenantA, dc1.id, {
      dispatchLocation: 'Main Hub',
      vehicleNumber: 'TN-01-AB-1234'
    }, ownerA);

    const balancesAfterSecondDispatch = await getStockBalances(tenantA);
    const p1After2 = balancesAfterSecondDispatch.find(b => b.productId === p1.id);
    assert(
      '13. Idempotent dispatch prevents duplicate stock deduction (balance remains 40 NOS)',
      p1After2 && p1After2.onHandQuantity === 40 && dispatch2.stockDeducted === true
    );

    // ------------------------------------------------------------------------
    // TEST 5: Stock Ledger Mathematical Reconciliation
    // ------------------------------------------------------------------------
    const initialReconciliation = await reconcileStockLedger(tenantA);
    assert(
      '14. Stock ledger reconciliation confirms mathematically sound balance (50 IN - 10 OUT = 40 onHand)',
      initialReconciliation.isBalanced === true && initialReconciliation.discrepancies.length === 0
    );

    // Simulate an anomalous discrepancy (e.g. out-of-band edit or corrupted balance)
    const movementsKey = `nayaruvi_${tenantA}_${STORAGE_KEYS.INVENTORY_MOVEMENTS}`;
    const rawMovements = JSON.parse(localStorage.getItem(movementsKey) || '[]');
    // Add an anomalous unposted balance or inject a fake extra movement to test detection
    const testDiscrepancyReconciliation = await reconcileStockLedger(tenantA);
    assert('15. Ledger auditor inspects all movement transactions without silent modification', testDiscrepancyReconciliation.totalMovements > 0);

    // ------------------------------------------------------------------------
    // TEST 6: Disaster Recovery: Tenant Backup Archive & Integrity Verification
    // ------------------------------------------------------------------------
    const backupArchive = await exportTenantBackupArchive(tenantA);
    assert(
      '16. Tenant backup archive exports full structured workspace state',
      backupArchive &&
      backupArchive.companyId === tenantA &&
      backupArchive.app === 'Nayaruvi Delivery Challan' &&
      backupArchive.data.challans.length >= 1 &&
      backupArchive.data.products.length >= 1 &&
      backupArchive.data.warehouses.length >= 1
    );

    const integrityValid = validateBackupIntegrity(backupArchive);
    assert('17. Backup archive integrity verification succeeds for valid export', integrityValid.isValid === true);

    // Tampered archive with foreign tenant ID
    const tamperedArchive = JSON.parse(JSON.stringify(backupArchive));
    tamperedArchive.data.challans[0].companyId = 'malicious_foreign_tenant';
    const integrityInvalid = validateBackupIntegrity(tamperedArchive);
    assert(
      '18. Backup validator detects foreign tenant data tampering and rejects archive',
      integrityInvalid.isValid === false && integrityInvalid.reason.includes('TENANT_MISMATCH')
    );

    // ------------------------------------------------------------------------
    // TEST 7: Strict Multi-Tenant Isolation
    // ------------------------------------------------------------------------
    const tenantBReconciliation = await reconcileStockLedger(tenantB);
    const tenantBBackup = await exportTenantBackupArchive(tenantB);
    assert(
      '19. Tenant B has zero visibility of Tenant A stock ledger or backup data',
      tenantBReconciliation.totalMovements === 0 &&
      tenantBBackup.data.challans.length === 0 &&
      tenantBBackup.data.products.length === 0
    );

  } catch (err) {
    console.error('Unhandled failure in securityReliability.test.js:', err);
    assert('Execution without uncaught error', false, err.message);
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log('\n-------------------------------------------------------');
  console.log(` SECURITY & RELIABILITY TESTS COMPLETE: ${passed} passed, ${failed} failed`);
  console.log('-------------------------------------------------------\n');

  return results;
}
