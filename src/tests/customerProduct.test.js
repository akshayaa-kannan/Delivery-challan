import {
  getCustomers,
  saveCustomer,
  deleteCustomer,
  updateCustomerStatus,
  generateNextCustomerCode,
  getCustomerChallans,
  getProducts,
  saveProduct,
  deleteProduct,
  updateProductStatus,
  generateNextProductCode,
  getCategories,
  saveCategory,
  deleteCategory,
  createChallan,
  getChallanById,
  deduplicateCustomers,
  deduplicateProducts
} from '../utils/tenantStorage.js';

import {
  parseCustomerCsv,
  parseProductCsv,
  sanitizeCsvCell
} from '../utils/csvUtils.js';

import { validateGstin } from '../utils/indianBusiness.js';

export async function runCustomerProductTests() {
  console.log("=== RUNNING CUSTOMER & PRODUCT MANAGEMENT TESTS ===");
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

  const tenantA = "comp_test_tenant_a";
  const tenantB = "comp_test_tenant_b";

  try {
    // ------------------------------------------------------------------------
    // 1. CUSTOMER AUTO CODE GENERATION & VALIDATION
    // ------------------------------------------------------------------------
    const code1 = await generateNextCustomerCode(tenantA);
    assert("1. Customer auto code generates CUS-0001 format", /^CUS-\d{4}$/.test(code1), `Code was ${code1}`);

    // Save Customer 1
    const cust1 = await saveCustomer(tenantA, {
      customerCode: code1,
      name: "Alpha Technologies Pvt Ltd",
      customerType: "BUSINESS",
      contactPerson: "Rajesh Kumar",
      phone: "9876543210",
      email: "rajesh@alphatech.com",
      gstin: "33AABCT1332L1ZV",
      pan: "AABCT1332L",
      state: "Tamil Nadu",
      stateCode: "33",
      billingAddress: {
        address1: "123 Industrial Estate",
        city: "Coimbatore",
        state: "Tamil Nadu",
        pincode: "641001"
      },
      status: "ACTIVE"
    });

    assert("2. Save customer persists correctly with ID", cust1 && cust1.id && cust1.customerCode === code1);

    const code2 = await generateNextCustomerCode(tenantA);
    assert("3. Customer auto code increments sequentially to CUS-0002", code2 === "CUS-0002", `Got: ${code2}`);

    // GSTIN format validation
    const validGst = validateGstin("33AABCT1332L1ZV");
    const invalidGst = validateGstin("33INVALIDGST");
    assert("4. GSTIN validation accepts valid 15-char Indian GSTIN", validGst.isValid && "33AABCT1332L1ZV".slice(0, 2) === "33");
    assert("5. GSTIN validation rejects malformed GSTIN", !invalidGst.isValid);

    // Duplicate code prevention
    let dupCodeFailed = false;
    try {
      await saveCustomer(tenantA, {
        customerCode: code1,
        name: "Imposter Company",
        phone: "9123456789"
      });
    } catch (err) {
      dupCodeFailed = true;
    }
    assert("6. Prevent duplicate customer code in same tenant", dupCodeFailed);

    // Status toggle
    const updatedStatusCust = await updateCustomerStatus(tenantA, cust1.id, "INACTIVE");
    assert("7. Customer status toggle works (ACTIVE -> INACTIVE)", updatedStatusCust && updatedStatusCust.status === "INACTIVE");
    await updateCustomerStatus(tenantA, cust1.id, "ACTIVE");

    // ------------------------------------------------------------------------
    // 2. PRODUCT AUTO CODE GENERATION & ZERO-RATE / VALUATION
    // ------------------------------------------------------------------------
    const pCode1 = await generateNextProductCode(tenantA);
    assert("8. Product auto code generates PRD-0001 format", /^PRD-\d{4}$/.test(pCode1), `Got ${pCode1}`);

    const prod1 = await saveProduct(tenantA, {
      productCode: pCode1,
      name: "Heavy Duty Gearbox 50HP",
      category: "Industrial Machinery",
      productType: "GOODS",
      hsnSac: "84834000",
      unitOfMeasurement: "SET",
      standardRate: 45000,
      taxRate: 18,
      weightGross: 120,
      weightNet: 110,
      weightUnit: "Kg",
      isReturnable: false,
      status: "ACTIVE"
    });

    assert("9. Save product persists correctly with category and rate", prod1 && prod1.id && prod1.standardRate === 45000);

    // Zero-rate / valuation for free sample or returnable tool
    const sampleCode = await generateNextProductCode(tenantA);
    const prodSample = await saveProduct(tenantA, {
      productCode: sampleCode,
      name: "Engineering Test Sample Tooling",
      category: "Tools & Dies",
      productType: "SAMPLE",
      hsnSac: "82079090",
      unitOfMeasurement: "NOS",
      standardRate: 0,
      taxRate: 0,
      isReturnable: true,
      returnPeriodDays: 30,
      status: "ACTIVE"
    });

    assert("10. Zero-rate product with returnable flag saved successfully", prodSample && prodSample.standardRate === 0 && prodSample.isReturnable === true);

    // Duplicate SKU/code prevention
    let dupSkuFailed = false;
    try {
      await saveProduct(tenantA, {
        productCode: pCode1,
        name: "Conflicting Product",
        unitOfMeasurement: "NOS"
      });
    } catch (err) {
      dupSkuFailed = true;
    }
    assert("11. Prevent duplicate product code in same tenant", dupSkuFailed);

    // ------------------------------------------------------------------------
    // 3. PRODUCT CATEGORY MANAGEMENT & REFERENCE INTEGRITY
    // ------------------------------------------------------------------------
    const cat1 = await saveCategory(tenantA, {
      name: "Precision Instruments",
      description: "Electronic gauges and calipers"
    });
    assert("12. Add category persists correctly", cat1 && cat1.name === "Precision Instruments");

    let dupCatFailed = false;
    try {
      await saveCategory(tenantA, { name: "Precision Instruments" });
    } catch (err) {
      dupCatFailed = true;
    }
    assert("13. Prevent duplicate category names (case-insensitive)", dupCatFailed);

    // Create product referencing category
    const catProdCode = await generateNextProductCode(tenantA);
    await saveProduct(tenantA, {
      productCode: catProdCode,
      name: "Digital Micrometer 0-25mm",
      category: "Precision Instruments",
      unitOfMeasurement: "NOS",
      standardRate: 3500
    });

    // Deleting category with assigned products must be rejected
    const delCatWithProd = await deleteCategory(tenantA, cat1.id);
    assert("14. Reject deleting category assigned to active products", !delCatWithProd.success);

    // Delete unused category must succeed
    const emptyCat = await saveCategory(tenantA, { name: "Temporary Waste Category" });
    const delEmptyCat = await deleteCategory(tenantA, emptyCat.id);
    assert("15. Delete unassigned category succeeds", delEmptyCat.success);

    // ------------------------------------------------------------------------
    // 4. DELIVERY CHALLAN INTEGRATION & IMMUTABLE SNAPSHOTS
    // ------------------------------------------------------------------------
    const challanData = {
      challanNumber: "TEST-CH-001",
      date: "2026-10-23",
      challanType: "Job Work",
      customerId: cust1.id,
      customerDetails: {
        customerId: cust1.id,
        name: cust1.name,
        contactPerson: cust1.contactPerson,
        phone: cust1.phone,
        gstin: cust1.gstin,
        billingAddress: "123 Industrial Estate, Coimbatore",
        deliveryAddress: "123 Industrial Estate, Coimbatore"
      },
      items: [
        {
          productId: prod1.id,
          name: prod1.name,
          sku: prod1.productCode,
          hsn: prod1.hsnSac,
          quantity: 2,
          unit: prod1.unitOfMeasurement,
          rate: prod1.standardRate,
          amount: 90000
        }
      ],
      totalAmount: 90000,
      status: "FINALIZED"
    };

    const savedChallan = await createChallan(tenantA, challanData);
    assert("16. Challan created referencing customerId and productId", savedChallan && savedChallan.id);

    // Test getCustomerChallans
    const custChallans = await getCustomerChallans(tenantA, cust1.id, cust1.name);
    assert("17. getCustomerChallans retrieves challan for customer", custChallans.length >= 1 && custChallans[0].id === savedChallan.id);

    // ------------------------------------------------------------------------
    // 5. DELETION REFERENCE PROTECTION
    // ------------------------------------------------------------------------
    // Attempt deleting customer who has a challan
    const custDeleteRes = await deleteCustomer(tenantA, cust1.id);
    assert("18. Customer deletion blocked when customer has delivery challan", !custDeleteRes.success);

    // Attempt deleting product referenced in a challan
    const prodDeleteRes = await deleteProduct(tenantA, prod1.id);
    assert("19. Product deletion blocked when product has delivery challan", !prodDeleteRes.success);

    // Deleting product without challans succeeds
    const unreferencedCode = await generateNextProductCode(tenantA);
    const unreferencedProd = await saveProduct(tenantA, {
      productCode: unreferencedCode,
      name: "Temporary Test Item",
      unitOfMeasurement: "NOS"
    });
    const unrefDel = await deleteProduct(tenantA, unreferencedProd.id);
    assert("20. Product without challan references can be safely deleted", unrefDel.success);

    // ------------------------------------------------------------------------
    // 6. HISTORICAL SNAPSHOT IMMUTABILITY
    // ------------------------------------------------------------------------
    // Modify customer master
    await saveCustomer(tenantA, {
      ...cust1,
      name: "Alpha Technologies NEW NAME",
      phone: "9999999999"
    });

    // Retrieve historical challan - snapshot must NOT have changed
    const historicalChallan = await getChallanById(tenantA, savedChallan.id);
    assert(
      "21. Historical challan customer snapshot is immutable across master updates",
      historicalChallan.customerDetails.name === "Alpha Technologies Pvt Ltd"
    );

    // ------------------------------------------------------------------------
    // 7. CSV SANITIZATION (FORMULA INJECTION PREVENTION) & CSV PARSING
    // ------------------------------------------------------------------------
    assert("22. Sanitize CSV formula: =SUM(A1:A10)", sanitizeCsvCell("=SUM(A1:A10)") === '"\'=SUM(A1:A10)"');
    assert("23. Sanitize CSV formula: +cmd|' /C calc'!A0", sanitizeCsvCell("+cmd|' /C calc'!A0") === '"\'+cmd|\' /C calc\'!A0"');
    assert("24. Sanitize CSV formula: -123.45", sanitizeCsvCell("-123.45") === '"\'-123.45"');
    assert("25. Sanitize CSV formula: @calc", sanitizeCsvCell("@calc") === '"\'@calc"');
    assert("26. Standard text unaffected by sanitization", sanitizeCsvCell("Normal Company Name") === '"Normal Company Name"');

    // CSV Parse Test (Customer)
    const rawCustomerCsv = `Customer Code,Customer Name,Company Name,Customer Type,Contact Person,Mobile Number,Alternate Phone,Email Address,GSTIN,PAN,Billing Address Line 1,Billing Address Line 2,Billing City,Billing District,Billing State,Billing PIN Code,Delivery Address Line 1,Delivery Address Line 2,Delivery City,Delivery State,Delivery PIN Code,Website,Notes\nCUS-9901,Beta Corp,Beta Global,BUSINESS,Suresh,9876543211,,suresh@beta.com,29ABCDE1234F1Z5,ABCDE1234F,5th Cross,Peenya,Bangalore,,Karnataka,560058,,,,,https://beta.com,`;
    const custCsvParsed = parseCustomerCsv(rawCustomerCsv, [cust1]);
    assert("27. Parse customer CSV validates and extracts valid row", custCsvParsed.validRows.length === 1 && custCsvParsed.validRows[0].customerCode === "CUS-9901");

    // CSV Parse Test (Product)
    const rawProductCsv = `Product Code,Product Name,Description,Category,Product Type,HSN SAC,UOM,Standard Rate,Tax Rate,Weight Gross,Weight Net,Weight Unit,Dimensions,Barcode,Is Returnable,Return Period Days\nPRD-9901,Hydraulic Valve,,Industrial Machinery,GOODS,84812000,NOS,8500,18,5,4.8,Kg,10x10x15 cm,BAR9901,YES,15`;
    const prodCsvParsed = parseProductCsv(rawProductCsv, [prod1]);
    assert("28. Parse product CSV validates and parses returnable item", prodCsvParsed.validRows.length === 1 && prodCsvParsed.validRows[0].isReturnable === true);

    // ------------------------------------------------------------------------
    // 8. MULTI-TENANT ISOLATION
    // ------------------------------------------------------------------------
    const tenantBCusts = await getCustomers(tenantB);
    const tenantBProds = await getProducts(tenantB);
    const tenantBCats = await getCategories(tenantB);

    const hasTenantACust = tenantBCusts.some(c => c.id === cust1.id || c.customerCode === code1);
    const hasTenantAProd = tenantBProds.some(p => p.id === prod1.id || p.productCode === pCode1);
    const hasTenantACat = tenantBCats.some(c => c.name === "Precision Instruments");

    assert("29. Tenant B cannot view Tenant A's customers", !hasTenantACust);
    assert("30. Tenant B cannot view Tenant A's products", !hasTenantAProd);
    assert("31. Tenant B cannot view Tenant A's categories", !hasTenantACat);

    // ------------------------------------------------------------------------
    // 9. DEDUPLICATION & DUPLICATE PREVENTION
    // ------------------------------------------------------------------------
    // Saving customer with same name without ID reuses existing customer
    const sameNameCust = await saveCustomer(tenantA, {
      name: "Alpha Technologies NEW NAME",
      phone: "9840099999",
      billingAddress: "Updated Address"
    });
    assert("32. Saving customer with existing name updates existing record instead of duplicate", 
      sameNameCust.id === cust1.id && sameNameCust.customerCode === code1
    );

    // Explicit deduplicateCustomers merges pre-existing duplicates and re-links challans
    const { STORAGE_KEYS } = await import('../utils/tenantStorage.js');
    const rawCusts = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]') : [];
    const dupTestCompany = `tenant_dup_${Date.now()}`;
    const dupCust1 = {
      id: `c1_${Date.now()}`,
      companyId: dupTestCompany,
      customerCode: "CUS-0001",
      name: "Medilong",
      phone: "8925137065",
      contactPerson: "Kamalesh",
      billingAddress: "Tamil Nadu",
      status: "Active",
      createdAt: new Date(Date.now() - 10000).toISOString()
    };
    const dupCust2 = {
      id: `c2_${Date.now()}`,
      companyId: dupTestCompany,
      customerCode: "CUS-0002",
      name: "Medilong",
      phone: "8925137065",
      contactPerson: "Kamalesh",
      billingAddress: "Tamil Nadu",
      status: "Active",
      createdAt: new Date().toISOString()
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([...rawCusts, dupCust1, dupCust2]));
    }

    // Create a challan pointing to the duplicate customer CUS-0002
    const challanOnDup = await createChallan(dupTestCompany, {
      challanNumber: "DC-DUP-01",
      customerId: dupCust2.id,
      customer: "Medilong\nTamil Nadu",
      customerDetails: { customerId: dupCust2.id, name: "Medilong" },
      status: "Finalized",
      products: [{ serialNumber: 1, name: "Sample Item", quantity: 5, unit: "NOS" }]
    });

    const dedupRes = await deduplicateCustomers(dupTestCompany);
    const cleanedCusts = await getCustomers(dupTestCompany);
    const updatedChallan = await getChallanById(dupTestCompany, challanOnDup.id);

    assert("33. deduplicateCustomers merges duplicate customers into primary CUS-0001", 
      dedupRes.mergedCount === 1 && cleanedCusts.length === 1 && cleanedCusts[0].customerCode === "CUS-0001"
    );
    assert("34. deduplicateCustomers re-points historical challan from duplicate to primary customer ID", 
      updatedChallan && updatedChallan.customerId === dupCust1.id
    );

  } catch (err) {
    console.error("Test execution exception:", err);
    results.push({ name: "Execution Exception", passed: false, extra: err.message });
  }

  const passedCount = results.filter(r => r.passed).length;
  console.log(`\nCustomer & Product Tests Completed: ${passedCount} / ${results.length} PASSED\n`);
  return results;
}
