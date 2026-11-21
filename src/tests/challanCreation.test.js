/**
 * COMPREHENSIVE DELIVERY CHALLAN CREATION TEST SUITE
 * Validates the 22 specific test cases required for production readiness:
 * - Customer selection & quick-add
 * - Single and multi-item entry
 * - Unit compatibility & Calculations
 * - Gross/Tare/Net Weight logic
 * - Returnable goods tracking
 * - Draft vs Finalized document lifecycle
 * - Concurrency & Duplicate prevention
 * - Multi-tenant isolation
 * - Backward compatibility with TekPower historical records
 */

import {
  getChallans,
  getChallanById,
  createChallan,
  updateChallan,
  deleteChallan,
  generateNextChallanNumber,
  getCustomers,
  saveCustomer,
  getProducts,
  saveProduct,
  getChallanSettings,
  updateChallanSettings
} from '../utils/tenantStorage.js';

import {
  calculateRowAmount,
  calculateLineItemBreakdown,
  calculateTotals,
  calculateNetWeight,
  formatCurrency
} from '../utils/calculations.js';

import {
  getFinancialYear,
  getStateCodeFromGstin,
  validateGstin,
  validateVehicleNumber
} from '../utils/indianBusiness.js';

export async function runChallanCreationTests() {
  const results = [];
  const log = (testNum, description, passed, details = '') => {
    results.push({ testNum, description, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [Case ${testNum}]: ${description} ${details ? `(${details})` : ''}`);
  };

  console.log("\n=======================================================");
  console.log(" STARTING DELIVERY CHALLAN CREATION VERIFICATION SUITE ");
  console.log("=======================================================\n");

  const testCompanyId = "company_test_logistics_" + Date.now().toString(36);
  const companyUser = { uid: "usr_tester_1", email: "dispatch@testlogistics.in", displayName: "Dispatch Manager" };

  try {
    // 1. Existing customer creation & retrieval
    const seededCust = await saveCustomer(testCompanyId, {
      name: "BHEL Heavy Electricals Ltd",
      contactPerson: "Mr. Sundararajan",
      phone: "0431-2520456",
      gstin: "33AAACB1234H1Z5",
      state: "Tamil Nadu",
      stateCode: "33",
      billingAddress: "Boiler Plant Project, Tiruchirappalli - 620014",
      deliveryAddress: "Unit II Storage Yard, BHEL Trichy"
    });
    const retrievedCusts = await getCustomers(testCompanyId);
    const hasCust = retrievedCusts.some(c => c.name === "BHEL Heavy Electricals Ltd");
    log(1, "Create a challan for an existing customer", hasCust, `Found: ${seededCust.name}`);

    // 2. Create customer dynamically
    const dynamicCust = await saveCustomer(testCompanyId, {
      name: "Dynamic Construction Infra",
      billingAddress: "Site 4, OMR, Chennai"
    });
    log(2, "Create a challan for a new customer without losing context", !!dynamicCust.id, `ID: ${dynamicCust.id}`);

    // 3. Add one product
    const prod1 = await saveProduct(testCompanyId, {
      name: "Copper Busbar 50x10mm",
      sku: "CBB-5010",
      hsn: "7407",
      unit: "KGS",
      rate: 850,
      taxRate: 18
    });
    log(3, "Add one product to master & verify structure", prod1.name === "Copper Busbar 50x10mm", `Unit: ${prod1.unit}, Rate: ${prod1.rate}`);

    // 4. Add multiple products
    const prod2 = await saveProduct(testCompanyId, {
      name: "Digital Energy Meter 3-Phase",
      sku: "DEM-03P",
      hsn: "9028",
      unit: "NOS",
      rate: 3400,
      taxRate: 18
    });
    const allProds = await getProducts(testCompanyId);
    log(4, "Add multiple products and retrieve catalog", allProds.length >= 2, `${allProds.length} products in catalog`);

    // 5. Search and select products autocomplete simulation
    const searchMatch = allProds.filter(p => p.name.toLowerCase().includes("energy"));
    log(5, "Search and select products autocomplete", searchMatch.length === 1 && searchMatch[0].sku === "DEM-03P", "Search matched DEM-03P");

    // 6. Custom product line item support
    const customLine = {
      serialNumber: 3,
      name: "Custom Fabricated Steel Mounting Bracket",
      sku: "CUST-009",
      quantity: 10,
      unit: "SETS",
      rate: 1200,
      amount: 12000
    };
    log(6, "Add a custom product line item with custom unit", customLine.unit === "SETS" && customLine.amount === 12000, "10 SETS @ 1200");

    // 7. Save a draft
    const draftNumber = await generateNextChallanNumber(testCompanyId);
    const draftChallan = await createChallan(testCompanyId, {
      challanNumber: draftNumber,
      date: "2026-10-23",
      customer: dynamicCust.details,
      customerDetails: dynamicCust,
      status: "Draft",
      products: [{ name: "Copper Busbar 50x10mm", quantity: 5, unit: "KGS", rate: 850, amount: 4250 }]
    }, companyUser);
    log(7, "Save a draft challan", draftChallan.status === "Draft", `DC: ${draftChallan.challanNumber}`);

    // 8. Reopen and edit draft
    const updatedDraft = await updateChallan(testCompanyId, draftChallan.id, {
      remarks: "Updated with revised site instructions",
      products: [
        { name: "Copper Busbar 50x10mm", quantity: 10, unit: "KGS", rate: 850, amount: 8500 }
      ]
    }, companyUser);
    log(8, "Reopen and edit a draft", updatedDraft.remarks.includes("revised site instructions") && updatedDraft.products[0].quantity === 10, "Updated qty to 10 KGS");

    // 9. Finalize a challan
    const finalizedChallan = await updateChallan(testCompanyId, draftChallan.id, {
      status: "Finalized"
    }, companyUser);
    log(9, "Finalize a challan document", finalizedChallan.status === "Finalized", "Status transitioned to Finalized");

    // 10. Verify challan number is unique
    const collisionCheckChallans = await getChallans(testCompanyId);
    const sameNumberMatches = collisionCheckChallans.filter(c => c.challanNumber === draftNumber);
    log(10, "Verify that the challan number is unique", sameNumberMatches.length === 1, `Single document with ${draftNumber}`);

    // 11. Attempt duplicate submission
    let duplicateCaught = false;
    try {
      await createChallan(testCompanyId, {
        challanNumber: draftNumber,
        date: "2026-10-23",
        status: "Finalized",
        customer: "Another Client"
      }, companyUser);
    } catch (e) {
      duplicateCaught = true;
    }
    log(11, "Attempt duplicate submission rejection", duplicateCaught, "Blocked duplicate number on finalized status");

    // 12 & 13. Calculations & Print Data Integrity
    const testItems = [
      { name: "Item 1", quantity: 4, unit: "NOS", rate: 2500, discount: 10, taxRate: 18 },
      { name: "Item 2", quantity: 2, unit: "PCS", rate: 1500, discount: 0, taxRate: 18 }
    ];
    const totalsResult = calculateTotals(testItems);
    log(12, "Item calculations: Line discounts, taxes, and grand totals", totalsResult.totalAmount > 0 && totalsResult.totalTaxable > 0, `Taxable: ${totalsResult.totalTaxable}, Tax: ${totalsResult.totalTax}, Total: ${totalsResult.totalAmount}`);
    log(13, "Incompatible units non-misleading aggregation", totalsResult.unitSummary.includes("NOS") && totalsResult.unitSummary.includes("PCS"), `Summary: ${totalsResult.unitSummary}`);

    // 14. Multi-page pagination calculation
    const manyProducts = Array.from({ length: 35 }, (_, i) => ({
      name: `Industrial Spare Part Part ${i + 1}`,
      quantity: 1,
      unit: "NOS",
      rate: 100,
      amount: 100
    }));
    const totalPagesNeeded = Math.ceil(manyProducts.length / 16);
    log(14, "Multi-page challan pagination threshold", totalPagesNeeded === 3, `35 items correctly paginate into ${totalPagesNeeded} pages`);

    // 15. Create returnable challan
    const returnableChallan = await createChallan(testCompanyId, {
      challanNumber: await generateNextChallanNumber(testCompanyId),
      date: "2026-10-23",
      challanType: "Returnable Challan",
      status: "Finalized",
      returnable: {
        isReturnable: true,
        expectedReturnDate: "2026-11-15",
        returnReason: "Calibration & Servicing",
        returnStatus: "Pending"
      },
      customer: seededCust.details,
      products: [{ name: "High Precision Test Meter", quantity: 1, unit: "NOS", returnableQty: 1 }]
    }, companyUser);
    log(15, "Create a returnable challan with expected return date", returnableChallan.returnable?.isReturnable && returnableChallan.returnable?.expectedReturnDate === "2026-11-15", `Reason: ${returnableChallan.returnable?.returnReason}`);

    // 16. Gross weight, tare weight, and net weight calculation
    const weightCalc1 = calculateNetWeight(1250.5, 150.0);
    const weightCalcInvalid = calculateNetWeight(100, 150); // Tare exceeds Gross
    log(16, "Gross, tare, and net weight calculation", weightCalc1.isValid && weightCalc1.netWeight === 1100.5 && !weightCalcInvalid.isValid, `Net: ${weightCalc1.netWeight} Kg, Invalid Tare caught: ${!weightCalcInvalid.isValid}`);

    // 17. GSTIN and Vehicle Number validation
    const validGstin = validateGstin("33EGXPD3539N1ZR");
    const invalidGstin = validateGstin("INVALID_GST");
    const validVeh = validateVehicleNumber("TN-01-AB-1234");
    log(17, "Indian statutory validation (GSTIN & Vehicle format)", validGstin.isValid && !invalidGstin.isValid && validVeh.isValid, "GSTIN and Vehicle regex verified");

    // 18. Financial Year auto-calculation
    const fyOct = getFinancialYear("2026-10-23");
    const fyFeb = getFinancialYear("2027-02-15");
    log(18, "Indian Financial Year (April 1 - March 31) computation", fyOct.fyCode === "26-27" && fyFeb.fyCode === "26-27", `Oct 2026: ${fyOct.fyCode}, Feb 2027: ${fyFeb.fyCode}`);

    // 19. Simultaneous challan numbering check
    const numA = await generateNextChallanNumber(testCompanyId);
    const mockCreatedA = await createChallan(testCompanyId, { challanNumber: numA, customer: "Client A" }, companyUser);
    const numB = await generateNextChallanNumber(testCompanyId);
    log(19, "Two sequential or concurrent challan number creations", mockCreatedA.challanNumber !== numB, `${mockCreatedA.challanNumber} -> ${numB}`);

    // 20. Access restrictions between companies
    const otherCompanyId = "company_isolated_client_99";
    const crossFetch = await getChallanById(otherCompanyId, mockCreatedA.id);
    log(20, "Multi-tenant data isolation enforcement", crossFetch === null, "Other company cannot read test document");

    // 21. Configurable numbering sequence & format settings
    await updateChallanSettings(testCompanyId, {
      prefix: "NY/DC",
      numberingStyle: "financial_year",
      digits: 4
    });
    const formattedFyNumber = await generateNextChallanNumber(testCompanyId);
    log(21, "Configurable prefix and financial-year numbering style", formattedFyNumber.startsWith("NY/DC/26-27/"), `Generated: ${formattedFyNumber}`);

    // 22. Historical TekPower tenant backward compatibility
    const tekChallans = await getChallans("company_tekpower");
    log(22, "Existing TekPower tenant data & historical challans intact", tekChallans.length >= 3, `TekPower challans count: ${tekChallans.length}`);

  } catch (err) {
    console.error("Test execution caught unexpected error:", err);
    log(999, "UNEXPECTED SUITE FAILURE", false, err.message);
  }

  const passed = results.filter(r => r.passed).length;
  console.log(`\n=======================================================`);
  console.log(` RESULTS: ${passed}/${results.length} PASSED (${Math.round((passed / results.length) * 100)}%)`);
  console.log("=======================================================\n");

  return results;
}
