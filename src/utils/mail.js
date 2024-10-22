import nodemailer from "nodemailer";
import { ApiError } from "./apiError.js";

const sendEmail = async (to, subject, text, html) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `Hello User, ${process.env.MAIL}`, // sender address
      to,
      subject,
      text,
      html,
    });

    return { messageId: info.messageId, status: "Mail sent successfully" };
  } catch (error) {
    console.log(error);
    throw new ApiError(400, "Email not sent");
  }
};

export { sendEmail };
