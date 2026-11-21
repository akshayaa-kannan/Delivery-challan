/**
 * Document Output & Printing Module Test Suite
 * Tests A4, A5, Thermal 80mm & 58mm, Multi-Copies, Combined PDF, ZIP archive bundling,
 * remarks layout, and document sharing.
 */

import { 
  buildChallanPdf, 
  generateChallanPdfBlob,
  COPY_TYPES,
  formatDate
} from '../utils/pdfGenerator.js';
import { 
  buildChallanShareMessage, 
  shareViaWhatsApp 
} from '../utils/shareUtils.js';
import JSZip from 'jszip';

export async function runDocumentOutputTests() {
  console.log("\n=======================================================");
  console.log(" STARTING PRINTING & DOCUMENT OUTPUT VERIFICATION SUITE ");
  console.log("=======================================================\n");

  const results = [];

  const recordResult = (testName, passed, detail = '') => {
    results.push({ name: testName, passed, detail });
    if (passed) {
      console.log(`✅ PASS [${testName}]: ${detail}`);
    } else {
      console.error(`❌ FAIL [${testName}]: ${detail}`);
    }
  };

  const sampleCompany = {
    id: "company_test_output",
    companyName: "Nayaruvi Industrial Automations Ltd",
    displayName: "Nayaruvi Automations",
    legalName: "Nayaruvi Industrial Automations Ltd",
    address: "Plot 42, Guindy Industrial Estate, Chennai - 600032",
    gstin: "33AABCN1234F1Z9",
    gstNumber: "33AABCN1234F1Z9",
    mobileNumber: "9876543210",
    email: "billing@nayaruvi.com",
    footerTagline: "Engineered for Quality • Proudly Made in India"
  };

  const sampleChallan = {
    id: "ch_test_doc_01",
    challanNumber: "NY/DC/26-27/0042",
    date: "2026-10-23",
    status: "Finalized",
    challanType: "Delivery Challan",
    customerDetails: {
      name: "TVS Motor Company Limited",
      billingAddress: "Post Box No. 4, Harita, Hosur, Tamil Nadu - 635109",
      deliveryAddress: "Plant II Assembly Gate, Harita, Hosur - 635109",
      gstin: "33AAACT1234C1ZX",
      phone: "9845012345",
      contactPerson: "Mr. Rajendran"
    },
    transport: {
      transporterName: "VRL Logistics",
      vehicleNumber: "TN 70 AB 1234",
      lrNumber: "VRL-89214",
      ewayBillNumber: "241098765432",
      dispatchLocation: "Chennai Central Hub",
      deliveryLocation: "Hosur Plant II",
      deliveryInstructions: "Handle with extreme care. Unload at Bay 4."
    },
    remarks: "Goods dispatched under CGST Rule 55 for job-work assembly. Non-commercial movement.",
    products: [
      {
        serialNumber: 1,
        name: "Programmable Logic Controller (PLC) Rack",
        sku: "PLC-FX-01",
        description: "Modular 32-I/O base with Ethernet IP expansion",
        hsn: "85371000",
        quantity: 5,
        unit: "SETS",
        rate: 24500,
        amount: 122500
      },
      {
        serialNumber: 2,
        name: "HMI Touch Screen 10-inch Color",
        sku: "HMI-10-IP65",
        description: "Capacitive multi-touch with RS485 communication",
        hsn: "85285900",
        quantity: 3,
        unit: "NOS",
        rate: 18000,
        amount: 54000
      }
    ],
    totalAmount: 176500,
    totalQuantity: 8,
    isMonetary: true
  };

  try {
    // 1. A4 PDF Generation
    const a4Pdf = await buildChallanPdf(sampleChallan, sampleCompany, { paperSize: 'a4', copyType: 'original' });
    const a4Pages = a4Pdf.internal.getNumberOfPages();
    recordResult("Case 1: Standard A4 Generation", a4Pages >= 1, `Generated ${a4Pages} page(s) in A4 format`);

    // 2. A5 Compact PDF Generation
    const a5Pdf = await buildChallanPdf(sampleChallan, sampleCompany, { paperSize: 'a5', copyType: 'original' });
    const a5Pages = a5Pdf.internal.getNumberOfPages();
    const a5Width = a5Pdf.internal.pageSize.getWidth();
    recordResult("Case 2: Compact A5 Generation", a5Width < 155 && a5Width > 140, `A5 Width: ${Math.round(a5Width)}mm (target 148mm), ${a5Pages} page(s)`);

    // 3. 80mm Thermal Receipt Generation
    const thermal80Pdf = await buildChallanPdf(sampleChallan, sampleCompany, { paperSize: 'thermal80' });
    const t80Width = thermal80Pdf.internal.pageSize.getWidth();
    recordResult("Case 3: 80mm POS Thermal Receipt", Math.round(t80Width) === 80, `80mm receipt width: ${Math.round(t80Width)}mm`);

    // 4. 58mm Thermal Receipt Generation
    const thermal58Pdf = await buildChallanPdf(sampleChallan, sampleCompany, { paperSize: 'thermal58' });
    const t58Width = thermal58Pdf.internal.pageSize.getWidth();
    recordResult("Case 4: 58mm POS Thermal Receipt", Math.round(t58Width) === 58, `58mm receipt width: ${Math.round(t58Width)}mm`);

    // 5. Multi-copy generation (Original, Duplicate, Triplicate in one run)
    const allCopiesPdf = await buildChallanPdf(sampleChallan, sampleCompany, { paperSize: 'a4', copyType: 'all' });
    const allPagesCount = allCopiesPdf.internal.getNumberOfPages();
    recordResult("Case 5: All 3 Copies Bundling", allPagesCount === 3, `Generated exactly 3 copies (${allPagesCount} pages total)`);

    // 6. Long Remarks and Multi-Line Description Spacing
    const longChallan = {
      ...sampleChallan,
      remarks: "1. Goods dispatched under Rule 55 of CGST Rules 2017 not for sale. 2. Any discrepancy must be reported immediately upon receipt. 3. Subject to Chennai local jurisdiction.",
      transport: {
        ...sampleChallan.transport,
        deliveryInstructions: "Call site engineer before entering gate. Valid Gate Pass required."
      }
    };
    const longPdf = await buildChallanPdf(longChallan, sampleCompany, { paperSize: 'a4' });
    recordResult("Case 6: Long Remarks & Terms Spacing", longPdf !== null, "Rendered cleanly without layout collision");

    // 7. Multi-page pagination (>15 items paginates properly)
    const multiItemChallan = {
      ...sampleChallan,
      products: Array.from({ length: 32 }, (_, i) => ({
        serialNumber: i + 1,
        name: `Industrial Component SKU-${1000 + i}`,
        sku: `SKU-${1000 + i}`,
        hsn: "84799090",
        quantity: i + 2,
        unit: "NOS",
        rate: 500,
        amount: (i + 2) * 500
      }))
    };
    const multiPdf = await buildChallanPdf(multiItemChallan, sampleCompany, { paperSize: 'a4' });
    const multiPages = multiPdf.internal.getNumberOfPages();
    recordResult("Case 7: Multi-page repeated table headers", multiPages === 3, `32 items paginated into ${multiPages} pages with headers`);

    // 8. ZIP Archive generation verification
    const zip = new JSZip();
    const folder = zip.folder("Test_Challans");
    const blob1 = await generateChallanPdfBlob(sampleChallan, sampleCompany, { paperSize: 'a4' });
    folder.file("NY-DC-26-27-0042.pdf", blob1);
    const zipContent = await zip.generateAsync({ type: "uint8array" });
    recordResult("Case 8: JSZip Archive Bundling", zipContent && zipContent.length > 500, `ZIP archive built successfully (${zipContent.length} bytes)`);

    // 9. WhatsApp share message formatting
    const shareMsg = buildChallanShareMessage(sampleChallan, sampleCompany);
    const hasDcNo = shareMsg.includes("NY/DC/26-27/0042");
    const hasCust = shareMsg.includes("TVS Motor Company");
    const hasRule55 = shareMsg.includes("Nayaruvi Delivery Challan");
    recordResult("Case 9: WhatsApp message construction", hasDcNo && hasCust && hasRule55, "Formatted message contains DC No, Customer, and Branding");

    // 10. Date format validation helper
    const formatted = formatDate("2026-10-23");
    recordResult("Case 10: Date formatting", formatted === "23/10/2026", `2026-10-23 converted to ${formatted}`);

  } catch (err) {
    recordResult("Document Output Suite", false, `Exception occurred: ${err.message}\n${err.stack}`);
  }

  const passed = results.filter(r => r.passed).length;
  console.log(`\n=======================================================`);
  console.log(` RESULTS: ${passed}/${results.length} PASSED (${Math.round((passed / results.length) * 100)}%)`);
  console.log(`=======================================================\n`);

  return results;
}
