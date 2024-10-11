import nodemailer from "nodemailer";
import { ApiError } from "./apiError.js";
import { ApiResponse } from "./apiResponse.js";

const sendEmail = async (data, req, res) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.MAIL_ID,
      pass: process.env.MAIL_PASS,
    },
  });

  // Ensure required fields are present
  if (!data.to || !data.subject || (!data.text && !data.html)) {
    return res.status(400).json({
      message: "To, subject, and either text or html body are required.",
    });
  }

  try {
    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: `"Hello User" <${process.env.MAIL_ID}>`, // Use the email from the environment variable
      to: data.to, // List of receivers
      subject: data.subject, // Subject line
      text: data.text || "", // Plain text body
      html: data.html || "", // HTML body
    });

    console.log("Message sent: %s", info.messageId);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { messageId: info.messageId },
          "Email sent successfully"
        )
      );
  } catch (error) {
    console.error("Error sending email:", error);
    throw new ApiError(500, "Failed to send mail" || error.message);
  }
};

export { sendEmail };
