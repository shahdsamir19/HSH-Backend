import express from "express";
import { chatWithBot } from "../controllers/chatbot.controller.js";
import axios from "axios";

const router = express.Router();

/**
 * @swagger
 * /api/chatbot:
 *   post:
 *     summary: Send a message to the Secure X chatbot
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *     responses:
 *       200:
 *         description: Chatbot responded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *       400:
 *         description: Invalid message input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
//router.post('/', chatWithBot);

router.post("/message", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message cannot be empty" });
    }

   

    const pythonUrl = process.env.PYTHON_CHATBOT_URL || "http://localhost:8000/chatbot";

    const response = await axios.post(pythonUrl, { message });

    res.json(response.data);
  } catch (error) {
    console.error("Chatbot proxy error:", error.message || error);
    if (error.response) {

      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ success: false, message: "Chatbot proxy failed" });
  }
});

export default router;
