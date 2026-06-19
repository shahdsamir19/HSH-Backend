import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/message", async (req, res) => {
  try {
    console.log("=================================");
    console.log("CHAT ROUTE HIT");
    console.log("Method:", req.method);
    console.log("Body:", req.body);

    const { message } = req.body;

    if (!message) {
      console.log("Message missing");
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty"
      });
    }

    const pythonUrl =
      process.env.PYTHON_CHATBOT_URL ||
      "http://localhost:8000/chatbot";

    console.log("PYTHON_CHATBOT_URL =", pythonUrl);

    const response = await axios.post(
      pythonUrl,
      { message },
      {
        timeout: 30000,
        headers: {
          "Content-Type": "application/json"
        },
        validateStatus: () => true
      }
    );

    console.log("=================================");
    console.log("PYTHON RESPONSE STATUS:");
    console.log(response.status);

    console.log("PYTHON RESPONSE DATA:");
    console.log(response.data);

    console.log("=================================");

    return res.status(response.status).json(response.data);

  } catch (error) {

    console.log("=================================");
    console.log("CHAT ROUTE ERROR");
    console.log("=================================");

    console.error("Error message:", error.message);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
      console.error("Response headers:", error.response.headers);

      return res.status(error.response.status).json({
        success: false,
        source: "python-service",
        status: error.response.status,
        data: error.response.data
      });
    }

    console.error("Error code:", error.code);

    return res.status(500).json({
      success: false,
      source: "node-backend",
      message: error.message,
      code: error.code
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
