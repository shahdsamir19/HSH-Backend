import express from "express";
import axios from "axios";
const router = express.Router();

router.post("/message", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: "Message cannot be empty" });
    }

    const pythonUrl = process.env.PYTHON_CHATBOT_URL || "http://localhost:8000/chatbot";
    
    console.log("Calling Python service at:", pythonUrl);
    console.log("Request body:", { message });

    const response = await axios.post(pythonUrl, { message }, {
      timeout: 30000, // 30 second timeout
      headers: { "Content-Type": "application/json" }
    });

    res.json(response.data);

  } catch (error) {
    console.error("Status:", error.response?.status);
    console.error("Headers:", error.response?.headers);
    console.error("Data:", error.response?.data);
    console.error("Chatbot proxy error:", error.message);
    console.error("Full error:", error.response?.data || error.code); // 👈 log full error

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ 
      success: false, 
      message: "Chatbot proxy failed",
      detail: error.message // 👈 return actual error in response
    });
    
  }
});
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "chat route works"
  });
});

export default router;
