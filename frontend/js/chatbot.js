// LifeDrop FAQ Chatbot — rule-based, client-side only, no external API calls.

const CHATBOT_FAQ = [
  {
    keywords: ['eligible', 'eligibility', 'who can donate', 'can i donate', 'requirements'],
    answer: 'To donate blood you generally need to be 18–65 years old, weigh at least 50kg, be in good health, and not have donated in the last 3 months. Your eligibility is also checked on your donor profile.',
  },
  {
    keywords: ['register', 'sign up', 'create account', 'join'],
    answer: 'Click "Join LifeDrop" on the login page, pick your role (donor, recipient, hospital, or blood bank), and fill in the form. You\'ll be signed in automatically once your account is created.',
  },
  {
    keywords: ['login', 'log in', 'sign in', 'password', 'otp', 'verification code', 'code'],
    answer: 'When you log in, we send a 6-digit verification code to your email for security. Enter it on the login screen to finish signing in. Didn\'t get it? Use the "Resend code" button, and check your spam folder.',
  },
  {
    keywords: ['forgot password', 'reset password', 'forgot my password'],
    answer: 'Click "Forgot password?" on the login page and enter your email — we\'ll send you a reset link that\'s valid for 10 minutes.',
  },
  {
    keywords: ['blood group', 'blood type', 'compatib', 'o-', 'o+', 'a+', 'a-', 'b+', 'b-', 'ab+', 'ab-'],
    answer: 'O- is the universal donor (can give to anyone) and AB+ is the universal recipient (can receive from anyone). Check the Inventory or FAQ page for the full compatibility chart.',
  },
  {
    keywords: ['request blood', 'need blood', 'blood request', 'urgent', 'emergency'],
    answer: 'Hospitals and recipients can submit a blood request from their dashboard with the blood group, quantity, and urgency level. Nearby eligible donors are then matched and notified automatically.',
  },
  {
    keywords: ['appointment', 'schedule', 'book a donation'],
    answer: 'Donors can book a donation appointment from their dashboard. Hospitals will approve, cancel, or mark it complete once the donation happens.',
  },
  {
    keywords: ['donation history', 'how many times', 'points', 'tier', 'badge', 'reward'],
    answer: 'Your donation history, points, and donor tier (bronze/silver/gold/platinum) are all shown on your donor dashboard under your profile.',
  },
  {
    keywords: ['hospital', 'verify', 'verification status'],
    answer: 'Hospital and blood bank accounts are reviewed by an admin before being fully verified. You can check your verification status on your profile page.',
  },
  {
    keywords: ['contact', 'support', 'help', 'human', 'talk to someone'],
    answer: 'For anything I can\'t help with, reach out via the Contact page — our team typically responds within 24 hours.',
  },
];

const CHATBOT_FALLBACK = "I'm not sure about that one. Try asking about registration, login/OTP, blood compatibility, blood requests, appointments, or donor rewards — or visit the Contact page for a human.";
const CHATBOT_GREETING = "Hi! I'm the LifeDrop assistant. Ask me about donating blood, registration, login, or blood requests.";

function chatbotFindAnswer(message) {
  const text = message.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const entry of CHATBOT_FAQ) {
    const score = entry.keywords.reduce((n, kw) => (text.includes(kw) ? n + 1 : n), 0);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best ? best.answer : CHATBOT_FALLBACK;
}

function chatbotInit() {
  const style = document.createElement('style');
  style.textContent = `
    #chatbot-toggle { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; background: var(--red, #C41E3A); color: #fff; border: none; box-shadow: 0 4px 16px rgba(0,0,0,0.25); cursor: pointer; z-index: 1000; display: flex; align-items: center; justify-content: center; }
    #chatbot-toggle:hover { filter: brightness(1.08); }
    #chatbot-panel { position: fixed; bottom: 92px; right: 24px; width: 320px; max-width: calc(100vw - 32px); height: 420px; max-height: calc(100vh - 140px); background: var(--card-bg, #fff); border: 1px solid var(--gray-200, #E5E7EB); border-radius: 16px; box-shadow: 0 12px 32px rgba(0,0,0,0.22); display: none; flex-direction: column; overflow: hidden; z-index: 1000; }
    #chatbot-panel.open { display: flex; }
    #chatbot-header { background: var(--red, #C41E3A); color: #fff; padding: 14px 16px; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; justify-content: space-between; }
    #chatbot-header button { background: none; border: none; color: #fff; font-size: 1rem; cursor: pointer; line-height: 1; }
    #chatbot-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: var(--gray-50, #FAFAFA); }
    .chatbot-msg { max-width: 85%; padding: 8px 12px; border-radius: 12px; font-size: 0.82rem; line-height: 1.4; }
    .chatbot-msg.bot { background: #fff; border: 1px solid var(--gray-200, #E5E7EB); align-self: flex-start; border-bottom-left-radius: 2px; }
    .chatbot-msg.user { background: var(--red, #C41E3A); color: #fff; align-self: flex-end; border-bottom-right-radius: 2px; }
    #chatbot-form { display: flex; border-top: 1px solid var(--gray-200, #E5E7EB); }
    #chatbot-input { flex: 1; border: none; padding: 12px; font-size: 0.85rem; outline: none; background: transparent; color: inherit; }
    #chatbot-form button { border: none; background: var(--red, #C41E3A); color: #fff; padding: 0 16px; cursor: pointer; font-weight: 700; }
    body.dark #chatbot-panel { background: #1A1A1E; border-color: #2A2A2E; }
    body.dark #chatbot-messages { background: #141416; }
    body.dark .chatbot-msg.bot { background: #232326; border-color: #2A2A2E; color: #E5E7EB; }
  `;
  document.head.appendChild(style);

  const toggle = document.createElement('button');
  toggle.id = 'chatbot-toggle';
  toggle.title = 'Ask LifeDrop Assistant';
  toggle.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';

  const panel = document.createElement('div');
  panel.id = 'chatbot-panel';
  panel.innerHTML = `
    <div id="chatbot-header">
      <span>LifeDrop Assistant</span>
      <button type="button" id="chatbot-close" aria-label="Close">&times;</button>
    </div>
    <div id="chatbot-messages"></div>
    <form id="chatbot-form">
      <input type="text" id="chatbot-input" placeholder="Ask a question..." autocomplete="off"/>
      <button type="submit">Send</button>
    </form>
  `;

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  const messages = panel.querySelector('#chatbot-messages');
  const form = panel.querySelector('#chatbot-form');
  const input = panel.querySelector('#chatbot-input');

  function addMessage(text, sender) {
    const msg = document.createElement('div');
    msg.className = `chatbot-msg ${sender}`;
    msg.textContent = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  let greeted = false;
  toggle.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open') && !greeted) {
      addMessage(CHATBOT_GREETING, 'bot');
      greeted = true;
    }
  });
  panel.querySelector('#chatbot-close').addEventListener('click', () => panel.classList.remove('open'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    input.value = '';
    setTimeout(() => addMessage(chatbotFindAnswer(text), 'bot'), 300);
  });
}

document.addEventListener('DOMContentLoaded', chatbotInit);
