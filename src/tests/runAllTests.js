// In-memory localStorage polyfill for Node test execution
const memoryStore = new Map();
globalThis.localStorage = {
  getItem: (key) => memoryStore.has(key) ? memoryStore.get(key) : null,
  setItem: (key, val) => memoryStore.set(key, String(val)),
  removeItem: (key) => memoryStore.delete(key),
  clear: () => memoryStore.clear()
};

import { runTenantIsolationTests } from './tenantIsolation.test.js';
import { runChallanCreationTests } from './challanCreation.test.js';
import { runDocumentOutputTests } from './documentOutput.test.js';
import { runCustomerProductTests } from './customerProduct.test.js';
import { runDeliveryReturnTests } from './deliveryReturn.test.js';
import { runTransportWeightTests } from './transportWeight.test.js';
import { runInventoryWarehouseTests } from './inventoryWarehouse.test.js';
import { runDashboardReportsTests } from './dashboardReports.test.js';
import { runTeamEnterpriseTests } from './teamEnterprise.test.js';
import { runSecurityReliabilityTests } from './securityReliability.test.js';
import { seedInitialLocalStorageData } from '../utils/tenantStorage.js';

async function main() {
  console.log("Running All Tests...\n");
  seedInitialLocalStorageData();

  const isoResults = await runTenantIsolationTests();
  const challanResults = await runChallanCreationTests();
  const docResults = await runDocumentOutputTests();
  const cpResults = await runCustomerProductTests();
  const drResults = await runDeliveryReturnTests();
  const twResults = await runTransportWeightTests();
  const iwResults = await runInventoryWarehouseTests();
  const drpResults = await runDashboardReportsTests();
  const teResults = await runTeamEnterpriseTests();
  const srResults = await runSecurityReliabilityTests();

  const totalPassed = 
    isoResults.filter(r => r.passed).length + 
    challanResults.filter(r => r.passed).length +
    docResults.filter(r => r.passed).length +
    cpResults.filter(r => r.passed).length +
    drResults.filter(r => r.passed).length +
    twResults.filter(r => r.passed).length +
    iwResults.filter(r => r.passed).length +
    drpResults.filter(r => r.passed).length +
    teResults.filter(r => r.passed).length +
    srResults.filter(r => r.passed).length;
    
  const totalTests = 
    isoResults.length + 
    challanResults.length + 
    docResults.length + 
    cpResults.length + 
    drResults.length + 
    twResults.length +
    iwResults.length +
    drpResults.length +
    teResults.length +
    srResults.length;

  console.log(`\n======================================================`);
  console.log(`OVERALL TEST RESULTS: ${totalPassed} / ${totalTests} PASSED`);
  console.log(`======================================================\n`);

  if (totalPassed !== totalTests) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
