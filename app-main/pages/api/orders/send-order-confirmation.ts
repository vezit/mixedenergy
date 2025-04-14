import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

// 1) Initialize your Supabase Admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "Missing `orderId` in request body" });
    }

    // 2) Fetch the order from the DB:
    //    Adjust table/column names if needed.
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: "Order not found", details: error?.message });
    }

    // 3) Check if order_confirmation_send is already true
    if (order.order_confirmation_send) {
      // Already sent; do nothing
      return res.status(200).json({
        message: "Order confirmation already sent. No further action taken.",
      });
    }

    // 4) Prepare your email content using the order row
    //    If your "basket_details" is an object with 'items', 'customerDetails', etc.,
    //    parse them here to build your email’s body. For example:
    const basketDetails = order.basket_details || {};
    const items = basketDetails.items || [];
    const customer = basketDetails.customerDetails || {};
    const delivery = basketDetails.deliveryDetails || {};

    // Example of constructing a summary in text
    const textBody = `
Tak for din bestilling!
Ordreoplysninger
Ordre-ID (Intern): ${order.id}

Session / Unique Key: ${order.session_id}
Status: ${order.status || "ukendt"}

Produkter:
${items
  .map((item: any) => `${item.slug} × ${item.quantity} (${(item.totalPrice || 0) / 100} kr)`)
  .join("\n")}

Levering:
Type: ${delivery.deliveryType || "ukendt"}

Navn: ${delivery?.deliveryAddress?.name || ""}

Adresse:
${delivery?.deliveryAddress?.address || ""}
${delivery?.deliveryAddress?.postalCode || ""} ${delivery?.deliveryAddress?.city || ""}

Land: ${delivery?.deliveryAddress?.country || ""}

Leveringsgebyr: ${(delivery?.deliveryFee || 0) / 100} kr

Kundeoplysninger:
Navn: ${customer.fullName || ""}
Email: ${customer.email || ""}
Telefon: ${customer.mobileNumber || ""}

I alt: ${calcGrandTotal(items, delivery) / 100} kr (inkl. moms)
`.trim();

    // Optional: build HTML version
    const htmlBody = `
      <p><strong>Tak for din bestilling!</strong></p>
      <p><strong>Ordreoplysninger</strong><br/>
         Ordre-ID (Intern): ${order.id}</p>

      <p>Session / Unique Key: ${order.session_id}<br/>
         Status: ${order.status || "ukendt"}</p>

      <p><strong>Produkter:</strong><br/>
      ${items
        .map(
          (item: any) => `
          ${item.slug} × ${item.quantity}
          (${(item.totalPrice || 0) / 100} kr) <br/>
        `
        )
        .join("")}
      </p>

      <p><strong>Levering:</strong><br/>
      Type: ${delivery.deliveryType || "ukendt"}</p>

      <p>
       Navn: ${delivery?.deliveryAddress?.name || ""} <br/>
       Adresse: ${delivery?.deliveryAddress?.address || ""}<br/>
       ${delivery?.deliveryAddress?.postalCode || ""} ${delivery?.deliveryAddress?.city || ""}<br/>
       Land: ${delivery?.deliveryAddress?.country || ""}
      </p>

      <p>Leveringsgebyr: ${(delivery?.deliveryFee || 0) / 100} kr</p>

      <p><strong>Kundeoplysninger:</strong><br/>
      Navn: ${customer.fullName || ""}<br/>
      Email: ${customer.email || ""}<br/>
      Telefon: ${customer.mobileNumber || ""}</p>

      <p><strong>I alt:</strong> ${(calcGrandTotal(items, delivery) / 100).toFixed(2)} kr (inkl. moms)</p>
    `;

    // 5) Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // 6) Send the email
    await transporter.sendMail({
      from: `"Mixed Energy" <${process.env.SMTP_USER}>`,
      to: customer.email || "no-customer-email@example.com",
      bcc: "mixedenergy.dk@gmail.com", // Also BCC your own mailbox
      subject: "Tak for din bestilling! (Ordrebekræftelse)",
      text: textBody,
      html: htmlBody,
    });

    // 7) Mark order_confirmation_send = true
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ order_confirmation_send: true })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order_confirmation_send:", updateError);
      // We won't fail the email-sending response since the email was successful,
      // but you may want to log this or handle it.
    }

    // Return success
    return res.status(200).json({ message: "Order confirmation sent successfully!" });
  } catch (err: any) {
    console.error("Error sending order confirmation:", err);
    return res.status(500).json({
      error: "Failed to send order confirmation",
      details: err.message,
    });
  }
}

/** 
 * Helper function to compute grand total from items + delivery 
 * (assuming item.totalPrice is in øre).
 */
function calcGrandTotal(items: any[], delivery: any): number {
  let totalPrice = 0;
  items.forEach((item) => {
    totalPrice += item.totalPrice || 0;
  });
  const deliveryFee = delivery?.deliveryFee || 0;
  return totalPrice + deliveryFee;
}
