import { ROLES, PERMISSIONS, hasPermission } from './tenantStorage.js';

/**
 * ============================================================================
 * NAYARUVI SECURITY & RELIABILITY GATEWAY
 * ============================================================================
 */

// In-memory idempotency cache (TTL: 5 minutes)
const IDEMPOTENCY_CACHE = new Map();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

/**
 * 1. Centralized Backend Authorization Guard
 * Validates tenant membership, role permissions, account status, and location scopes.
 */
export const authorizeOperation = (companyId, actor, requiredPermission, context = {}) => {
  if (!companyId) {
    throw new Error('AUTHORIZATION_FAILED: Organization ID is required.');
  }

  // System internal actions
  if (actor === 'system' || actor?.uid === 'system') {
    return true;
  }

  if (!actor || !actor.uid) {
    throw new Error('UNAUTHENTICATED: An authenticated user session is required.');
  }

  // Check account suspension
  if (actor.status === 'SUSPENDED' || actor.status === 'REMOVED') {
    throw new Error(`ACCOUNT_${actor.status}: Your account access has been restricted. Please contact your organization owner.`);
  }

  const role = actor.role || ROLES.VIEWER;

  // Validate RBAC permission
  if (requiredPermission && !hasPermission(role, requiredPermission)) {
    throw new Error(`FORBIDDEN: Role "${role}" does not have permission to execute "${requiredPermission}".`);
  }

  // Validate Branch Access Scope
  if (context.branchId && actor.branchIds && actor.branchIds !== 'ALL') {
    const allowedBranches = Array.isArray(actor.branchIds) ? actor.branchIds : [actor.branchIds];
    if (!allowedBranches.includes(context.branchId)) {
      throw new Error(`ACCESS_DENIED_BRANCH: Your account does not have access to operating branch "${context.branchId}".`);
    }
  }

  // Validate Warehouse Access Scope
  if (context.warehouseId && actor.warehouseIds && actor.warehouseIds !== 'ALL') {
    const allowedWarehouses = Array.isArray(actor.warehouseIds) ? actor.warehouseIds : [actor.warehouseIds];
    if (!allowedWarehouses.includes(context.warehouseId)) {
      throw new Error(`ACCESS_DENIED_WAREHOUSE: Your account does not have access to warehouse "${context.warehouseId}".`);
    }
  }

  return true;
};

/**
 * 2. Input Sanitization & Formula Injection Protection
 */
export const sanitizeInputString = (val) => {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();

  // Strip dangerous HTML script tags
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  str = str.replace(/<[^>]+>/g, ''); // Strip general tags

  // Prevent CSV / Spreadsheet Formula Injection (=, +, -, @, tab, CR)
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  return str;
};

export const sanitizeNumeric = (val, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) => {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) {
    return fallback;
  }
  if (num < min) return min;
  if (num > max) return max;
  return num;
};

/**
 * 3. Structured Logging with Credential & Token Scrubbing
 */
const SENSITIVE_KEY_REGEX = /password|token|secret|key|authorization|bearer|cookie|apiKey|accessToken/i;

export const sanitizeLogObject = (data) => {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeLogObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export const safeLogger = {
  info: (message, meta = null) => {
    console.log(`[INFO] ${message}`, meta ? sanitizeLogObject(meta) : '');
  },
  warn: (message, meta = null) => {
    console.warn(`[WARN] ${message}`, meta ? sanitizeLogObject(meta) : '');
  },
  error: (message, meta = null) => {
    console.error(`[ERROR] ${message}`, meta ? sanitizeLogObject(meta) : '');
  },
  audit: (action, meta = null) => {
    console.log(`[AUDIT:${action}]`, meta ? sanitizeLogObject(meta) : '');
  }
};

/**
 * 4. Idempotency Manager (Prevent duplicate stock deductions & double submissions)
 */
export const checkIdempotency = (key) => {
  if (!key) return null;
  const entry = IDEMPOTENCY_CACHE.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    IDEMPOTENCY_CACHE.delete(key);
    return null;
  }

  return entry.result;
};

export const recordIdempotency = (key, result) => {
  if (!key) return;
  IDEMPOTENCY_CACHE.set(key, {
    result,
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS
  });
};

/**
 * 5. Safe Object URL Manager (Prevent memory leaks & dangling blob references)
 */
export const createSafeObjectURL = (blob) => {
  if (typeof window === 'undefined' || !window.URL) return null;
  return window.URL.createObjectURL(blob);
};

export const revokeSafeObjectURL = (url) => {
  if (typeof window === 'undefined' || !window.URL || !url) return;
  try {
    window.URL.revokeObjectURL(url);
  } catch (e) {
    // Ignore cleanup error
  }
};
