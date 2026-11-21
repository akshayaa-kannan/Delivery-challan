import { seedInitialLocalStorageData } from './tenantStorage.js';

export const TEKPOWER_TENANT_ID = 'company_tekpower';

/**
 * Migrates existing TekPower Energy Solutions data into a dedicated tenant.
 * Runs in LocalStorage mode, and preserves historical records.
 */
export const migrateTekPowerData = async (ownerUid = null) => {
  try {
    seedInitialLocalStorageData();
    console.log(`[Migration] TekPower tenant ${TEKPOWER_TENANT_ID} verified in storage.`);
    return true;
  } catch (error) {
    console.error("[Migration] Error verifying TekPower data:", error);
    return false;
  }
};

/*
// ============================================================================
// FIREBASE FIRESTORE MIGRATION (PRESERVED FOR LATER USE)
// ============================================================================
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { sampleChallans, defaultCompanyDetails } from '../data/sampleData';

export const migrateTekPowerDataFirebase = async (ownerUid = null) => {
  try {
    const compRef = doc(db, 'companies', TEKPOWER_TENANT_ID);
    const compSnap = await getDoc(compRef);

    if (!compSnap.exists()) {
      await setDoc(compRef, {
        id: TEKPOWER_TENANT_ID,
        legalName: defaultCompanyDetails.companyName,
        displayName: "TekPower Energy Solutions",
        businessType: "Private Limited",
        gstin: defaultCompanyDetails.gstNumber,
        address: defaultCompanyDetails.address,
        city: "Chennai",
        state: "Tamil Nadu",
        pincode: "600044",
        country: "India",
        businessEmail: "contact@tekpower.in",
        businessPhone: defaultCompanyDetails.mobileNumber,
        website: "https://tekpower.in",
        logoUrl: "/logo.png",
        footerTagline: defaultCompanyDetails.footerTagline,
        onboardingComplete: true,
        isMigratedTenant: true,
        createdBy: ownerUid || "system_migration",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await setDoc(doc(db, 'companies', TEKPOWER_TENANT_ID, 'settings', 'challan'), {
        prefix: "TEK",
        startingNumber: 1,
        currentSequence: sampleChallans.length,
        digits: 4,
        footerText: defaultCompanyDetails.footerTagline,
        updatedAt: new Date().toISOString()
      });

      for (const challan of sampleChallans) {
        const challanRef = doc(db, 'companies', TEKPOWER_TENANT_ID, 'challans', challan.id);
        await setDoc(challanRef, {
          ...challan,
          companyId: TEKPOWER_TENANT_ID,
          migrated: true,
          updatedAt: new Date().toISOString()
        });
      }

      if (ownerUid) {
        await setDoc(doc(db, 'companies', TEKPOWER_TENANT_ID, 'members', ownerUid), {
          uid: ownerUid,
          companyId: TEKPOWER_TENANT_ID,
          role: "OWNER",
          status: "ACTIVE",
          createdAt: new Date().toISOString()
        });
      }

      return true;
    }
    return false;
  } catch (error) {
    console.error("[Migration] Error migrating TekPower data:", error);
    return false;
  }
};
*/
