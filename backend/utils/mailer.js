import nodemailer from "nodemailer";

const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function sendDemoEmail({ to, tutorName, parentName, parentPhone, message }) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("EMAIL_USER / EMAIL_PASS missing in .env, email skipped");
        return;
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
        from: `"Walk-In Tutor" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Naya demo request aaya hai - Walk-In Tutor",
        text:
            `Namaste ${tutorName},\n\n` +
            `${parentName} ne aapse demo class maangi hai.\n` +
            `Phone: ${parentPhone}\n` +
            (message ? `Message: ${message}\n` : "") +
            `\nWebsite par login karke "My Requests" mein bhi dekh sakte ho.\n\n- Walk-In Tutor`,
        html:
            `<p>Namaste <b>${esc(tutorName)}</b>,</p>` +
            `<p><b>${esc(parentName)}</b> ne aapse demo class maangi hai.</p>` +
            `<p>📞 Phone: <b>${esc(parentPhone)}</b></p>` +
            (message ? `<p>💬 Message: ${esc(message)}</p>` : "") +
            `<p>Website par login karke <b>My Requests</b> mein bhi dekh sakte ho.</p>` +
            `<p>- Walk-In Tutor</p>`
    });
}