/**
 * Dynamically loads the Razorpay Checkout SDK script
 * @returns {Promise<boolean>}
 */
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Checks if the subscription/access is active
 * @returns {boolean}
 */
export const isSubscriptionActive = () => {
  const expiry = localStorage.getItem("nayaruvi_subscription_expiry") || localStorage.getItem("tekpower_subscription_expiry");
  if (!expiry) return false;
  return new Date().getTime() < parseInt(expiry, 10);
};

/**
 * Gets remaining days of active subscription
 * @returns {number}
 */
export const getRemainingDays = () => {
  const expiry = localStorage.getItem("nayaruvi_subscription_expiry") || localStorage.getItem("tekpower_subscription_expiry");
  if (!expiry) return 0;
  const diffTime = parseInt(expiry, 10) - new Date().getTime();
  if (diffTime <= 0) return 0;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Formats expiry timestamp to human readable date string
 * @returns {string}
 */
export const getExpiryDateFormatted = () => {
  const expiry = localStorage.getItem("nayaruvi_subscription_expiry") || localStorage.getItem("tekpower_subscription_expiry");
  if (!expiry) return "Expired / Not Subscribed";
  const date = new Date(parseInt(expiry, 10));
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};
