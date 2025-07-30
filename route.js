import { Router } from "express";
import { UserModel, AdminModel } from "./db.js";
import { z } from "zod";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const userRouter = Router();
const adminRouter = Router();

// Setup your transporter (replace with your SMTP service)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

adminRouter.post("/add", async (req, res) => {
    const { name, email, phoneNo } = req.body;

    const admin = new AdminModel({
        name,
        email,
        phoneNo
    });

    await admin.save();
    res.send({
        msg: "Admin added successfully"
    });
});

userRouter.post("/message", async (req, res) => {
    const schema = z.object({
        name: z.string().min(1, 'Name is required'),
        interestedArea: z.string().min(1, 'Interested area is required'),
        phoneNo: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
        email: z.string().email('Invalid email address'),
        message: z.string().min(1, 'Message is required'),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).send({ message: result.error.errors.map(e => e.message).join(', ') });
    }
    const { name, interestedArea, phoneNo, email, message } = req.body;

    try {
        // 1. Save user message to DB
        const user = new UserModel({ name, interestedArea, phoneNo, email, message });
        await user.save();

        // 2. Fetch admin details
        const admin = await AdminModel.findOne();
        if (!admin) {
            return res.status(500).send({ message: "Admin not found" });
        }

        // 3. Send email to admin
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: process.env.MAIL_ADMIN,
            subject: "New Contact Message Received",
            text: `New message from website:
                Name: ${name}
                Phone: ${phoneNo}
                Email: ${email}
                Area: ${interestedArea}
                Message: ${message}
            `
        };

        await transporter.sendMail(mailOptions);
        res.send({ message: "Message sent successfully" });

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error while sending message" });
    }
});

export { userRouter, adminRouter };