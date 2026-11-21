import {
  ROLES,
  PERMISSIONS,
  PLAN_TIERS,
  PLAN_LIMITS,
  hasPermission,
  getBranches,
  getBranchById,
  saveBranch,
  updateBranchStatus,
  deleteBranch,
  createMemberInvitation,
  getMemberInvitations,
  revokeMemberInvitation,
  acceptMemberInvitation,
  updateMemberRoleSafely,
  removeCompanyMemberSafely,
  updateMemberStatus,
  updateMemberScopes,
  transferOrganizationOwnership,
  getUsageMetrics,
  checkPlanLimit,
  recordAuditLog,
  getAuditLogs,
  getCompany,
  updateCompany,
  getCompanyMembers,
  createChallan,
  STORAGE_KEYS
} from '../utils/tenantStorage.js';

export async function runTeamEnterpriseTests() {
  console.log('\n=======================================================');
  console.log(' STARTING TEAM & ENTERPRISE MODULE VERIFICATION');
  console.log('=======================================================\n');

  const results = [];
  const tenantA = 'tenant_team_test_a';
  const tenantB = 'tenant_team_test_b';

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

    const ownerA = { uid: 'user_owner_a', email: 'owner@companya.com', displayName: 'Owner A' };
    const adminA = { uid: 'user_admin_a', email: 'admin@companya.com', displayName: 'Admin A' };
    const staffA = { uid: 'user_staff_a', email: 'staff@companya.com', displayName: 'Staff A' };
    const viewerA = { uid: 'user_viewer_a', email: 'viewer@companya.com', displayName: 'Viewer A' };

    // Setup initial company profile for tenantA
    const companies = [
      {
        id: tenantA,
        name: 'Alpha Logistics Pvt Ltd',
        tradeName: 'Alpha Express',
        gstin: '33AAAAA0000A1Z5',
        createdBy: ownerA.uid,
        ownerUid: ownerA.uid,
        plan: PLAN_TIERS.FREE
      }
    ];
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));

    // Setup initial members for tenantA
    const initialMembers = [
      {
        companyId: tenantA,
        uid: ownerA.uid,
        email: ownerA.email,
        displayName: ownerA.displayName,
        role: ROLES.OWNER,
        status: 'ACTIVE',
        joinedAt: new Date().toISOString()
      },
      {
        companyId: tenantA,
        uid: adminA.uid,
        email: adminA.email,
        displayName: adminA.displayName,
        role: ROLES.ADMIN,
        status: 'ACTIVE',
        joinedAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(initialMembers));

    // ------------------------------------------------------------------------
    // TEST 1: Role-Based Access Control (RBAC) & hasPermission Matrix
    // ------------------------------------------------------------------------
    assert(
      '1. OWNER has full team, branch, billing and delete permissions',
      hasPermission(ROLES.OWNER, PERMISSIONS.TEAM_MANAGE) &&
      hasPermission(ROLES.OWNER, PERMISSIONS.BRANCH_MANAGE) &&
      hasPermission(ROLES.OWNER, PERMISSIONS.BILLING_MANAGE) &&
      hasPermission(ROLES.OWNER, PERMISSIONS.CHALLAN_DELETE)
    );

    assert(
      '2. ADMIN can manage team and branches but cannot transfer ownership',
      hasPermission(ROLES.ADMIN, PERMISSIONS.TEAM_MANAGE) &&
      hasPermission(ROLES.ADMIN, PERMISSIONS.BRANCH_MANAGE) &&
      !hasPermission(ROLES.ADMIN, PERMISSIONS.ORG_TRANSFER_OWNERSHIP)
    );

    assert(
      '3. MANAGER can create and edit challans and inventory but cannot manage team or delete challans',
      hasPermission(ROLES.MANAGER, PERMISSIONS.CHALLAN_CREATE) &&
      hasPermission(ROLES.MANAGER, PERMISSIONS.INVENTORY_ADJUST) &&
      !hasPermission(ROLES.MANAGER, PERMISSIONS.TEAM_MANAGE) &&
      !hasPermission(ROLES.MANAGER, PERMISSIONS.CHALLAN_DELETE)
    );

    assert(
      '4. OPERATIONS_STAFF can create challans and manage customers but not manage branches or team',
      hasPermission(ROLES.OPERATIONS_STAFF, PERMISSIONS.CHALLAN_CREATE) &&
      hasPermission(ROLES.OPERATIONS_STAFF, PERMISSIONS.CUSTOMER_MANAGE) &&
      !hasPermission(ROLES.OPERATIONS_STAFF, PERMISSIONS.BRANCH_MANAGE)
    );

    assert(
      '5. WAREHOUSE_STAFF can manage inventory and returnables but not delete challans',
      hasPermission(ROLES.WAREHOUSE_STAFF, PERMISSIONS.INVENTORY_ADJUST) &&
      hasPermission(ROLES.WAREHOUSE_STAFF, PERMISSIONS.RETURNABLE_MANAGE) &&
      !hasPermission(ROLES.WAREHOUSE_STAFF, PERMISSIONS.CHALLAN_DELETE)
    );

    assert(
      '6. VIEWER can view challans and reports, but cannot edit, create, or adjust inventory',
      hasPermission(ROLES.VIEWER, PERMISSIONS.CHALLAN_VIEW) &&
      hasPermission(ROLES.VIEWER, PERMISSIONS.REPORT_VIEW) &&
      !hasPermission(ROLES.VIEWER, PERMISSIONS.CHALLAN_CREATE) &&
      !hasPermission(ROLES.VIEWER, PERMISSIONS.CHALLAN_EDIT) &&
      !hasPermission(ROLES.VIEWER, PERMISSIONS.INVENTORY_ADJUST)
    );

    // ------------------------------------------------------------------------
    // TEST 2: Branch Directory CRUD & Auto-Code Generation
    // ------------------------------------------------------------------------
    const branch1 = await saveBranch(tenantA, {
      name: 'Chennai Central Hub',
      address: '12 GST Road, Guindy, Chennai, Tamil Nadu',
      phone: '044-22334455',
      email: 'chennai@alpha.com',
      contactPerson: 'Karthik Raja',
      isDefault: true
    }, ownerA);

    assert(
      '7. Branch auto-generates BR-0001 code and persists fields',
      branch1 && branch1.branchCode === 'BR-0001' && branch1.isDefault === true && branch1.status === 'ACTIVE'
    );

    // Verify Free plan limit blocks 2nd branch
    let freeBranchLimitBlocked = false;
    try {
      await saveBranch(tenantA, {
        name: 'Coimbatore Distribution Center',
        address: '54 Avinashi Road, Peelamedu, Coimbatore',
        phone: '0422-998877'
      }, ownerA);
    } catch (err) {
      freeBranchLimitBlocked = err.message.includes('Plan Limit Exceeded');
    }
    assert(
      '8. Free plan strictly blocks adding more than 1 branch',
      freeBranchLimitBlocked
    );

    // Upgrade company to PRO plan to allow additional branches
    await updateCompany(tenantA, { plan: PLAN_TIERS.PRO });

    const branch2 = await saveBranch(tenantA, {
      name: 'Coimbatore Distribution Center',
      address: '54 Avinashi Road, Peelamedu, Coimbatore',
      phone: '0422-998877',
      isDefault: false
    }, ownerA);

    assert(
      '8b. After plan upgrade to PRO, second branch auto-increments code to BR-0002',
      branch2 && branch2.branchCode === 'BR-0002'
    );

    // Update branch
    const updatedBranch1 = await saveBranch(tenantA, {
      id: branch1.id,
      name: 'Chennai Central Mega Hub'
    }, ownerA);
    assert('9. Branch updates preserve original code', updatedBranch1.name === 'Chennai Central Mega Hub' && updatedBranch1.branchCode === 'BR-0001');

    // Deactivate branch
    const deactivated = await updateBranchStatus(tenantA, branch2.id, 'INACTIVE', ownerA);
    assert('10. Branch status toggles to INACTIVE', deactivated.status === 'INACTIVE');

    const activeOnly = await getBranches(tenantA, false);
    const allBranches = await getBranches(tenantA, true);
    assert(
      '11. getBranches respects includeInactive parameter',
      activeOnly.length === 1 && allBranches.length === 2
    );

    // ------------------------------------------------------------------------
    // TEST 3: Branch Deletion Guards
    // ------------------------------------------------------------------------
    // Create challan referencing branch 1
    await createChallan(tenantA, {
      challanNumber: 'DC-2026-TEST-BR',
      date: '2026-10-24',
      branchId: branch1.id,
      customer: { id: 'c1', name: 'Test Customer' },
      items: [{ productId: 'p1', name: 'Item A', quantity: 2 }]
    });

    let deleteReferencedBlocked = false;
    try {
      await deleteBranch(tenantA, branch1.id, ownerA);
    } catch (err) {
      deleteReferencedBlocked = err.message.includes('referenced by existing delivery challans');
    }
    assert(
      '12. Cannot delete branch referenced in delivery challans',
      deleteReferencedBlocked
    );

    // Branch 2 is not referenced in challans or members, delete should succeed
    const deleteBranch2Res = await deleteBranch(tenantA, branch2.id, ownerA);
    assert(
      '13. Unreferenced branch can be deleted cleanly',
      deleteBranch2Res === true
    );

    // ------------------------------------------------------------------------
    // TEST 4: Organization Ownership Safeguards
    // ------------------------------------------------------------------------
    let demoteSoleOwnerBlocked = false;
    try {
      await updateMemberRoleSafely(tenantA, ownerA.uid, ROLES.ADMIN, adminA);
    } catch (err) {
      demoteSoleOwnerBlocked = err.message.includes('Cannot demote the last active Owner');
    }
    assert(
      '14. Safeguard prevents demoting the last active owner',
      demoteSoleOwnerBlocked
    );

    let suspendSoleOwnerBlocked = false;
    try {
      await updateMemberStatus(tenantA, ownerA.uid, 'SUSPENDED', adminA);
    } catch (err) {
      suspendSoleOwnerBlocked = err.message.includes('Cannot suspend the only active Owner');
    }
    assert(
      '15. Safeguard prevents suspending the last active owner',
      suspendSoleOwnerBlocked
    );

    let removeSoleOwnerBlocked = false;
    try {
      await removeCompanyMemberSafely(tenantA, ownerA.uid, adminA);
    } catch (err) {
      removeSoleOwnerBlocked = err.message.includes('Cannot remove the primary Owner');
    }
    assert(
      '16. Safeguard prevents removing the last active owner',
      removeSoleOwnerBlocked
    );

    // ------------------------------------------------------------------------
    // TEST 5: Explicit Ownership Transfer Workflow
    // ------------------------------------------------------------------------
    const transferRes = await transferOrganizationOwnership(tenantA, ownerA.uid, adminA.uid, ownerA);
    assert(
      '17. Ownership transfer succeeds: new user becomes OWNER and predecessor becomes ADMIN',
      transferRes === true
    );

    const updatedProfile = await getCompany(tenantA);
    assert(
      '18. Company profile ownerUid is updated to new owner',
      updatedProfile.ownerUid === adminA.uid
    );

    const refreshedMembers = await getCompanyMembers(tenantA);
    const newOwnerInMembers = refreshedMembers.find(m => m.uid === adminA.uid);
    const oldOwnerInMembers = refreshedMembers.find(m => m.uid === ownerA.uid);
    assert(
      '19. Member roles reflect the ownership transfer correctly',
      newOwnerInMembers && newOwnerInMembers.role === ROLES.OWNER && oldOwnerInMembers && oldOwnerInMembers.role === ROLES.ADMIN
    );

    // ------------------------------------------------------------------------
    // TEST 6: Invitation Lifecycle (Create, Expire, Revoke, Accept)
    // ------------------------------------------------------------------------
    const inviteObj = await createMemberInvitation(tenantA, {
      email: 'newuser@alpha.com',
      role: ROLES.MANAGER,
      branchIds: [branch1.id],
      warehouseIds: ['WH-001']
    }, adminA);

    assert(
      '20. Invitation created with secure token and 7-day expiration',
      inviteObj && inviteObj.token && inviteObj.status === 'PENDING' && inviteObj.expiresAt
    );

    // Try creating duplicate pending invitation for same email
    let duplicateInviteBlocked = false;
    try {
      await createMemberInvitation(tenantA, {
        email: 'newuser@alpha.com',
        role: ROLES.VIEWER
      }, adminA);
    } catch (err) {
      duplicateInviteBlocked = err.message.includes('pending invitation has already been sent');
    }

    assert(
      '21. Duplicate active invitation for same email is rejected',
      duplicateInviteBlocked
    );

    // Revoke test on another invitation
    const inviteToRevoke = await createMemberInvitation(tenantA, {
      email: 'temp@alpha.com',
      role: ROLES.VIEWER
    }, adminA);

    const revokeRes = await revokeMemberInvitation(tenantA, inviteToRevoke.id, adminA);
    assert(
      '22. Invitation can be revoked',
      revokeRes === true
    );

    // Accept invitation with token
    const acceptRes = await acceptMemberInvitation(inviteObj.token, {
      uid: 'user_new_manager',
      email: 'newuser@alpha.com',
      displayName: 'Manager New'
    });

    assert(
      '23. Accepting invitation adds member to organization and sets status to ACCEPTED',
      acceptRes && acceptRes.member && acceptRes.member.role === ROLES.MANAGER
    );

    const membersAfterAccept = await getCompanyMembers(tenantA);
    const acceptedMember = membersAfterAccept.find(m => m.uid === 'user_new_manager');
    assert(
      '24. Accepted member has assigned branches and warehouses scoped',
      acceptedMember && Array.isArray(acceptedMember.branchIds) && acceptedMember.branchIds.includes(branch1.id)
    );

    // ------------------------------------------------------------------------
    // TEST 7: Plan Limits & Usage Metrics Enforcement
    // ------------------------------------------------------------------------
    // Switch back to FREE plan to verify strict limits enforcement
    await updateCompany(tenantA, { plan: PLAN_TIERS.FREE });

    // In FREE plan, max team members is 3. We currently have 3 members: ownerA, adminA, user_new_manager.
    const usage = await getUsageMetrics(tenantA);
    assert(
      '25. Usage metrics accurately reflect current member count',
      usage.usage.members.current === 3 && usage.usage.branches.current === 1
    );

    let planLimitBlocked = false;
    try {
      await checkPlanLimit(tenantA, 'members');
    } catch (err) {
      planLimitBlocked = err.message.includes('Plan Limit Exceeded');
    }
    assert(
      '26. checkPlanLimit flags member limit exceeded when reached',
      planLimitBlocked
    );

    // Attempting to invite a 4th member in FREE plan should be blocked
    let overLimitInviteBlocked = false;
    try {
      await createMemberInvitation(tenantA, {
        email: 'fourth@alpha.com',
        role: ROLES.VIEWER
      }, adminA);
    } catch (err) {
      overLimitInviteBlocked = err.message.includes('Plan Limit Exceeded');
    }

    assert(
      '27. Invitation creation enforces plan tier member limit',
      overLimitInviteBlocked
    );

    // ------------------------------------------------------------------------
    // TEST 8: Audit Log Trail & Immutability
    // ------------------------------------------------------------------------
    const auditLogs = await getAuditLogs(tenantA);
    assert(
      '28. Audit logs capture critical operations (BRANCH_CREATED, OWNERSHIP_TRANSFERRED, etc.)',
      auditLogs.length > 0 && auditLogs.some(l => l.action === 'OWNERSHIP_TRANSFERRED')
    );

    const filteredLogs = await getAuditLogs(tenantA, { action: 'OWNERSHIP_TRANSFERRED' });
    assert(
      '29. Audit logs can be filtered by action type',
      filteredLogs.length >= 1 && filteredLogs[0].action === 'OWNERSHIP_TRANSFERRED'
    );

    // ------------------------------------------------------------------------
    // TEST 9: Strict Multi-Tenant Data Isolation
    // ------------------------------------------------------------------------
    const tenantBBranches = await getBranches(tenantB, true);
    const tenantBMemberInvites = await getMemberInvitations(tenantB);
    const tenantBAuditLogs = await getAuditLogs(tenantB);

    assert(
      '30. Tenant B has zero visibility of Tenant A branches, invites, or audit logs',
      tenantBBranches.length === 0 &&
      tenantBMemberInvites.length === 0 &&
      tenantBAuditLogs.length === 0
    );

  } catch (err) {
    console.error('Unhandled test failure in teamEnterprise.test.js:', err);
    assert('Execution without uncaught error', false, err.message);
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log('\n-------------------------------------------------------');
  console.log(` TEAM & ENTERPRISE TESTS COMPLETE: ${passed} passed, ${failed} failed`);
  console.log('-------------------------------------------------------\n');

  return results;
}
