import { createAPIFileRoute } from "@tanstack/react-start/api";

export const APIRoute = createAPIFileRoute("/api/public/debug-ghl-token")({
  GET: async () => {
    const token = process.env.GHL_API_TOKEN || "";
    const locationId = process.env.GHL_LOCATION_ID || "";

    const result: Record<string, any> = {
      tokenPresent: !!token,
      tokenLength: token.length,
      tokenPrefix: token ? token.substring(0, 20) + "..." : "EMPTY",
      locationId: locationId || "EMPTY",
    };

    if (!token) {
      return Response.json({ ...result, error: "GHL_API_TOKEN is empty in Vercel env vars" });
    }

    // Test 1: contacts endpoint (basic scope)
    const contactsRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
        },
      }
    );
    result.contactsStatus = contactsRes.status;
    result.contactsOk = contactsRes.ok;

    // Test 2: invoices endpoint
    const invoicesRes = await fetch(
      `https://services.leadconnectorhq.com/invoices/?altId=${locationId}&altType=location&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
        },
      }
    );
    result.invoicesStatus = invoicesRes.status;
    result.invoicesOk = invoicesRes.ok;
    const invoicesBody = await invoicesRes.json().catch(() => ({}));
    result.invoicesError = invoicesBody?.message || invoicesBody?.error || null;

    return Response.json(result);
  },
});
