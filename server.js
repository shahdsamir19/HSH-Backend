// server.js
import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import app from './src/app.js';
import sequelize from './src/config/database.js';
import { initializeSocket } from './src/socket/socket.js';
import Badge from './src/models/Badge.model.js';
import Question from './src/models/Question.model.js';

const PORT = process.env.PORT || 5001;

const server = http.createServer(app);
const io = initializeSocket(server);
// Make io accessible in HTTP controllers via req.app.get('io')
app.set('io', io);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log("✅ Database synced");
    }
    await seedArenaData();
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
};

// Idempotent seed: only inserts if rows are missing
const seedArenaData = async () => {
  try {
    // Seed Cyber Arena Badges
    const arenaBadges = [
      { name: 'Password Master', icon: '🔑', description: 'Create strong passwords and score highly in battles.' },
      { name: 'Phishing Hunter', icon: '🎣', description: 'Identify phishing attempts and win your first battle.' },
      { name: 'Firewall Defender', icon: '🔥', description: 'Complete firewall missions and contain malware infections.' },
      { name: 'Cyber Detective', icon: '🕵️', description: 'Solve investigation missions and recover compromised data.' },
      { name: 'Team Hero', icon: '🛡️', description: 'Complete a team mission with classmates.' }
    ];
    for (const badgeData of arenaBadges) {
      await Badge.findOrCreate({ where: { name: badgeData.name }, defaults: badgeData });
    }
    console.log('✅ Arena badges seeded');

    // Seed Quiz Questions (for friend battle mode)
    const existingQuiz = await Question.count({ where: { gameMode: 'quiz' } });
    if (existingQuiz === 0) {
      await Question.bulkCreate([
        { questionText: 'What is the most common form of phishing attack?', optionA: 'Smishing', optionB: 'Email phishing', optionC: 'Vishing', optionD: 'Spear phishing', correctAnswer: 'B', gameMode: 'quiz', category: 'phishing', metadata: '{}' },
        { questionText: 'Which of the following is the strongest password?', optionA: 'password123', optionB: 'P@ssw0rd', optionC: 'Tr0ub4dor&3', optionD: 'qwerty', correctAnswer: 'C', gameMode: 'quiz', category: 'passwords', metadata: '{}' },
        { questionText: 'What does MFA stand for?', optionA: 'Multi-Factor Authentication', optionB: 'Multi-Function Access', optionC: 'Main Firewall Application', optionD: 'Managed File Attachment', correctAnswer: 'A', gameMode: 'quiz', category: 'authentication', metadata: '{}' },
        { questionText: 'What should you do if you receive a suspicious email asking for credentials?', optionA: 'Reply and ask if it is real', optionB: 'Click the link to verify', optionC: 'Report it and delete it', optionD: 'Forward it to a colleague', correctAnswer: 'C', gameMode: 'quiz', category: 'phishing', metadata: '{}' },
        { questionText: 'Which protocol encrypts web traffic?', optionA: 'HTTP', optionB: 'FTP', optionC: 'HTTPS', optionD: 'SMTP', correctAnswer: 'C', gameMode: 'quiz', category: 'networking', metadata: '{}' }
      ]);
      console.log('✅ Quiz questions seeded');
    }

    // Seed detective questions if not fully present
    const existingDetective = await Question.count({ where: { gameMode: 'detective' } });
    if (existingDetective < 3) {
      await Question.destroy({ where: { gameMode: 'detective' } });
      await Question.bulkCreate([
        {
          questionText: "Case File #001: The Stolen Game Developer. Young indie developer Youssef's credentials were hijacked and his game project was deleted. Reconstruct the breach timeline and find the entry point.",
          optionA: 'Brute force credential guessing',
          optionB: 'Phishing email leading to credential theft',
          optionC: 'Insider employee sabotage',
          optionD: 'Unsecured database exposure',
          correctAnswer: 'B',
          gameMode: 'detective',
          category: 'phishing',
          metadata: JSON.stringify({
            evidence: [
              "Evidence #1: Browser history shows login at fake lookalike domain.",
              "Evidence #2: Email inbox contains fake security alert from security@gma1l.com.",
              "Evidence #3: Notebook reveals use of weak password.",
              "Evidence #4: Account settings show Two-Factor Authentication was disabled."
            ],
            victim: "Youssef's Room"
          })
        },
        {
          questionText: "Case File #002: School Cyber Strike. The school's servers were encrypted by ransomware after a student brought an infected USB drive. Reconstruct the breach timeline.",
          optionA: 'DDoS Attack',
          optionB: 'Malware Infection from Executable',
          optionC: 'Unauthorized Access',
          optionD: 'Physical Break-In',
          correctAnswer: 'B',
          gameMode: 'detective',
          category: 'malware',
          metadata: JSON.stringify({
            evidence: [
              "Evidence #1: Student PC #4 — USB Logs show unknown device connected.",
              "Evidence #2: Student PC #4 — Free_GTA_V.exe executed.",
              "Evidence #3: Student PC #4 — Browser History shows unsafe website visited.",
              "Evidence #4: Teacher Computer — Security shows 2FA disabled."
            ],
            victim: "School Server"
          })
        },
        {
          questionText: "Case File #003: Digital Guardian Saga. An executive's laptop was compromised while connected to a public network without a VPN. Reconstruct the breach timeline.",
          optionA: 'Insider employee sabotage',
          optionB: 'Brute force credential guessing',
          optionC: 'Unsecured Public Wi-Fi Interception',
          optionD: 'Unsecured database exposure',
          correctAnswer: 'C',
          gameMode: 'detective',
          category: 'network',
          metadata: JSON.stringify({
            evidence: [
              "Evidence #1: Network Logs — Connection to unencrypted public Wi-Fi 'Free-Airport-Web'.",
              "Evidence #2: Device Settings — VPN connection disabled.",
              "Evidence #3: Application Logs — Cleartext credentials captured by attacker.",
              "Evidence #4: Security Alerts — Ignored suspicious login warning."
            ],
            victim: "Executive's Laptop"
          })
        }
      ]);
      console.log('✅ Detective questions seeded');
    }
  } catch (err) {
    console.error('⚠️ Error seeding arena data:', err.message);
  }
};

// Vercel automatically sets process.env.VERCEL = '1' on its serverless
// platform — that's the actual signal for "don't call listen()", not
// NODE_ENV. Railway (and most other hosts) commonly set NODE_ENV=production
// too, but they still need a real listening server, so checking VERCEL
// specifically keeps Railway working correctly either way.
if (!process.env.VERCEL) {
  connectDB().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  });
} else {
  connectDB();
}

export default app;
