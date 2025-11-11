// js/email.js

// Initialize EmailJS (supports both v3 and v4 SDKs)
function initEmail() {
  if (!window.emailjs) {
    console.error('EmailJS SDK not loaded');
    return;
  }

  // Detect SDK version (v3 vs v4)
  const ver = emailjs.__version || '';
  const isV3 = ver.startsWith('3.');

  try {
    if (isV3) {
      // v3 expects a STRING
      emailjs.init('K9Tyz06jayTkULA1b');
    } else {
      // v4 accepts an OBJECT
      emailjs.init({ publicKey: 'K9Tyz06jayTkULA1b' });
    }
    console.log('EmailJS initialized (version:', ver || 'unknown', ')');
  } catch (e) {
    console.error('Failed to initialize EmailJS:', e);
  }
}

// Handle contact form submit
async function sendContactForm(e) {
  e.preventDefault();
  const f = e.target;

  const data = {
    from_name: (f.name?.value || '').trim(),
    from_email: (f.email?.value || '').trim(),
    phone: (f.phone?.value || '').trim(),
    message: (f.message?.value || '').trim(),
    // Optional extra fields if your template includes them:
    site_name: 'AutomateIT',
    page_url: location.href,
    submitted_at: new Date().toISOString(),
  };

  // Basic front-end validation
  if (!data.from_name || !data.from_email || !data.message) {
    alert('Please fill in Name, Email, and Message.');
    return;
  }

  try {
    // ⚠️ Ensure these exactly match your Dashboard IDs
    const SERVICE_ID  = 'service_9klxd6u';
    const TEMPLATE_ID = 'template_kbke1gd';

    const res = await emailjs.send(SERVICE_ID, TEMPLATE_ID, data);
    console.log('EmailJS response:', res);
    alert('Thanks! Your message was sent.');
    f.reset();
  } catch (err) {
    console.error('EmailJS error:', err);
    const mailto = f.dataset.mailto || 'william@automatingsolutions.com';
    alert('Sorry, something went wrong. Email us at ' + mailto);
  }
}

// Wire up on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initEmail();
  const form = document.querySelector('#contact-form');
  if (form) form.addEventListener('submit', sendContactForm);
});
