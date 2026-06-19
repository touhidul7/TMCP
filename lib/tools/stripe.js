const { decryptText } = require("../crypto/decrypt");

function getApiKey(credentialRecord) {
  if (!credentialRecord?.encrypted_api_key) return null;
  return decryptText(credentialRecord.encrypted_api_key);
}

async function readJson(res, fallbackMessage) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || json?.message || json?.error || fallbackMessage);
  }
  return json;
}

// Stripe uses application/x-www-form-urlencoded for request bodies.
function formEncode(obj) {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.set(key, String(value));
  });
  return params;
}

async function runStripeTool({ featureKey, input = {}, credentialRecord }) {
  const apiKey = getApiKey(credentialRecord);
  const hasRealKey = Boolean(apiKey);
  const baseUrl = "https://api.stripe.com/v1";
  const authHeader = { "Authorization": `Bearer ${apiKey}` };

  if (featureKey === "stripe.list_customers") {
    if (!hasRealKey) {
      return { success: true, customers: [{ id: "cus_sandbox", email: "customer@example.com" }], mode: "sandbox-simulation" };
    }
    const params = new URLSearchParams();
    params.set("limit", String(Math.min(Number(input.limit || 10), 100)));
    if (input.email) params.set("email", input.email);
    const json = await readJson(await fetch(`${baseUrl}/customers?${params.toString()}`, { headers: authHeader }), "Stripe list customers failed");
    return { success: true, customers: json.data || [], has_more: json.has_more || false, mode: "authenticated" };
  }

  if (featureKey === "stripe.list_invoices") {
    if (!hasRealKey) {
      return { success: true, invoices: [{ id: "in_sandbox", amount_due: 0 }], mode: "sandbox-simulation" };
    }
    const params = new URLSearchParams();
    params.set("limit", String(Math.min(Number(input.limit || 10), 100)));
    if (input.customer) params.set("customer", input.customer);
    if (input.status) params.set("status", input.status);
    const json = await readJson(await fetch(`${baseUrl}/invoices?${params.toString()}`, { headers: authHeader }), "Stripe list invoices failed");
    return { success: true, invoices: json.data || [], has_more: json.has_more || false, mode: "authenticated" };
  }

  if (featureKey === "stripe.create_charge") {
    const amount = input.amount;
    const currency = input.currency || "usd";
    const source = input.source || input.customer;
    if (!amount) throw new Error("Missing amount for stripe.create_charge");
    if (!source) throw new Error("Missing source or customer for stripe.create_charge");
    if (!hasRealKey) {
      return { success: true, charge: { id: "ch_sandbox", amount, currency, status: "succeeded" }, mode: "sandbox-simulation" };
    }
    const body = formEncode({
      amount,
      currency,
      ...(input.source ? { source: input.source } : { customer: input.customer }),
      ...(input.description ? { description: input.description } : {})
    });
    const json = await readJson(await fetch(`${baseUrl}/charges`, {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/x-www-form-urlencoded" },
      body
    }), "Stripe create charge failed");
    return { success: true, charge: json, mode: "authenticated" };
  }

  if (featureKey === "stripe.create_refund") {
    const charge = input.charge || input.charge_id;
    const paymentIntent = input.payment_intent;
    if (!charge && !paymentIntent) throw new Error("Missing charge or payment_intent for stripe.create_refund");
    if (!hasRealKey) {
      return { success: true, refund: { id: "re_sandbox", status: "succeeded" }, mode: "sandbox-simulation" };
    }
    const body = formEncode({
      ...(charge ? { charge } : { payment_intent: paymentIntent }),
      ...(input.amount ? { amount: input.amount } : {}),
      ...(input.reason ? { reason: input.reason } : {})
    });
    const json = await readJson(await fetch(`${baseUrl}/refunds`, {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/x-www-form-urlencoded" },
      body
    }), "Stripe create refund failed");
    return { success: true, refund: json, mode: "authenticated" };
  }

  throw new Error(`Unsupported Stripe feature key: ${featureKey}`);
}

module.exports = { runStripeTool };
