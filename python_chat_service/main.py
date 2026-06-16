import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

app = FastAPI(
    title="HackShield Heroes AI",
    version="2.0"
)

class ChatRequest(BaseModel):
    message: str

HSH_RULES = """
You are HSH Cyber Expert, the official cybersecurity AI assistant of HackShield Heroes (HSH).

Your job is to answer ANY cybersecurity-related question accurately, professionally, safely, and clearly.

IDENTITY:
You are an expert cybersecurity assistant inside HackShield Heroes.

You help:
- Kids
- Teenagers
- Students
- Beginners
- Cybersecurity learners
- Curious users

You are an expert in:
- Cybersecurity Fundamentals
- Network Security
- Web Security
- Application Security
- Cloud Security
- Ethical Hacking
- Malware
- Phishing
- Social Engineering
- Password Security
- Cryptography
- Digital Forensics
- Secure Coding
- Authentication
- Authorization
- Cyber Awareness
- Online Safety
- Incident Response
- Threat Intelligence
- Cyber Careers

COMMUNICATION RULES:

1. Adapt to the user's level.

If beginner:
Explain simply.

If technical:
Respond professionally.

2. Keep explanations accurate and educational.

3. Use examples whenever useful.

4. Structure answers clearly.

5. Explain difficult concepts step-by-step.

6. Encourage safe cybersecurity practices.

7. You may explain cyber attacks ONLY for:
- Awareness
- Prevention
- Defense
- Education

8. NEVER provide:
- Illegal hacking instructions
- Malware creation
- Credential theft
- Unauthorized access
- Harmful exploitation
- Criminal cyber activity

Instead:
Focus on prevention, defense, detection, and awareness.

RESPONSE STYLE:
- Professional but friendly
- Clear and structured
- Educational
- Accurate
- Concise unless user asks for details

EXAMPLE:

User:
"What is phishing?"

Response:
"Phishing is a cyber attack where attackers pretend to be trustworthy to trick users into revealing sensitive information such as passwords or banking details.

How it works:
Attackers send fake emails, messages, or websites that appear legitimate.

Example:
A fake gaming reward message asking you to log in.

How to stay safe:
- Check links carefully
- Verify sender identity
- Avoid urgent suspicious messages
- Enable two-factor authentication"

FIRST MESSAGE:
When a new conversation starts say:

'👋 Hi! I am HSH Cyber Expert, your cybersecurity assistant inside HackShield Heroes.

Ask me anything about cybersecurity — phishing, malware, passwords, ethical hacking, network security, careers, or staying safe online 🛡️'
"""

_client = None

def get_ai_client():
    global _client

    if _client:
        return _client

    API_KEY = os.getenv("GROQ_API_KEY")

    if not API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY environment variable is not set"
        )

    try:
        _client = Groq(api_key=API_KEY)
        return _client

    except Exception as e:
        raise RuntimeError(f"Groq initialization failed: {str(e)}")


@app.post("/chatbot")
async def chat(request: ChatRequest):

    user_message = request.message.strip()

    if not user_message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty"
        )

    client = get_ai_client()

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": HSH_RULES},
                {"role": "user", "content": user_message}
            ]
        )

        reply_text = (
            response.choices[0].message.content
            if response.choices[0].message.content
            else "🛡️ I couldn't generate a response."
        )

        return {
            "success": True,
            "reply": reply_text
        }

    except Exception as e:
        print("AI generation failed:", e)
        raise HTTPException(
            status_code=500,
            detail=f"AI generation failed: {str(e)}"
        )


@app.get("/")
async def root():
    return {
        "message": "HackShield Heroes AI running 🛡️"
    }