const Transactions = require("../../models/transactionSchema");
const TransactionItems = require("../../models/transactionItemSchema");
const EmailLogs = require("../../models/emailLogSchema");
const {
  sendSuccessEmail,
} = require("../../middlewares/sendMail/sendSuccessEmail");
const {
  sendFailedEmail,
} = require("../../middlewares/sendMail/sendFailedEmail");

// Payment Notification URL
exports.payment_notification = async (req, res) => {
  try {
    const notification = req.body;
    console.log("Payment Notification:", notification);

    const { transaction_status, order_id } = notification;

    // Validasi order_id sebelum melakukan split
    if (!order_id || !order_id.includes("-")) {
      return res.status(400).json({
        success: false,
        message: "Invalid order_id format.",
        data: null,
      });
    }

    const transaction_id = order_id.split("-")[1];

    // Cari transaksi dan item transaksi secara paralel
    const [transaction, transaction_items] = await Promise.all([
      Transactions.findById(transaction_id),
      TransactionItems.find({ transaction_id }),
    ]);

    // Cek apakah transaksi ditemukan
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: `Transaction with ID "${transaction_id}" not found.`,
        data: null,
      });
    }

    // Cek apakah item transaksi ditemukan
    if (transaction_items.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No transaction items found for transaction ID "${transaction_id}".`,
        data: null,
      });
    }

    // Konversi status Midtrans ke status yang diizinkan dalam database
    let databaseStatus;
    switch (transaction_status) {
      case "settlement":
      case "capture":
        databaseStatus = "completed";
        break;
      case "pending":
        databaseStatus = "pending";
        break;
      case "cancel":
      case "refund":
        databaseStatus = "cancelled";
        break;
      case "expire":
        databaseStatus = "expired";
        break;
      case "deny":
        databaseStatus = "denied";
        break;
      case "challenge":
        databaseStatus = "challengebyFDS";
        break;
      default:
        databaseStatus = "pending";
        break;
    }

    // Perbarui status transaksi
    transaction.status = databaseStatus;

    // Simpan perubahan status transaksi
    await transaction.save();

    // Tentukan apakah perlu mengirim email
    let emailPayload = null;
    if (databaseStatus === "completed") {
      emailPayload = "Success Transaction";
    } else if (
      databaseStatus === "cancelled" ||
      databaseStatus === "expired" ||
      databaseStatus === "denied"
    ) {
      emailPayload = "Fail Transaction";
    }

    // Log proses email untuk debugging
    console.log("Midtrans Status:", transaction_status);
    console.log("Database Status:", databaseStatus);
    console.log("Email Payload:", emailPayload);

    // Kirim email jika emailPayload sudah ditentukan
    if (emailPayload) {
      const emailExists = await EmailLogs.findOne({
        transaction_id,
        payload: emailPayload,
      });

      if (!emailExists) {
        try {
          await Promise.all([
            emailPayload === "Success Transaction"
              ? sendSuccessEmail(
                  transaction.customer_email,
                  transaction,
                  transaction_items
                )
              : sendFailedEmail(
                  transaction.customer_email,
                  transaction,
                  transaction_items
                ),
            new EmailLogs({
              transaction_id,
              customer_email: transaction.customer_email,
              payload: emailPayload,
            }).save(),
          ]);
          console.log(
            `Email ${emailPayload} berhasil dikirim ke ${transaction.customer_email}`
          );
        } catch (err) {
          console.error("Email sending/logging failed:", err);
        }
      } else {
        console.log(`Email ${emailPayload} sudah pernah dikirim sebelumnya`);
      }
    } else {
      console.log(
        `Email tidak dikirim karena status transaksi database: ${databaseStatus}`
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Payment notification received and transaction updated successfully.",
      data: {
        transaction,
        transaction_items,
      },
    });
  } catch (error) {
    console.error("Error processing payment notification:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
