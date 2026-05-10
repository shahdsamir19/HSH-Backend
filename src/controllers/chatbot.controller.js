import { generateChatResponse } from "../services/chatbot.service.js"; 

export const chatWithBot = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const reply = await generateChatResponse(message);

    res.json({
      success: true,
      reply
    });
  } catch (error) {
    console.error('Error in chatWithBot controller:', error);

    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to generate response'
    });
  }
};