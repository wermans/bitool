import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: false, // Mailhog local não usa TLS
    });
  }
  return transporter;
}

export async function sendMail(opts: { to: string[]; subject: string; text: string }) {
  if (opts.to.length === 0) return;
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM ?? "alerts@bitool.local",
    to: opts.to.join(","),
    subject: opts.subject,
    text: opts.text,
  });
}
