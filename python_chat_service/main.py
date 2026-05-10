import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# =====================================
# FastAPI App
# =====================================
app = FastAPI(
    title="HackShield Heroes AI",
    version="2.0"
)


# =====================================
# Request Model
# =====================================
class ChatRequest(BaseModel):
    message: str


# =====================================
# HSH Cybersecurity Expert Prompt
# =====================================
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
• Check links carefully
• Verify sender identity
• Avoid urgent suspicious messages
• Enable two-factor authentication"

FIRST MESSAGE:
When a new conversation starts say:

'👋 Hi! I am HSH Cyber Expert, your cybersecurity assistant inside HackShield Heroes.

Ask me anything about cybersecurity — phishing, malware, passwords, ethical hacking, network security, careers, or staying safe online 🛡️'
"""


# =====================================
# Lazy Gemini Client
# =====================================
_client = None


def get_ai_client():
    """Initialize Gemini client safely."""
    global _client

    if _client:
        return _client

    SERVICE_ACCOUNT_FILE = os.getenv(
        "GOOGLE_SERVICE_ACCOUNT_FILE"
    )

    API_KEY = os.getenv(
        "GOOGLE_GENAI_API_KEY"
    )

    try:
        from google import genai

        # Service Account Authentication
        if SERVICE_ACCOUNT_FILE:
            service_account_path = Path(
                SERVICE_ACCOUNT_FILE
            ).resolve()

            if not service_account_path.exists():
                raise FileNotFoundError(
                    f"Service account file not found: {service_account_path}"
                )

            from google.oauth2 import service_account

            credentials = (
                service_account.Credentials
                .from_service_account_file(
                    service_account_path
                )
            )

            _client = genai.Client(
                credentials=credentials
            )

        # API Key Authentication
        elif API_KEY:
            _client = genai.Client(
                api_key=API_KEY
            )

        else:
            raise RuntimeError(
                "No credentials found. "
                "Set GOOGLE_SERVICE_ACCOUNT_FILE "
                "or GOOGLE_GENAI_API_KEY"
            )

        return _client

    except Exception as e:
        raise RuntimeError(
            f"Gemini initialization failed: {str(e)}"
        )


# =====================================
# Chat Endpoint
# =====================================
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
        prompt = f"""
{HSH_RULES}

User Question:
{user_message}
"""

        response = client.models.generate_content(
            model="gemini-1.5-pro",
            contents=prompt
        )

        reply_text = (
            response.text
            if response.text
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


# =====================================
# Health Check
# =====================================
@app.get("/")
async def root():
    return {
        "message": "HackShield Heroes AI running 🛡️"
    }