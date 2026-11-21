const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

// Server-side Razorpay Secrets (Stored in environment variables / Google Cloud Secrets)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || functions.config().razorpay?.key_id || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || functions.config().razorpay?.key_secret || "";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || functions.config().razorpay?.webhook_secret || "";

/**
 * 1. Callable Cloud Function: Create Razorpay Subscription / Order
 */
exports.createSubscriptionOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { companyId, planId } = data;
  if (!companyId) {
    throw new functions.https.HttpsError("invalid-argument", "companyId is required.");
  }

  // Verify caller is OWNER or ADMIN in company
  const memberSnap = await db.doc(`companies/${companyId}/members/${context.auth.uid}`).get();
  if (!memberSnap.exists || !["OWNER", "ADMIN"].includes(memberSnap.data().role)) {
    throw new functions.https.HttpsError("permission-denied", "Only company OWNER or ADMIN can initiate subscriptions.");
  }

  const amountPaise = planId === "yearly" ? 500000 : 50000; // ₹5,000 or ₹500
  const currency = "INR";
  const receipt = `rcpt_${companyId}_${Date.now()}`;

  return {
    keyId: RAZORPAY_KEY_ID,
    amount: amountPaise,
    currency,
    receipt,
    companyId
  };
});

/**
 * 2. Callable Cloud Function: Verify Razorpay Payment Signature
 */
exports.verifyPaymentSignature = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  }

  const { companyId, razorpay_payment_id, razorpay_order_id, razorpay_signature, planId } = data;

  if (!companyId || !razorpay_payment_id) {
    throw new functions.https.HttpsError("invalid-argument", "Missing payment parameters.");
  }

  // If order_id & signature provided, verify HMAC SHA256
  if (razorpay_order_id && razorpay_signature) {
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid Razorpay payment signature.");
    }
  }

  // Update subscription in Firestore
  const daysToAdd = planId === "yearly" ? 365 : 30;
  const currentPeriodStart = new Date().toISOString();
  const currentPeriodEnd = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

  await db.doc(`companies/${companyId}/subscription/current`).set({
    status: "PRO",
    planName: planId === "yearly" ? "Pro Annual" : "Pro Monthly",
    planId: planId || "monthly",
    amount: planId === "yearly" ? 5000 : 500,
    currency: "INR",
    razorpayPaymentId: razorpay_payment_id,
    currentPeriodStart,
    currentPeriodEnd,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // Record audit payment record
  await db.collection(`companies/${companyId}/payments`).add({
    paymentId: razorpay_payment_id,
    amount: planId === "yearly" ? 5000 : 500,
    status: "SUCCESS",
    verifiedAt: new Date().toISOString(),
    verifiedBy: context.auth.uid
  });

  return { success: true, status: "PRO", currentPeriodEnd };
});

/**
 * 3. HTTP Cloud Function: Razorpay Webhook Handler
 */
exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const signature = req.headers["x-razorpay-signature"];
  if (!signature) {
    return res.status(400).send("Missing webhook signature");
  }

  // Verify webhook signature with raw request body
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signature) {
    console.warn("Invalid Razorpay webhook signature detected");
    return res.status(400).send("Invalid webhook signature");
  }

  const event = req.body;
  const eventId = event.event_id || `evt_${Date.now()}`;

  // Idempotency check: verify event has not been processed
  const eventDoc = await db.doc(`processedWebhookEvents/${eventId}`).get();
  if (eventDoc.exists) {
    return res.status(200).json({ status: "already_processed" });
  }

  // Process event type
  try {
    const payload = event.payload;
    if (event.event === "subscription.charged" || event.event === "payment.captured") {
      const payment = payload.payment?.entity;
      const notes = payment?.notes || {};
      const companyId = notes.companyId;

      if (companyId) {
        await db.doc(`companies/${companyId}/subscription/current`).set({
          status: "PRO",
          razorpayPaymentId: payment.id,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } else if (event.event === "subscription.cancelled" || event.event === "subscription.halted") {
      const subscriptionEntity = payload.subscription?.entity;
      const notes = subscriptionEntity?.notes || {};
      const companyId = notes.companyId;

      if (companyId) {
        await db.doc(`companies/${companyId}/subscription/current`).update({
          status: "CANCELLED",
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Mark event processed
    await db.doc(`processedWebhookEvents/${eventId}`).set({
      event: event.event,
      processedAt: new Date().toISOString()
    });

    return res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Error processing Razorpay webhook:", error);
    return res.status(500).send("Webhook processing error");
  }
});
