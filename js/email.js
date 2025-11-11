// js/email.js
(function () {
  'use strict';

  // ---- CONFIG: replace with your real IDs ----
  var PUBLIC_KEY  = 'K9Tyz06jayTkULA1b';
  var SERVICE_ID  = 'service_9klxd6u';
  var TEMPLATE_ID = 'template_6pjaq5k';
  // -------------------------------------------

  function initEmail() {
    if (!window.emailjs) {
      console.error('EmailJS SDK not loaded');
      return;
    }
    try {
      // v4 init (you are loading @emailjs/browser@4 in HTML)
      emailjs.init({ publicKey: PUBLIC_KEY });
      // console.log('EmailJS ready');
    } catch (e) {
      // Fallback for any env that still uses v3
      try { emailjs.init(PUBLIC_KEY); } catch (ex) { console.error('EmailJS init failed:', ex); }
    }
  }

  function sendContactForm(e) {
    e.preventDefault();

    var form = e.target;
    // Read values without optional chaining (ES5-safe)
    var from_name   = (form.elements['name']    && form.elements['name'].value)    ? form.elements['name'].value.trim()    : '';
    var from_email  = (form.elements['email']   && form.elements['email'].value)   ? form.elements['email'].value.trim()   : '';
    var phone       = (form.elements['phone']   && form.elements['phone'].value)   ? form.elements['phone'].value.trim()   : '';
    var message     = (form.elements['message'] && form.elements['message'].value) ? form.elements['message'].value.trim() : '';

    if (!from_name || !from_email || !message) {
      alert('Please fill in Name, Email, and Message.');
      return;
    }

    var payload = {
      from_name:  from_name,
      from_email: from_email,
      phone:      phone,
      message:    message,
      site_name:  'AutomateIT',
      page_url:   (typeof location !== 'undefined' ? location.href : ''),
      submitted_at: new Date().toISOString()
    };

    emailjs.send(SERVICE_ID, TEMPLATE_ID, payload)
      .then(function (res) {
        // console.log('EmailJS response:', res);
        alert('Thanks! Your message was sent.');
        try { form.reset(); } catch (_) {}
      })
      .catch(function (err) {
        console.error('EmailJS error:', err);
        var mailto = form.getAttribute('data-mailto') || 'william@automatingsolutions.com';
        alert('Sorry, something went wrong. Email us at ' + mailto);
      });
  }

  function onReady() {
    initEmail();
    var form = document.getElementById('contact-form');
    if (form) {
      form.removeEventListener('submit', sendContactForm); // avoid double-binding on hot reload
      form.addEventListener('submit', sendContactForm);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
