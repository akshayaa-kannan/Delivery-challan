import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Printer, 
  Eye, 
  CheckCircle, 
  ArrowLeft, 
  Building2, 
  Truck, 
  Scale, 
  RotateCcw, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Search,
  Loader2,
  Layers,
  Warehouse
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { 
  getCustomers, 
  saveCustomer, 
  getProducts, 
  saveProduct, 
  generateNextChallanNumber, 
  getChallanSettings, 
  getChallans,
  getTransporters,
  saveTransporter,
  getWarehouses,
  getDefaultWarehouse,
  calculateCurrentBalance
} from '../utils/storage';

import { 
  getFinancialYear, 
  INDIAN_STATES, 
  STANDARD_UOMS, 
  CHALLAN_TYPES, 
  PACKAGE_TYPES, 
  GST_RATES, 
  WEIGHT_UNITS,
  WEIGHT_BASES,
  TRANSPORTER_TYPES,
  VEHICLE_TYPES,
  FREIGHT_PAYMENT_RESPONSIBILITIES,
  validateGstin, 
  validateVehicleNumber 
} from '../utils/indianBusiness';

import { 
  formatCurrency, 
  calculateLineItemBreakdown, 
  calculateTotals, 
  calculateNetWeight,
  calculateShipmentWeights,
  weightToKg
} from '../utils/calculations';

import AddCustomerModal from './AddCustomerModal';
import AddProductModal from './AddProductModal';
import TransporterModal from './TransporterModal';
import ChallanPreviewModal from './ChallanPreviewModal';

