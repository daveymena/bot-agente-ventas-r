
export class PaymentService {
  private mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  private paypalClientId = process.env.PAYPAL_CLIENT_ID;
  private paypalSecret = process.env.PAYPAL_CLIENT_SECRET;

  async createMercadoPagoLink(title: string, price: number, phone: string) {
    if (!this.mpToken) return null;
    try {
      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.mpToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: [{
            title: title,
            quantity: 1,
            unit_price: price,
            currency_id: "COP"
          }],
          external_reference: phone, // Guardamos el teléfono aquí
          metadata: {
            phone: phone,
            product_name: title
          },
          back_urls: {
            success: "https://tecnovariedades.com/pago-exitoso",
            failure: "https://tecnovariedades.com/pago-fallido"
          },
          auto_return: "approved"
        })
      });
      const data: any = await response.json();
      return data.init_point;
    } catch (err) {
      console.error("[Payment] MP Error:", err);
      return null;
    }
  }

  async createPayPalLink(title: string, priceUsd: number, phone: string) {
    if (!this.paypalClientId || !this.paypalSecret) return null;
    try {
      // 1. Get access token
      const auth = Buffer.from(`${this.paypalClientId}:${this.paypalSecret}`).toString("base64");
      const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      });
      const tokenData: any = await tokenRes.json();
      const token = tokenData.access_token;

      // 2. Create order
      const orderRes = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            description: title,
            custom_id: phone, // Guardamos el teléfono aquí
            amount: {
              currency_code: "USD",
              value: priceUsd.toString()
            }
          }]
        })
      });
      const orderData: any = await orderRes.json();
      return orderData.links.find((l: any) => l.rel === "approve")?.href;
    } catch (err) {
      console.error("[Payment] PayPal Error:", err);
      return null;
    }
  }
}

export const paymentService = new PaymentService();
