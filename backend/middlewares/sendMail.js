const nodemailer = require("nodemailer");
const EmailLogs = require("../models/emailLogSchema");
require("dotenv").config();

exports.sendSuccessEmail = async (customer_email, transaction, items) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Format jumlah uang menjadi format IDR (Rp)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const itemsTable = items
    .map(
      (item) => `
    <tr style="background-color: #f9f9f9;">
      <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${
        item.product_name
      }</td>
      <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${
        item.qty
      }</td>
      <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${formatCurrency(
        item.amount
      )}</td>
    </tr>
  `
    )
    .join("");

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customer_email,
    subject: "Transaction Completed Successfully",
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 800px; margin: auto; background-color: white; padding: 20px; border-radius: 8px;">
          <!-- Header Section -->
          <div style="text-align: center; padding-bottom: 10px;">
            <img src="${
              process.env.LOGO_IMAGE_URL
            }" alt="Valtechnos Logo" style="max-width: 100px;">
            <h2 style="color: #4CAF50; font-size: 28px;">Transaction Completed!</h2>
          </div>

          <!-- Transaction Information -->
          <p style="font-size: 16px; color: #333;">Hello ${
            transaction.customer_name
          },</p>
          <p style="font-size: 16px; color: #333;">Your transaction has been successfully completed. Below are the details of your purchase:</p>
          <hr style="border: 1px solid #eee;">

          <p><strong>Transaction ID:</strong> ${transaction._id}</p>
          <p><strong>Status:</strong> ${transaction.status}</p>
          <p><strong>Total Amount:</strong> ${formatCurrency(
            transaction.total_amount
          )}</p>

          <!-- Items Table -->
          <h3 style="color: #333;">Items Purchased</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #ddd;">
            <thead style="background-color: #f1f1f1;">
              <tr>
                <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Product</th>
                <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Quantity</th>
                <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTable}
            </tbody>
            <tfoot>
              <tr style="background-color: #f1f1f1;">
                <td colspan="2" style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">Total Amount</td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${formatCurrency(
                  transaction.total_amount
                )}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Contact Support -->
          <p style="font-size: 16px; text-align: center; color: #333;">If you have any questions or concerns, feel free to contact us at any time.</p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="mailto:vailovent@gmail.com" style="padding: 12px 25px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">Contact Support</a>
          </div>
          
          <!-- Footer -->
          <hr style="border: 1px solid #eee; margin-top: 20px;">
          <div style="font-size: 14px; color: #777; text-align: center; padding-top: 10px;">
            <p>Thank you for choosing Vailovent! We appreciate your business.</p>
            <p><strong>Vailovent</strong> | All Rights Reserved</p>
          </div>
        </div>
      </div>
    `,
  };

  try {
    const emailResponse = await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully.");

    const emailLog = new EmailLogs({
      transaction_id: transaction._id,
      customer_email: customer_email,
      email_link: emailResponse.response,
    });

    await emailLog.save();
    console.log("Email log saved successfully.");
  } catch (error) {
    console.log("Failed to send verification email:", error);
    throw error;
  }
};

exports.sendPaymentEmail = async (customer_email, transaction, items) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Format jumlah uang menjadi format IDR (Rp)
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const itemsTable = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${
        item.product_name
      }</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${
        item.qty
      }</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${formatCurrency(
        item.amount
      )}</td>
    </tr>
  `
    )
    .join("");

  const paymentUrl = `${process.env.CLIENT_URL}/paying/${transaction._id}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customer_email,
    subject: "Your Order is Created - Complete Your Payment",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #FFA500;">Hello ${transaction.customer_name},</h2>
        <p>Your transaction has been successfully created. Please complete your payment using the details below:</p>
        <hr>
        <p><strong>Transaction ID:</strong> ${transaction._id}</p>
        <p><strong>Total Amount:</strong> ${formatCurrency(
          transaction.total_amount
        )}</p>
        <p><strong>Status:</strong> Pending Payment</p>
        <hr>
        <h3>Items in Your Order</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f1f1f1;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Product</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Quantity</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsTable}
          </tbody>
          <tfoot>
            <tr style="background-color: #f1f1f1;">
              <td colspan="2" style="padding: 12px; border: 1px solid #ddd; text-align: center;"><strong>Total Amount</strong></td>
              <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${formatCurrency(
                transaction.total_amount
              )}</td>
            </tr>
          </tfoot>
        </table>

        <p style="font-size: 16px; text-align: center; color: #333;">Click the button below to proceed with your payment:</p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${paymentUrl}" style="padding: 12px 30px; background-color: #FFA500; color: white; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">Complete Payment</a>
        </div>
        
        <p style="font-size: 16px; margin-top: 20px;">If you have any questions, feel free to contact us.</p>
        <p style="font-size: 16px;">Thank you for shopping with us!</p>
        <p style="font-size: 16px; text-align: center; color: #777;">Best Regards,</p>
        <p style="font-size: 16px; text-align: center; color: #FFA500;"><strong>Valtechnos</strong></p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Payment email sent successfully.");
  } catch (error) {
    console.log("Failed to send payment email:", error);
  }
};