export default function ChallanForm({ initialData, preselectedCustomer, onSave, onCancel, triggerDirectPrint, triggerPdfDownload }) {
  const { currentCompany } = useAuth();

  // Primary Metadata States
  const [challanNumber, setChallanNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [challanType, setChallanType] = useState('Delivery Challan');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
  const [workOrderNumber, setWorkOrderNumber] = useState('');
  const [jobWorkRef, setJobWorkRef] = useState('');
  const [financialYear, setFinancialYear] = useState(getFinancialYear().fyCode);
  const [status, setStatus] = useState('Draft');
  const [remarks, setRemarks] = useState('');
  const [isMonetary, setIsMonetary] = useState(true);

  // Customer Section States
  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerCode, setSelectedCustomerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerStateCode, setCustomerStateCode] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [selectedAddressLabel, setSelectedAddressLabel] = useState('Primary Delivery Location');
  const [availableAddresses, setAvailableAddresses] = useState([]);
  const [custSearch, setCustSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  // Delivery & Transport Section States
  const [showTransportSection, setShowTransportSection] = useState(true);
  const [transportersList, setTransportersList] = useState([]);
  const [selectedTransporterId, setSelectedTransporterId] = useState('');
  const [warehousesList, setWarehousesList] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [isSelfDelivery, setIsSelfDelivery] = useState(false);
  const [isTransporterModalOpen, setIsTransporterModalOpen] = useState(false);
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [dispatchLocation, setDispatchLocation] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [transporterCode, setTransporterCode] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('LCV (Light Commercial Vehicle)');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [ewayBillNumber, setEwayBillNumber] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Freight Details
  const [showFreightSection, setShowFreightSection] = useState(false);
  const [freightAmount, setFreightAmount] = useState('');
  const [freightPaymentResponsibility, setFreightPaymentResponsibility] = useState('To Pay (Consignee)');
  const [freightReference, setFreightReference] = useState('');
  const [freightRemarks, setFreightRemarks] = useState('');

  // Products Table States
  const [productsMaster, setProductsMaster] = useState([]);
  const [products, setProducts] = useState([
    {
      serialNumber: 1,
      name: '',
      sku: '',
      description: '',
      hsn: '',
      quantity: 1,
      unit: 'NOS',
      rate: '',
      discount: 0,
      taxRate: 18,
      taxAmount: 0,
      amount: 0,
      remarks: '',
      returnableQty: 1,
      unitNetWeight: '',
      unitPackagingWeight: '',
      weightUnit: 'Kg',
      weightBasis: 'NET_PER_UNIT'
    }
  ]);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [activeProductRowIndex, setActiveProductRowIndex] = useState(null);
  const [activeProdDropdownIndex, setActiveProdDropdownIndex] = useState(null);

  // Weight & Packaging States
  const [enableWeights, setEnableWeights] = useState(false);
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  const [netWeight, setNetWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('Kg');
  const [numberOfPackages, setNumberOfPackages] = useState('');
  const [packageType, setPackageType] = useState('Boxes');
  const [packageTareWeight, setPackageTareWeight] = useState('');

  // Returnable Goods States
  const [isReturnable, setIsReturnable] = useState(false);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [returnReason, setReturnReason] = useState('Job Work Processing');

  // Form State / Lifecycle
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [existingChallans, setExistingChallans] = useState([]);

  // Auto-compute Financial Year when date changes
  useEffect(() => {
    if (date) {
      const fy = getFinancialYear(date);
      setFinancialYear(fy.fyCode);
    }
  }, [date]);

  // Auto-calculate Net Weight
  useEffect(() => {
    if (enableWeights) {
      const { netWeight: computedNet, isValid, error } = calculateNetWeight(grossWeight, tareWeight);
      if (isValid) {
        setNetWeight(computedNet > 0 ? computedNet : '');
        setErrors(prev => {
          const next = { ...prev };
          delete next.weights;
          return next;
        });
      } else {
        setErrors(prev => ({ ...prev, weights: error }));
      }
    }
  }, [grossWeight, tareWeight, enableWeights]);

  // Sync Returnable flag with Challan Type
  useEffect(() => {
    if (challanType === 'Returnable Challan') {
      setIsReturnable(true);
    }
  }, [challanType]);

  // Click outside listener for customer dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.customer-search-container')) {
        setShowCustDropdown(false);
      }
      if (!e.target.closest('.product-search-container')) {
        setActiveProdDropdownIndex(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Unsaved changes browser prompt
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isSubmitting]);

  // Initialize form with existing or new data
  useEffect(() => {
    const loadMasterData = async () => {
      const custs = await getCustomers(currentCompany?.id);
      setCustomersList(custs);

      const prods = await getProducts(currentCompany?.id);
      setProductsMaster(prods);

      const challans = await getChallans(currentCompany?.id);
      setExistingChallans(challans);

      const trans = await getTransporters(currentCompany?.id);
      setTransportersList(trans);

      const whs = await getWarehouses(currentCompany?.id);
      setWarehousesList(whs || []);

      if (initialData) {
        // Edit mode
        setSelectedWarehouseId(initialData.warehouseId || initialData.transportDetails?.warehouseId || (whs?.[0]?.id || ''));
        setChallanNumber(initialData.challanNumber || '');
        setDate(initialData.date || new Date().toISOString().split('T')[0]);
        setChallanType(initialData.challanType || 'Delivery Challan');
        setReferenceNumber(initialData.referenceNumber || '');
        setPurchaseOrderNumber(initialData.purchaseOrderNumber || '');
        setWorkOrderNumber(initialData.workOrderNumber || '');
        setJobWorkRef(initialData.jobWorkRef || '');
        setFinancialYear(initialData.financialYear || getFinancialYear(initialData.date).fyCode);
        setStatus(initialData.status || 'Finalized');
        setRemarks(initialData.remarks || '');
        setIsMonetary(initialData.isMonetary !== false);

        // Customer details
        const custDetails = initialData.customerDetails || {};
        setCustomerName(custDetails.name || (typeof initialData.customer === 'string' ? initialData.customer.split('\n')[0] : ''));
        setContactPerson(custDetails.contactPerson || '');
        setCustomerPhone(custDetails.phone || '');
        setCustomerEmail(custDetails.email || '');
        setCustomerGstin(custDetails.gstin || '');
        setCustomerState(custDetails.state || '');
        setCustomerStateCode(custDetails.stateCode || '');
        setBillingAddress(custDetails.billingAddress || (typeof initialData.customer === 'string' ? initialData.customer.split('\n').slice(1).join('\n') : ''));
        setDeliveryAddress(custDetails.deliveryAddress || custDetails.billingAddress || '');
        setSameAsBilling(custDetails.billingAddress === custDetails.deliveryAddress || !custDetails.deliveryAddress);

        // Transport
        const tr = initialData.transport || initialData.transportDetails || {};
        setDispatchDate(tr.dispatchDate || initialData.date || '');
        setExpectedDeliveryDate(tr.expectedDeliveryDate || '');
        setDispatchLocation(tr.dispatchLocation || currentCompany?.city || '');
        setDeliveryLocation(tr.deliveryLocation || custDetails.deliveryAddress || '');
        setTransporterName(tr.transporterName || '');
        setTransporterCode(tr.transporterCode || '');
        setSelectedTransporterId(tr.transporterId || '');
        setIsSelfDelivery(Boolean(tr.isSelfDelivery));
        setVehicleNumber(tr.vehicleNumber || initialData.vehicleNumber || '');
        setVehicleType(tr.vehicleType || 'LCV (Light Commercial Vehicle)');
        setDriverName(tr.driverName || '');
        setDriverPhone(tr.driverPhone || '');
        setLrNumber(tr.lrNumber || '');
        setEwayBillNumber(tr.ewayBillNumber || '');
        setDeliveryInstructions(tr.deliveryInstructions || '');

        // Freight
        setFreightAmount(tr.freightAmount || '');
        setFreightPaymentResponsibility(tr.freightPaymentResponsibility || 'To Pay (Consignee)');
        setFreightReference(tr.freightReference || '');
        setFreightRemarks(tr.freightRemarks || '');
        if (tr.freightAmount) setShowFreightSection(true);

        // Weights
        if (initialData.weights?.enabled) {
          setEnableWeights(true);
          setGrossWeight(initialData.weights.grossWeight || '');
          setTareWeight(initialData.weights.tareWeight || '');
          setNetWeight(initialData.weights.netWeight || '');
          setWeightUnit(initialData.weights.weightUnit || 'Kg');
          setNumberOfPackages(initialData.weights.numberOfPackages || '');
          setPackageType(initialData.weights.packageType || 'Boxes');
          setPackageTareWeight(initialData.weights.packageTareWeight || '');
        }

        // Returnable
        if (initialData.returnable?.isReturnable) {
          setIsReturnable(true);
          setExpectedReturnDate(initialData.returnable.expectedReturnDate || '');
          setReturnReason(initialData.returnable.returnReason || 'Job Work Processing');
        }

        // Products
        if (initialData.products && initialData.products.length > 0) {
          setProducts(initialData.products.map((p, idx) => ({
            serialNumber: idx + 1,
            productId: p.productId || p.id || null,
            name: p.name || '',
            sku: p.sku || '',
            description: p.description || '',
            hsn: p.hsn || '',
            quantity: p.quantity !== undefined ? p.quantity : 1,
            unit: p.unit || 'NOS',
            rate: p.rate !== undefined ? p.rate : '',
            discount: p.discount || 0,
            taxRate: p.taxRate !== undefined ? p.taxRate : 18,
            taxAmount: p.taxAmount || 0,
            amount: p.amount || 0,
            remarks: p.remarks || '',
            returnableQty: p.returnableQty !== undefined ? p.returnableQty : p.quantity || 1,
            unitNetWeight: p.unitNetWeight !== undefined && p.unitNetWeight !== null ? p.unitNetWeight : (p.unitWeight || ''),
            unitPackagingWeight: p.unitPackagingWeight !== undefined && p.unitPackagingWeight !== null ? p.unitPackagingWeight : (p.packagingWeight || ''),
            weightUnit: p.weightUnit || 'Kg',
            weightBasis: p.weightBasis || 'NET_PER_UNIT'
          })));
        }
      } else {
        // Create mode
        const defWh = (whs || []).find(w => w.isDefault && w.status === 'Active') || (whs || []).find(w => w.status === 'Active') || whs?.[0];
        if (defWh) {
          setSelectedWarehouseId(defWh.id);
        }
        const generatedNo = await generateNextChallanNumber(currentCompany?.id, date);
        setChallanNumber(generatedNo);
        setDispatchLocation(currentCompany?.city ? `${currentCompany.displayName || currentCompany.legalName}, ${currentCompany.city}` : '');
        if (preselectedCustomer) {
          handleSelectCustomer(preselectedCustomer);
        }
      }
    };

    loadMasterData();
  }, [initialData, preselectedCustomer, currentCompany?.id]);

  // Recalculate totals
  const totals = calculateTotals(products);

  // Recalculate shipment weights & packaging breakdown with unit conversion & completeness
  const shipmentWeights = calculateShipmentWeights(products, {
    packageTareWeight: parseFloat(packageTareWeight) || 0,
    weightUnit,
    numberOfPackages: parseInt(numberOfPackages, 10) || 0,
    packageType
  });

  // Customer Search Filtering
  const filteredCustomers = customersList.filter(c => {
    const q = custSearch.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.gstin || '').toLowerCase().includes(q)
    );
  });

  const formatAddressString = (addr) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    const parts = [
      addr.address1,
      addr.address2,
      addr.city,
      addr.district,
      addr.state,
      addr.pincode
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Handle selecting an existing customer
  const handleSelectCustomer = (cust) => {
    if (!cust) return;
    setSelectedCustomerId(cust.id || '');
    setSelectedCustomerCode(cust.customerCode || '');
    setCustomerName(cust.name || '');
    setContactPerson(cust.contactPerson || '');
    setCustomerPhone(cust.phone || '');
    setCustomerEmail(cust.email || '');
    setCustomerGstin(cust.gstin || '');
    setCustomerState(cust.state || '');
    setCustomerStateCode(cust.stateCode || (cust.gstin ? cust.gstin.slice(0, 2) : ''));

    const bAddr = formatAddressString(cust.billingAddress) || cust.address || '';
    const dAddr = formatAddressString(cust.deliveryAddress) || cust.deliveryAddressText || bAddr;

    setBillingAddress(bAddr);
    setDeliveryAddress(dAddr);
    setSameAsBilling(bAddr === dAddr || !dAddr);
    setAvailableAddresses(cust.deliveryAddresses || []);
    setDeliveryLocation(dAddr || bAddr);

    setShowCustDropdown(false);
    setCustSearch('');
    setIsDirty(true);
  };

  // Callback when a new customer is added through modal
  const handleCustomerAdded = async (newCustomer) => {
    const saved = await saveCustomer(newCustomer, currentCompany?.id);
    const updatedList = await getCustomers(currentCompany?.id);
    setCustomersList(updatedList);
    handleSelectCustomer(saved);
  };

  // Product Row Operations
  const handleProductChange = (index, field, value) => {
    setIsDirty(true);
    const updated = [...products];
    const row = { ...updated[index] };

    row[field] = value;

    if (field === 'name' && value && productsMaster.length > 0) {
      const matched = productsMaster.find(p => p.name.toLowerCase() === value.trim().toLowerCase());
      if (matched) {
        row.productId = matched.id || null;
        if (!row.hsn && matched.hsn) row.hsn = matched.hsn;
        if (!row.sku && (matched.sku || matched.productCode)) row.sku = matched.sku || matched.productCode;
        if (!row.unit && matched.unit) row.unit = matched.unit;
        if (matched.taxRate !== undefined && (row.taxRate === undefined || row.taxRate === 18)) {
          row.taxRate = matched.taxRate;
        }
        const mRate = matched.standardRate !== undefined && matched.standardRate !== ''
          ? matched.standardRate
          : (matched.rate !== undefined && matched.rate !== '' ? matched.rate : (matched.unitPrice !== undefined ? matched.unitPrice : ''));
        if (mRate !== '' && (row.rate === '' || row.rate === 0 || row.rate === '0')) {
          row.rate = mRate;
          const breakdown = calculateLineItemBreakdown(
            row.quantity || 1,
            mRate,
            row.discount || 0,
            row.taxRate || 18
          );
          row.taxAmount = breakdown.taxAmount;
          row.amount = breakdown.lineTotal;
        }
      }
    }

    if (field === 'quantity' || field === 'rate' || field === 'discount' || field === 'taxRate') {
      const breakdown = calculateLineItemBreakdown(
        field === 'quantity' ? value : row.quantity,
        field === 'rate' ? value : row.rate,
        field === 'discount' ? value : row.discount,
        field === 'taxRate' ? value : row.taxRate
      );
      row.taxAmount = breakdown.taxAmount;
      row.amount = breakdown.lineTotal;
      if (field === 'quantity' && !row.returnableQty) {
        row.returnableQty = value;
      }
    }

    updated[index] = row;
    setProducts(updated);

    if (touched) {
      validateForm(updated);
    }
  };

  const handleSelectProduct = (index, prod) => {
    setIsDirty(true);
    const updated = [...products];
    const current = updated[index];

    const prodRate = prod.standardRate !== undefined && prod.standardRate !== ''
      ? prod.standardRate 
      : (prod.rate !== undefined && prod.rate !== '' 
        ? prod.rate 
        : (prod.unitPrice !== undefined && prod.unitPrice !== '' 
          ? prod.unitPrice 
          : (prod.sellingPrice !== undefined && prod.sellingPrice !== '' ? prod.sellingPrice : '')));

    const prodUom = prod.unitOfMeasurement || prod.uom || prod.unit || current.unit || 'NOS';
    const prodCode = prod.productCode || prod.sku || current.sku || '';
    const prodHsn = prod.hsnSac || prod.hsn || current.hsn || '';
    const prodTaxRate = prod.taxRate !== undefined && prod.taxRate !== '' ? prod.taxRate : (current.taxRate !== undefined ? current.taxRate : 18);

    const effectiveRate = prodRate !== '' ? prodRate : (current.rate !== undefined && current.rate !== '' ? current.rate : '');

    const breakdown = calculateLineItemBreakdown(
      current.quantity || 1,
      effectiveRate !== '' ? effectiveRate : 0,
      current.discount || 0,
      prodTaxRate
    );

    updated[index] = {
      ...current,
      productId: prod.id || null,
      name: prod.name,
      sku: prodCode,
      description: prod.description || current.description || '',
      hsn: prodHsn,
      unit: prodUom,
      rate: effectiveRate,
      taxRate: prodTaxRate,
      taxAmount: breakdown.taxAmount,
      amount: breakdown.lineTotal,
      unitNetWeight: prod.unitWeight !== undefined && prod.unitWeight !== null ? prod.unitWeight : (current.unitNetWeight || ''),
      unitPackagingWeight: prod.packagingWeight !== undefined && prod.packagingWeight !== null ? prod.packagingWeight : (current.unitPackagingWeight || ''),
      weightUnit: prod.weightUnit || current.weightUnit || 'Kg',
      weightBasis: prod.weightBasis || current.weightBasis || 'NET_PER_UNIT'
    };

    setProducts(updated);
    setActiveProdDropdownIndex(null);
  };

  const handleProductAdded = async (newProd) => {
    const saved = await saveProduct(newProd, currentCompany?.id);
    const updatedMaster = await getProducts(currentCompany?.id);
    setProductsMaster(updatedMaster);
    if (activeProductRowIndex !== null && products[activeProductRowIndex]) {
      handleSelectProduct(activeProductRowIndex, saved);
    }
  };

  const addProductRow = () => {
    setIsDirty(true);
    setProducts(prev => [
      ...prev,
      {
        serialNumber: prev.length + 1,
        name: '',
        sku: '',
        description: '',
        hsn: '',
        quantity: 1,
        unit: 'NOS',
        rate: '',
        discount: 0,
        taxRate: 18,
        taxAmount: 0,
        amount: 0,
        remarks: '',
        returnableQty: 1,
        unitNetWeight: '',
        unitPackagingWeight: '',
        weightUnit: 'Kg',
        weightBasis: 'NET_PER_UNIT'
      }
    ]);
  };

  const duplicateProductRow = (index) => {
    setIsDirty(true);
    const rowToCopy = { ...products[index] };
    const updated = [...products];
    updated.splice(index + 1, 0, {
      ...rowToCopy,
      serialNumber: updated.length + 1
    });
    setProducts(updated.map((p, idx) => ({ ...p, serialNumber: idx + 1 })));
  };

  const removeProductRow = (index) => {
    setIsDirty(true);
    if (products.length === 1) {
      setProducts([{
        serialNumber: 1,
        name: '',
        sku: '',
        description: '',
        hsn: '',
        quantity: 1,
        unit: 'NOS',
        rate: '',
        discount: 0,
        taxRate: 18,
        taxAmount: 0,
        amount: 0,
        remarks: '',
        returnableQty: 1,
        unitNetWeight: '',
        unitPackagingWeight: '',
        weightUnit: 'Kg',
        weightBasis: 'NET_PER_UNIT'
      }]);
      return;
    }
    const updated = products.filter((_, idx) => idx !== index);
    setProducts(updated.map((p, idx) => ({ ...p, serialNumber: idx + 1 })));
  };

  const moveProductRow = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= products.length) return;
    setIsDirty(true);
    const updated = [...products];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setProducts(updated.map((p, idx) => ({ ...p, serialNumber: idx + 1 })));
  };

  // Validation
  const validateForm = (prodList = products, isFinalizing = false) => {
    const errs = {};

    if (!customerName.trim()) {
      errs.customer = 'Customer / Consignee name is required';
    }

    if (!challanNumber.trim()) {
      errs.challanNumber = 'Challan number is required';
    } else {
      // Check collision with existing finalized challans
      const collision = existingChallans.find(c => 
        c.id !== initialData?.id &&
        (c.challanNumber || '').trim().toLowerCase() === challanNumber.trim().toLowerCase() &&
        c.status !== 'Cancelled'
      );
      if (collision && (isFinalizing || status === 'Finalized')) {
        errs.challanNumber = `Delivery Challan number "${challanNumber}" already exists`;
      }
    }

    if (!date) {
      errs.date = 'Challan date is required';
    }

    // Vehicle validation if entered
    if (vehicleNumber) {
      const vVal = validateVehicleNumber(vehicleNumber);
      if (!vVal.isValid) {
        errs.vehicleNumber = vVal.message;
      }
    }

    // GSTIN validation if entered
    if (customerGstin) {
      const gVal = validateGstin(customerGstin);
      if (!gVal.isValid) {
        errs.customerGstin = gVal.message;
      }
    }

    // Products validation
    const validRows = prodList.filter(p => p.name.trim());
    if (validRows.length === 0) {
      errs.products = 'At least one valid item is required';
    } else {
      const rowErrs = [];
      prodList.forEach((p, idx) => {
        if (p.name.trim() || p.quantity || p.rate) {
          const rErr = {};
          if (!p.name.trim()) rErr.name = 'Required';
          const qty = parseFloat(p.quantity);
          if (isNaN(qty) || qty <= 0) rErr.quantity = 'Must be > 0';
          if (p.rate && parseFloat(p.rate) < 0) rErr.rate = 'Cannot be negative';
          if (Object.keys(rErr).length > 0) rowErrs[idx] = rErr;
        }
      });
      if (rowErrs.length > 0) {
        errs.productRows = rowErrs;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Construct complete clean challan document payload
  const buildChallanPayload = (targetStatus) => {
    const cleanedProducts = products
      .filter(p => p.name.trim() && parseFloat(p.quantity) > 0)
      .map((p, idx) => ({
        serialNumber: idx + 1,
        productId: p.productId || null,
        name: p.name.trim(),
        sku: p.sku ? p.sku.trim() : '',
        description: p.description ? p.description.trim() : '',
        hsn: p.hsn ? p.hsn.trim() : '',
        quantity: parseFloat(p.quantity),
        unit: p.unit || 'NOS',
        rate: p.rate !== '' && p.rate !== undefined ? parseFloat(p.rate) : 0,
        discount: parseFloat(p.discount) || 0,
        taxRate: parseFloat(p.taxRate) || 0,
        taxAmount: parseFloat(p.taxAmount) || 0,
        amount: parseFloat(p.amount) || 0,
        remarks: p.remarks ? p.remarks.trim() : '',
        returnableQty: p.returnableQty !== undefined ? parseFloat(p.returnableQty) : parseFloat(p.quantity),
        unitNetWeight: p.unitNetWeight !== undefined && p.unitNetWeight !== '' ? parseFloat(p.unitNetWeight) : null,
        unitPackagingWeight: p.unitPackagingWeight !== undefined && p.unitPackagingWeight !== '' ? parseFloat(p.unitPackagingWeight) : null,
        weightUnit: p.weightUnit || 'Kg',
        weightBasis: p.weightBasis || 'NET_PER_UNIT',
        lineNetWeight: p.unitNetWeight ? Math.round(parseFloat(p.quantity) * parseFloat(p.unitNetWeight) * 1000) / 1000 : null,
        lineGrossWeight: (p.unitNetWeight || p.unitPackagingWeight) ? Math.round(parseFloat(p.quantity) * ((parseFloat(p.unitNetWeight) || 0) + (parseFloat(p.unitPackagingWeight) || 0)) * 1000) / 1000 : null
      }));

    // Resolve customer ID & code
    let resolvedCustId = selectedCustomerId;
    let resolvedCustCode = selectedCustomerCode;
    if (!resolvedCustId && customerName.trim()) {
      const match = customersList.find(c => c.name && c.name.trim().toLowerCase() === customerName.trim().toLowerCase());
      if (match) {
        resolvedCustId = match.id;
        resolvedCustCode = match.customerCode || '';
      }
    }

    // Construct customer snapshot
    const customerSnapshot = {
      id: resolvedCustId || null,
      customerId: resolvedCustId || null,
      customerCode: resolvedCustCode || '',
      name: customerName.trim(),
      contactPerson: contactPerson.trim(),
      phone: customerPhone.trim(),
      email: customerEmail.trim(),
      gstin: customerGstin.trim().toUpperCase(),
      state: customerState,
      stateCode: customerStateCode,
      billingAddress: billingAddress.trim(),
      deliveryAddress: (sameAsBilling ? billingAddress : deliveryAddress).trim()
    };

    // Format multiline string for backward compatibility
    const customerLegacyString = [
      customerSnapshot.name,
      customerSnapshot.billingAddress,
      customerSnapshot.gstin ? `GSTIN: ${customerSnapshot.gstin}` : '',
      customerSnapshot.phone ? `Mobile: ${customerSnapshot.phone}` : ''
    ].filter(Boolean).join('\n');

    return {
      customerId: resolvedCustId || null,
      challanNumber: challanNumber.trim(),
      date,
      challanType,
      referenceNumber: referenceNumber.trim(),
      purchaseOrderNumber: purchaseOrderNumber.trim(),
      workOrderNumber: workOrderNumber.trim(),
      jobWorkRef: jobWorkRef.trim(),
      financialYear,
      status: targetStatus,
      isMonetary,
      remarks: remarks.trim(),

      // Backward compatible customer string + modern structured snapshot
      customer: customerLegacyString,
      customerDetails: customerSnapshot,

      // Issue Warehouse
      warehouseId: selectedWarehouseId || null,
      warehouseName: warehousesList.find(w => w.id === selectedWarehouseId)?.name || null,

      // Transport metadata
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      transport: {
        warehouseId: selectedWarehouseId || null,
        warehouseName: warehousesList.find(w => w.id === selectedWarehouseId)?.name || null,
        transporterId: selectedTransporterId || null,
        transporterCode: transporterCode || '',
        transporterName: isSelfDelivery ? 'Self Delivery' : transporterName.trim(),
        isSelfDelivery,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType,
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        lrNumber: lrNumber.trim(),
        ewayBillNumber: ewayBillNumber.trim(),
        dispatchDate,
        expectedDeliveryDate,
        dispatchLocation: dispatchLocation.trim(),
        deliveryLocation: (deliveryLocation || customerSnapshot.deliveryAddress).trim(),
        deliveryInstructions: deliveryInstructions.trim(),
        freightAmount: freightAmount !== '' ? parseFloat(freightAmount) : null,
        freightPaymentResponsibility,
        freightReference: freightReference.trim(),
        freightRemarks: freightRemarks.trim()
      },

      // Weights metadata
      weights: {
        enabled: enableWeights,
        grossWeight: grossWeight ? parseFloat(grossWeight) : (shipmentWeights.totalGrossWeight || null),
        tareWeight: tareWeight ? parseFloat(tareWeight) : (shipmentWeights.totalPackagingWeight || null),
        netWeight: netWeight ? parseFloat(netWeight) : (shipmentWeights.totalNetWeight || null),
        totalGrossWeight: grossWeight ? parseFloat(grossWeight) : (shipmentWeights.totalGrossWeight || 0),
        totalNetWeight: netWeight ? parseFloat(netWeight) : (shipmentWeights.totalNetWeight || 0),
        totalPackagingWeight: tareWeight ? parseFloat(tareWeight) : (shipmentWeights.totalPackagingWeight || 0),
        packageTareWeight: packageTareWeight ? parseFloat(packageTareWeight) : 0,
        grossWeightKg: weightToKg(grossWeight ? parseFloat(grossWeight) : (shipmentWeights.totalGrossWeight || 0), weightUnit),
        netWeightKg: weightToKg(netWeight ? parseFloat(netWeight) : (shipmentWeights.totalNetWeight || 0), weightUnit),
        weightUnit,
        numberOfPackages: numberOfPackages ? parseInt(numberOfPackages, 10) : (shipmentWeights.totalPackages || null),
        packageType: packageType || shipmentWeights.packageType || 'Boxes',
        completeness: shipmentWeights.completeness,
        missingItemsCount: shipmentWeights.missingItemsCount,
        completenessMessage: shipmentWeights.completenessMessage
      },
      totalGrossWeight: grossWeight ? parseFloat(grossWeight) : (shipmentWeights.totalGrossWeight || 0),
      totalNetWeight: netWeight ? parseFloat(netWeight) : (shipmentWeights.totalNetWeight || 0),
      totalPackages: numberOfPackages ? parseInt(numberOfPackages, 10) : (shipmentWeights.totalPackages || null),
      packagingType: packageType,

      // Returnable metadata
      returnable: {
        isReturnable,
        expectedReturnDate: isReturnable ? expectedReturnDate : null,
        returnReason: isReturnable ? returnReason : '',
        returnStatus: isReturnable ? 'Pending' : 'N/A'
      },

      // Products & Totals
      products: cleanedProducts,
      totalQuantity: totals.totalQuantity,
      totalAmount: isMonetary ? totals.totalAmount : 0,
      totalTax: isMonetary ? totals.totalTax : 0,
      totalDiscount: isMonetary ? totals.totalDiscount : 0,
      unitSummary: totals.unitSummary,
      itemCount: totals.itemCount
    };
  };

  // Save Handlers
  const handleSaveAction = async (targetStatus = 'Draft', actionType = 'navigate') => {
    setTouched(true);
    const isFinalizing = targetStatus === 'Finalized';
    const isValid = validateForm(products, isFinalizing);

    if (!isValid) {
      alert("Please check and resolve the required validation errors indicated in red before proceeding.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildChallanPayload(targetStatus);

      // Save customer to master suggestions automatically
      if (payload.customerDetails?.name) {
        saveCustomer(payload.customerDetails, currentCompany?.id).catch(console.warn);
      }

      // Save products to master catalog
      payload.products.forEach(p => {
        if (p.name) {
          saveProduct({
            id: p.productId || null,
            productId: p.productId || null,
            name: p.name,
            sku: p.sku,
            description: p.description,
            hsn: p.hsn,
            unit: p.unit,
            rate: p.rate,
            taxRate: p.taxRate
          }, currentCompany?.id).catch(console.warn);
        }
      });

      setIsDirty(false);

      if (actionType === 'print') {
        await onSave(payload, true);
      } else if (actionType === 'createAnother') {
        await onSave(payload, false);
        // Reset form for next entry
        const nextNo = await generateNextChallanNumber(currentCompany?.id, date);
        setChallanNumber(nextNo);
        setCustomerName('');
        setBillingAddress('');
        setDeliveryAddress('');
        setCustomerGstin('');
        setProducts([{
          serialNumber: 1,
          name: '',
          sku: '',
          description: '',
          hsn: '',
          quantity: 1,
          unit: 'NOS',
          rate: '',
          discount: 0,
          taxRate: 18,
          taxAmount: 0,
          amount: 0,
          remarks: '',
          returnableQty: 1
        }]);
        setTouched(false);
        alert(`Challan saved! Form ready for ${nextNo}`);
      } else {
        await onSave(payload, false);
      }
    } catch (err) {
      alert(err.message || "Failed to save challan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (isDirty) {
      if (window.confirm("You have unsaved changes in this challan. Are you sure you want to discard them?")) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  // Preview Document object built on the fly
  const currentPreviewData = buildChallanPayload(status);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* 1. Header & Company Profile Context Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          {currentCompany?.logoUrl ? (
            <img 
              src={currentCompany.logoUrl} 
              alt="Company Logo" 
              className="w-14 h-14 object-contain rounded-xl border border-slate-100 p-1"
            />
          ) : (
            <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-amber-400 font-black text-xl shadow-inner">
              {currentCompany?.displayName?.slice(0, 2).toUpperCase() || 'DC'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {currentCompany?.displayName || currentCompany?.legalName || 'Delivery Challan Workspace'}
              </h2>
              {currentCompany?.gstin && (
                <span className="text-[10px] bg-slate-100 font-mono font-bold px-2 py-0.5 rounded text-slate-700 border border-slate-200">
                  GST: {currentCompany.gstin}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {initialData ? `Editing Document: ${initialData.challanNumber}` : 'Create a professional delivery challan compliant with Indian CGST Rule 55'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleCancelClick}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Eye size={14} />
            Preview Document
          </button>
        </div>
      </div>

      {/* 2. Primary Form Sections */}
      <form onSubmit={(e) => { e.preventDefault(); handleSaveAction('Finalized'); }} className="space-y-6">

        {/* SECTION A: CHALLAN METADATA & GENERAL SETTINGS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="text-amber-500" size={18} />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                1. Challan Identification & Reference
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={isMonetary}
                  onChange={(e) => { setIsMonetary(e.target.checked); setIsDirty(true); }}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Include Prices & Taxes (Commercial Valuation)</span>
              </label>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Challan Number */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Challan Number <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Auto-Generated</span>
              </div>
              <input
                type="text"
                value={challanNumber}
                onChange={(e) => { setChallanNumber(e.target.value); setIsDirty(true); }}
                className={`w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border ${
                  errors.challanNumber ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900`}
                placeholder="e.g. TEK/26-27/0001"
              />
              {errors.challanNumber && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.challanNumber}</p>
              )}
            </div>

            {/* Challan Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Challan Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setIsDirty(true); }}
                className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
              />
              {errors.date && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.date}</p>
              )}
            </div>

            {/* Challan Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Challan Purpose / Type <span className="text-red-500">*</span>
              </label>
              <select
                value={challanType}
                onChange={(e) => { setChallanType(e.target.value); setIsDirty(true); }}
                className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
              >
                {CHALLAN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Financial Year */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Financial Year
              </label>
              <input
                type="text"
                value={financialYear}
                onChange={(e) => { setFinancialYear(e.target.value); setIsDirty(true); }}
                className="w-full px-3 py-2 text-sm font-mono font-semibold rounded-xl border border-slate-300 bg-slate-50 text-slate-700"
                placeholder="26-27"
              />
            </div>

            {/* Purchase Order Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Purchase Order (PO) No
              </label>
              <input
                type="text"
                value={purchaseOrderNumber}
                onChange={(e) => { setPurchaseOrderNumber(e.target.value); setIsDirty(true); }}
                placeholder="e.g. PO-84920"
                className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            {/* Work Order Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Work Order (WO) No
              </label>
              <input
                type="text"
                value={workOrderNumber}
                onChange={(e) => { setWorkOrderNumber(e.target.value); setIsDirty(true); }}
                placeholder="e.g. WO-2026/04"
                className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            {/* Job Work Reference (Prominent for Job Work Challans) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Job Work Reference
              </label>
              <input
                type="text"
                value={jobWorkRef}
                onChange={(e) => { setJobWorkRef(e.target.value); setIsDirty(true); }}
                placeholder="e.g. Rule 55 Job Work Ref"
                className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>

            {/* Reference / External Document Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                General Ref / Quotation No
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => { setReferenceNumber(e.target.value); setIsDirty(true); }}
                placeholder="e.g. QT-9901"
                className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* SECTION B: CUSTOMER & CONSIGNEE DETAILS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="text-amber-500" size={18} />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                2. Customer & Consignee Details
              </h3>
            </div>

            <div className="flex items-center gap-3">
              {/* Autocomplete Search Input */}
              <div className="relative customer-search-container">
                <div className="flex items-center bg-white border border-slate-300 rounded-xl px-2.5 py-1 focus-within:ring-2 focus-within:ring-blue-500">
                  <Search size={14} className="text-slate-400 mr-1.5" />
                  <input
                    type="text"
                    placeholder="Search saved customers..."
                    value={custSearch}
                    onFocus={() => setShowCustDropdown(true)}
                    onChange={(e) => {
                      setCustSearch(e.target.value);
                      setShowCustDropdown(true);
                    }}
                    className="text-xs bg-transparent outline-none text-slate-800 font-semibold w-40 sm:w-56"
                  />
                </div>

                {showCustDropdown && (
                  <div className="absolute right-0 mt-1 z-40 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        No matching customer found.
                      </div>
                    ) : (
                      <div className="p-1 divide-y divide-slate-100">
                        {filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCustomer(c)}
                            className="w-full text-left p-2.5 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <div className="font-bold text-xs text-slate-900 uppercase">{c.name}</div>
                            {c.gstin && <div className="text-[10px] font-mono text-slate-500">GST: {c.gstin}</div>}
                            {c.phone && <div className="text-[10px] text-slate-500">Ph: {c.phone}</div>}
                            <div className="text-[10px] text-slate-400 truncate">{c.billingAddress}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Add New Customer Button */}
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-colors cursor-pointer shrink-0"
              >
                <Plus size={14} />
                + New Customer
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Customer Name */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Customer / Business Name <span className="text-red-500">*</span>
                  </label>
                  {selectedCustomerCode && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-mono font-bold border border-blue-200">
                      Linked: {selectedCustomerCode}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomerName(val);
                    setIsDirty(true);
                    const matched = customersList.find(c => 
                      c.name && c.name.trim().toLowerCase() === val.trim().toLowerCase()
                    );
                    if (matched) {
                      setSelectedCustomerId(matched.id);
                      setSelectedCustomerCode(matched.customerCode || '');
                      if (!contactPerson && matched.contactPerson) setContactPerson(matched.contactPerson);
                      if (!customerPhone && matched.phone) setCustomerPhone(matched.phone);
                      if (!customerEmail && matched.email) setCustomerEmail(matched.email);
                      if (!customerGstin && matched.gstin) setCustomerGstin(matched.gstin);
                      if (!billingAddress && matched.billingAddress) setBillingAddress(matched.billingAddress);
                      if (!deliveryAddress && matched.deliveryAddress) setDeliveryAddress(matched.deliveryAddress);
                      if (!customerState && matched.state) setCustomerState(matched.state);
                      if (!customerStateCode && matched.stateCode) setCustomerStateCode(matched.stateCode);
                    } else if (!val.trim()) {
                      setSelectedCustomerId('');
                      setSelectedCustomerCode('');
                    }
                  }}
                  placeholder="e.g. ABC Engineering Pvt Ltd"
                  className={`w-full px-3 py-2 text-sm font-bold rounded-xl border ${
                    errors.customer ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900`}
                />
                {errors.customer && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.customer}</p>
                )}
              </div>

              {/* GSTIN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  GSTIN (If Applicable)
                </label>
                <input
                  type="text"
                  value={customerGstin}
                  maxLength={15}
                  onChange={(e) => {
                    const up = e.target.value.toUpperCase();
                    setCustomerGstin(up);
                    if (up.length >= 2 && /^\d{2}/.test(up)) {
                      const code = up.slice(0, 2);
                      setCustomerStateCode(code);
                      const st = INDIAN_STATES.find(s => s.code === code);
                      if (st) setCustomerState(st.name);
                    }
                    setIsDirty(true);
                  }}
                  placeholder="33EGXPD3539N1ZR"
                  className="w-full px-3 py-2 text-sm font-mono uppercase font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                {errors.customerGstin && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.customerGstin}</p>
                )}
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => { setContactPerson(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. Mr. K. Sharma"
                  className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone / Mobile
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => { setCustomerPhone(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              {/* State & State Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  State & Code
                </label>
                <div className="flex gap-2">
                  <select
                    value={customerState}
                    onChange={(e) => {
                      const stName = e.target.value;
                      setCustomerState(stName);
                      const found = INDIAN_STATES.find(s => s.name === stName);
                      setCustomerStateCode(found ? found.code : '');
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={customerStateCode}
                    readOnly
                    className="w-14 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                    placeholder="Code"
                  />
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Billing / Registered Address
                </label>
                <textarea
                  rows={2}
                  value={billingAddress}
                  onChange={(e) => {
                    setBillingAddress(e.target.value);
                    if (sameAsBilling) {
                      setDeliveryAddress(e.target.value);
                      setDeliveryLocation(e.target.value);
                    }
                    setIsDirty(true);
                  }}
                  placeholder="Registered commercial address"
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              {/* Delivery Address */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Shipping / Delivery Site Address
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-blue-700">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSameAsBilling(checked);
                        if (checked) {
                          setDeliveryAddress(billingAddress);
                          setDeliveryLocation(billingAddress);
                        }
                        setIsDirty(true);
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Same as billing</span>
                  </label>
                </div>

                {availableAddresses.length > 1 && !sameAsBilling && (
                  <div className="mb-2">
                    <select
                      value={selectedAddressLabel}
                      onChange={(e) => {
                        const lbl = e.target.value;
                        setSelectedAddressLabel(lbl);
                        const match = availableAddresses.find(a => a.label === lbl);
                        if (match) {
                          setDeliveryAddress(match.address);
                          setDeliveryLocation(match.address);
                        }
                      }}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-slate-50 font-medium"
                    >
                      {availableAddresses.map(a => (
                        <option key={a.id} value={a.label}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <textarea
                  rows={2}
                  value={deliveryAddress}
                  disabled={sameAsBilling}
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value);
                    setDeliveryLocation(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="Physical site/factory address where goods are delivered"
                  className={`w-full px-3 py-2 text-xs font-medium rounded-xl border ${
                    sameAsBilling ? 'bg-slate-50 text-slate-500 border-slate-200' : 'border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION C: DELIVERY & TRANSPORT DETAILS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div 
            onClick={() => setShowTransportSection(!showTransportSection)}
            className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Truck className="text-amber-500" size={18} />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                3. Dispatch & Transport Details
              </h3>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                {vehicleNumber ? `Vehicle: ${vehicleNumber}` : 'Transporter & E-Way Bill info'}
              </span>
              {showTransportSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>

          {showTransportSection && (
            <div className="p-6 space-y-5 animate-in fade-in duration-150">
              
              {/* Row 1: Carrier & Mode Selection */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck size={14} className="text-blue-600" />
                    <span>Carrier Assignment & Delivery Mode</span>
                  </span>

                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-xs">
                    <input
                      type="checkbox"
                      checked={isSelfDelivery}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsSelfDelivery(checked);
                        if (checked) {
                          setTransporterName('Self Delivery');
                          setSelectedTransporterId('');
                          setTransporterCode('');
                        } else {
                          setTransporterName('');
                        }
                        setIsDirty(true);
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Self Delivery (Own Fleet / Hand Delivery)</span>
                  </label>
                </div>

                {!isSelfDelivery ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Select Logistics Carrier / Transporter
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsTransporterModalOpen(true)}
                          className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          + New Carrier Master
                        </button>
                      </div>
                      <select
                        value={selectedTransporterId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSelectedTransporterId(id);
                          const t = transportersList.find(item => item.id === id);
                          if (t) {
                            setTransporterName(t.name);
                            setTransporterCode(t.transporterCode || '');
                          } else {
                            setTransporterName('');
                            setTransporterCode('');
                          }
                          setIsDirty(true);
                        }}
                        className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-900"
                      >
                        <option value="">-- Choose from Transporters Directory --</option>
                        {transportersList.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.transporterCode} — {t.name} ({t.transporterType || 'Road transport'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Or Custom Transporter Name
                      </label>
                      <input
                        type="text"
                        value={transporterName}
                        onChange={(e) => {
                          setTransporterName(e.target.value);
                          setSelectedTransporterId('');
                          setIsDirty(true);
                        }}
                        placeholder="e.g. VRL / SafeXpress"
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-indigo-700 font-medium italic">
                    Goods delivered via company-owned vehicle or authorized in-house personnel. No external transport docket required.
                  </p>
                )}
              </div>

              {/* Row 2: Vehicle & Driver Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Vehicle Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Vehicle Registration No
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setVehicleNumber(val);
                      setIsDirty(true);
                      if (val && !validateVehicleNumber(val)) {
                        setErrors(prev => ({ ...prev, vehicleNumber: 'Format note: Standard Indian format like TN-01-AB-1234' }));
                      } else {
                        setErrors(prev => {
                          const next = { ...prev };
                          delete next.vehicleNumber;
                          return next;
                        });
                      }
                    }}
                    placeholder="e.g. TN-01-AB-1234"
                    className="w-full px-3 py-2 text-sm font-mono uppercase font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                  {errors.vehicleNumber && (
                    <p className="text-[10px] text-amber-600 mt-1 font-medium">{errors.vehicleNumber}</p>
                  )}
                </div>

                {/* Vehicle Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => { setVehicleType(e.target.value); setIsDirty(true); }}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white text-slate-900"
                  >
                    {VEHICLE_TYPES.map(vt => (
                      <option key={vt.value} value={vt.value}>{vt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Driver Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => { setDriverName(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. Murugan S"
                    className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                {/* Driver Mobile */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Driver Mobile
                  </label>
                  <input
                    type="tel"
                    value={driverPhone}
                    onChange={(e) => { setDriverPhone(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. 9444012345"
                    className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
              </div>

              {/* Row 3: Document References & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* LR / Transport Document Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    LR / Consignment Note No
                  </label>
                  <input
                    type="text"
                    value={lrNumber}
                    onChange={(e) => { setLrNumber(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. LR-40918"
                    className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                {/* E-Way Bill Number */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      E-Way Bill Ref No
                    </label>
                    <span className="text-[9px] text-slate-400 font-mono">12 Digits</span>
                  </div>
                  <input
                    type="text"
                    maxLength={12}
                    value={ewayBillNumber}
                    onChange={(e) => { setEwayBillNumber(e.target.value.replace(/\D/g, '')); setIsDirty(true); }}
                    placeholder="e.g. 121094829103"
                    className="w-full px-3 py-2 text-sm font-mono font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                {/* Dispatch Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dispatch Date
                  </label>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => { setDispatchDate(e.target.value); setIsDirty(true); }}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white font-medium"
                  />
                </div>

                {/* Expected Delivery Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => { setExpectedDeliveryDate(e.target.value); setIsDirty(true); }}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white font-medium"
                  />
                </div>
              </div>

              {/* Row 4: Origin, Destination & Instructions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Warehouse size={13} className="text-amber-500" /> Issue Warehouse
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => {
                      setSelectedWarehouseId(e.target.value);
                      setIsDirty(true);
                      const wh = warehousesList.find(w => w.id === e.target.value);
                      if (wh && !dispatchLocation) {
                        setDispatchLocation(`${wh.name}${wh.city ? `, ${wh.city}` : ''}`);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
                  >
                    {warehousesList.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.warehouseCode}) {w.isDefault ? '• Default' : ''}
                      </option>
                    ))}
                    {warehousesList.length === 0 && (
                      <option value="">Main Warehouse (Default)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dispatch Place (Origin)
                  </label>
                  <input
                    type="text"
                    value={dispatchLocation}
                    onChange={(e) => { setDispatchLocation(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. Chennai Works, Ambattur"
                    className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Delivery Place (Destination)
                  </label>
                  <input
                    type="text"
                    value={deliveryLocation}
                    onChange={(e) => { setDeliveryLocation(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. Mumbai Warehouse, Sector 5"
                    className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Special Delivery Instructions
                  </label>
                  <input
                    type="text"
                    value={deliveryInstructions}
                    onChange={(e) => { setDeliveryInstructions(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. Unload at Gate 2, inspect packaging"
                    className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
              </div>

              {/* Row 5: Freight & Transportation Charges (Collapsible) */}
              <div className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={showFreightSection}
                      onChange={(e) => { setShowFreightSection(e.target.checked); setIsDirty(true); }}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span>Include Freight & Shipping Payment Information</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">To Pay / Paid Consignor terms</span>
                </div>

                {showFreightSection && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Freight Amount (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={freightAmount}
                        onChange={(e) => { setFreightAmount(e.target.value); setIsDirty(true); }}
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Payment Responsibility
                      </label>
                      <select
                        value={freightPaymentResponsibility}
                        onChange={(e) => { setFreightPaymentResponsibility(e.target.value); setIsDirty(true); }}
                        className="w-full px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white"
                      >
                        {FREIGHT_PAYMENT_RESPONSIBILITIES.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Freight Reference No
                      </label>
                      <input
                        type="text"
                        value={freightReference}
                        onChange={(e) => { setFreightReference(e.target.value); setIsDirty(true); }}
                        placeholder="e.g. FR-8821"
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Payment Remarks
                      </label>
                      <input
                        type="text"
                        value={freightRemarks}
                        onChange={(e) => { setFreightRemarks(e.target.value); setIsDirty(true); }}
                        placeholder="e.g. Paid via NEFT"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* SECTION D: ITEM ENTRY & PRODUCT MANAGEMENT */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Layers className="text-amber-500" size={18} />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                4. Products & Items Details
              </h3>
              <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full font-bold text-slate-700">
                {products.length} {products.length === 1 ? 'Row' : 'Rows'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveProductRowIndex(products.length - 1);
                  setIsAddProductOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                + New Product Master
              </button>
            </div>
          </div>

          {errors.products && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              {errors.products}
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto p-4 sm:p-6">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-50/60">
                  <th className="py-2.5 px-2 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Item Name & Description <span className="text-red-500">*</span></th>
                  <th className="py-2.5 px-2 w-24">HSN/SAC</th>
                  <th className="py-2.5 px-2 w-24 text-right">Qty <span className="text-red-500">*</span></th>
                  <th className="py-2.5 px-2 w-28">Unit</th>
                  {isMonetary && (
                    <>
                      <th className="py-2.5 px-2 w-28 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-2 w-20 text-right">Tax (%)</th>
                      <th className="py-2.5 px-2 w-28 text-right">Amount (₹)</th>
                    </>
                  )}
                  {!isMonetary && (
                    <th className="py-2.5 px-3 min-w-[150px]">Item Remarks</th>
                  )}
                  <th className="py-2.5 px-2 w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {products.map((row, index) => {
                  const rowErr = errors.productRows?.[index] || {};

                  return (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      {/* S.No */}
                      <td className="py-3 px-2 text-center font-mono font-bold text-slate-400 text-xs">
                        {index + 1}
                      </td>

                      {/* Product Name & SKU / Description */}
                      <td className="py-3 px-3">
                        <div className="space-y-1 relative product-search-container">
                          <input
                            type="text"
                            value={row.name}
                            onFocus={() => setActiveProdDropdownIndex(index)}
                            onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                            placeholder="Type item name..."
                            className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border ${
                              rowErr.name ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900`}
                          />

                          {/* Autocomplete suggestions dropdown */}
                          {activeProdDropdownIndex === index && productsMaster.length > 0 && (
                            <div className="absolute left-0 top-full mt-1 z-30 w-72 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                              {productsMaster
                                .filter(p => p.name.toLowerCase().includes((row.name || '').toLowerCase()))
                                .slice(0, 10)
                                .map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSelectProduct(index, p)}
                                    className="w-full text-left p-2 hover:bg-blue-50 text-xs border-b border-slate-50 cursor-pointer"
                                  >
                                    <div className="font-bold text-slate-900">{p.name}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      {p.sku ? `SKU: ${p.sku} • ` : ''}HSN: {p.hsn || '-'} • ₹{parseFloat(p.rate || p.standardRate || p.unitPrice || 0).toLocaleString('en-IN')}
                                    </div>
                                  </button>
                                ))}
                            </div>
                          )}

                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => handleProductChange(index, 'description', e.target.value)}
                            placeholder="Optional specifications / serial / notes"
                            className="w-full px-2 py-1 text-[11px] font-medium rounded border border-slate-200 text-slate-600 focus:outline-none focus:border-blue-400"
                          />

                          {/* Live Warehouse Stock Availability Badge */}
                          {selectedWarehouseId && (row.productId || productsMaster.find(p => p.name.toLowerCase() === (row.name || '').toLowerCase())?.id) && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              {(() => {
                                const matchedId = row.productId || productsMaster.find(p => p.name.toLowerCase() === (row.name || '').toLowerCase())?.id;
                                const avail = calculateCurrentBalance(matchedId, selectedWarehouseId, currentCompany?.id);
                                const isDeficit = (parseFloat(row.quantity) || 0) > avail;
                                return (
                                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 ${
                                    isDeficit 
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  }`}>
                                    Wh Stock: <strong>{avail} {row.unit || 'NOS'}</strong>
                                    {isDeficit ? (
                                      <span className="text-rose-600 font-bold">(Deficit: {(parseFloat(row.quantity) || 0) - avail})</span>
                                    ) : (
                                      <span className="text-emerald-700">(Remaining: {avail - (parseFloat(row.quantity) || 0)})</span>
                                    )}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* HSN/SAC */}
                      <td className="py-3 px-2">
                        <input
                          type="text"
                          value={row.hsn}
                          onChange={(e) => handleProductChange(index, 'hsn', e.target.value)}
                          placeholder="8537"
                          className="w-full px-2 py-1.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-none text-slate-800"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-2 text-right">
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={row.quantity ?? ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                          className={`w-full px-2 py-1.5 text-xs font-mono font-bold text-right rounded-lg border ${
                            rowErr.quantity ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                          } bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 transition-all`}
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-2">
                        <select
                          value={row.unit}
                          onChange={(e) => handleProductChange(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800"
                        >
                          {STANDARD_UOMS.map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.value}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Monetary Columns */}
                      {isMonetary && (
                        <>
                          {/* Unit Rate */}
                          <td className="py-3 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.rate ?? ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleProductChange(index, 'rate', e.target.value)}
                              placeholder="0.00"
                              title="Unit Rate (₹) - Editable"
                              aria-label="Unit Rate"
                              className="w-full px-2 py-1.5 text-xs font-mono font-medium text-right rounded-lg border border-slate-300 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 transition-all"
                            />
                          </td>

                          {/* Tax Rate % */}
                          <td className="py-3 px-2 text-right">
                            <select
                              value={row.taxRate}
                              onChange={(e) => handleProductChange(index, 'taxRate', parseFloat(e.target.value))}
                              className="w-full px-1.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-right text-slate-800"
                            >
                              {GST_RATES.map((r) => (
                                <option key={r} value={r}>
                                  {r}%
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Line Amount */}
                          <td className="py-3 px-2 text-right font-mono font-bold text-xs text-slate-900">
                            {formatCurrency(row.amount)}
                          </td>
                        </>
                      )}

                      {!isMonetary && (
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => handleProductChange(index, 'remarks', e.target.value)}
                            placeholder="e.g. For testing / inspection"
                            className="w-full px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-800"
                          />
                        </td>
                      )}

                      {/* Row Actions */}
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-400">
                          <button
                            type="button"
                            onClick={() => moveProductRow(index, -1)}
                            disabled={index === 0}
                            title="Move Up"
                            className="p-1 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveProductRow(index, 1)}
                            disabled={index === products.length - 1}
                            title="Move Down"
                            className="p-1 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateProductRow(index)}
                            title="Duplicate Row"
                            className="p-1 hover:text-blue-600 cursor-pointer"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeProductRow(index)}
                            title="Delete Row"
                            className="p-1 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add Row Button & Summary Bar */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <button
              type="button"
              onClick={addProductRow}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={14} className="text-amber-500" />
              Add Another Item Row
            </button>

            {/* Calculations Total Summary */}
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-700 font-semibold self-end md:self-auto">
              <div>
                <span className="text-slate-400 uppercase text-[10px] block">Items & Quantities</span>
                <span className="font-bold text-slate-900">{totals.unitSummary || `${totals.totalQuantity} Items`}</span>
              </div>

              {isMonetary && (
                <>
                  {totals.totalTax > 0 && (
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] block">Estimated GST</span>
                      <span className="font-bold text-slate-800 font-mono">{formatCurrency(totals.totalTax)}</span>
                    </div>
                  )}

                  <div className="border-l border-slate-300 pl-4">
                    <span className="text-slate-400 uppercase text-[10px] block">Total Valuation</span>
                    <span className="text-base font-black text-slate-950 font-mono">{formatCurrency(totals.totalAmount)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* SECTION E: WEIGHTS & RETURNABLE DETAILS (COLLAPSIBLE TABS / PANELS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weights & Packages Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scale className="text-amber-500" size={18} />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Weight & Package Verification
                </h4>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={enableWeights}
                  onChange={(e) => { setEnableWeights(e.target.checked); setIsDirty(true); }}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Include Weights</span>
              </label>
            </div>

            {enableWeights ? (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Completeness Badge / Alert */}
                {shipmentWeights.completeness === 'Complete' && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                    <span className="font-bold">Complete Weight Profile — Calculated from item weights ({shipmentWeights.totalGrossWeight} {weightUnit})</span>
                  </div>
                )}
                {shipmentWeights.completeness === 'Incomplete' && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <span className="font-bold">⚠️ {shipmentWeights.completenessMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Gross Weight
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={grossWeight !== '' ? grossWeight : (shipmentWeights.totalGrossWeight > 0 ? shipmentWeights.totalGrossWeight : '')}
                      onChange={(e) => { setGrossWeight(e.target.value); setIsDirty(true); }}
                      placeholder={shipmentWeights.totalGrossWeight > 0 ? String(shipmentWeights.totalGrossWeight) : "0.00"}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {shipmentWeights.totalGrossWeight > 0 ? `Calc: ${shipmentWeights.totalGrossWeight} ${weightUnit}` : 'Manual or item calc'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Tare / Packaging Wt
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={tareWeight !== '' ? tareWeight : (shipmentWeights.totalPackagingWeight > 0 ? shipmentWeights.totalPackagingWeight : packageTareWeight)}
                      onChange={(e) => { setTareWeight(e.target.value); setPackageTareWeight(e.target.value); setIsDirty(true); }}
                      placeholder={shipmentWeights.totalPackagingWeight > 0 ? String(shipmentWeights.totalPackagingWeight) : "0.00"}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {shipmentWeights.totalPackagingWeight > 0 ? `Calc: ${shipmentWeights.totalPackagingWeight} ${weightUnit}` : 'Carton / dunnage tare'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Net Weight
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={netWeight ? `${netWeight} ${weightUnit}` : (shipmentWeights.totalNetWeight > 0 ? `${shipmentWeights.totalNetWeight} ${weightUnit}` : '-')}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-black rounded-lg border border-slate-200 bg-slate-50 text-emerald-700"
                    />
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {shipmentWeights.totalNetWeight > 0 ? `Items net: ${shipmentWeights.totalNetWeight} ${weightUnit}` : 'Pure goods weight'}
                    </span>
                  </div>
                </div>

                {errors.weights && (
                  <p className="text-[11px] text-red-600 font-medium">{errors.weights}</p>
                )}

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Weight Unit
                    </label>
                    <select
                      value={weightUnit}
                      onChange={(e) => { setWeightUnit(e.target.value); setIsDirty(true); }}
                      className="w-full px-2 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="Kg">Kg (Kilograms)</option>
                      <option value="t">Metric Tons (t)</option>
                      <option value="q">Quintals (q)</option>
                      <option value="g">Grams (g)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Package Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={numberOfPackages}
                      onChange={(e) => { setNumberOfPackages(e.target.value); setIsDirty(true); }}
                      placeholder={String(shipmentWeights.totalPackages || 1)}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Package Type
                    </label>
                    <select
                      value={packageType}
                      onChange={(e) => { setPackageType(e.target.value); setIsDirty(true); }}
                      className="w-full px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white"
                    >
                      {PACKAGE_TYPES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Weights and packaging details are disabled. Check the box above if your dispatch requires gross/tare weight recording.
              </p>
            )}
          </div>

          {/* Returnable Goods Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RotateCcw className="text-amber-500" size={18} />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Returnable Goods Tracking
                </h4>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={isReturnable}
                  onChange={(e) => { setIsReturnable(e.target.checked); setIsDirty(true); }}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Returnable Challan</span>
              </label>
            </div>

            {isReturnable ? (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Expected Return Date
                    </label>
                    <input
                      type="date"
                      value={expectedReturnDate}
                      onChange={(e) => { setExpectedReturnDate(e.target.value); setIsDirty(true); }}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Purpose / Reason
                    </label>
                    <input
                      type="text"
                      value={returnReason}
                      onChange={(e) => { setReturnReason(e.target.value); setIsDirty(true); }}
                      placeholder="e.g. Job Work, Calibration, Demo"
                      className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-900"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                  <strong>Notice:</strong> Items in this challan will be tagged as returnable with outstanding balance tracked against customer receipt.
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Non-returnable dispatch. Enable the checkbox above if the goods are sent for temporary testing, job work, or approval and are expected to return.
              </p>
            )}
          </div>
        </div>

        {/* SECTION F: REMARKS AND DOCUMENT NOTES */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            General Remarks & Special Instructions
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => { setRemarks(e.target.value); setIsDirty(true); }}
            placeholder="Add any specific notes to be printed on this delivery challan (e.g. Test Certificate enclosed, Handover protocol)..."
            className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </div>

        {/* 3. Global Action Footer Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-4 sm:p-6 sticky bottom-4 z-20 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={handleCancelClick}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveAction('Draft', 'navigate')}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              Save as Draft
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Eye size={14} />
              Preview Challan
            </button>

            <button
              type="button"
              onClick={() => handleSaveAction('Finalized', 'print')}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <Printer size={14} />
              Save & Print
            </button>

            <button
              type="button"
              onClick={() => handleSaveAction('Finalized', 'createAnother')}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus size={14} />
              Save & Create Another
            </button>

            <button
              type="button"
              onClick={() => handleSaveAction('Finalized', 'navigate')}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  Finalize & Save Challan
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* MODAL 1: Add New Customer Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onCustomerAdded={handleCustomerAdded}
      />

      {/* MODAL 2: Add New Product Modal */}
      <AddProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onProductAdded={handleProductAdded}
      />

      {/* MODAL 2.5: Add Transporter Modal */}
      <TransporterModal
        isOpen={isTransporterModalOpen}
        onClose={() => setIsTransporterModalOpen(false)}
        companyId={currentCompany?.id}
        onSave={async (savedTr) => {
          const updated = await getTransporters(currentCompany?.id);
          setTransportersList(updated);
          if (savedTr?.id) {
            setSelectedTransporterId(savedTr.id);
            setTransporterName(savedTr.name);
            setTransporterCode(savedTr.transporterCode || '');
          }
          setIsTransporterModalOpen(false);
        }}
      />

      {/* MODAL 3: Real-Time Challan Document Preview Modal */}
      <ChallanPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        challan={currentPreviewData}
        companyDetails={currentCompany}
        onPrint={() => {
          setPreviewOpen(false);
          handleSaveAction('Finalized', 'print');
        }}
        onDownloadPdf={async () => {
          if (triggerPdfDownload) {
            await triggerPdfDownload(currentPreviewData);
          }
        }}
        onFinalizeSave={() => {
          setPreviewOpen(false);
          handleSaveAction('Finalized', 'navigate');
        }}
      />
    </div>
  );
}
