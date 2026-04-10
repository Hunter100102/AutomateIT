
(function () {
  'use strict';
  var PUBLIC_KEY='K9Tyz06jayTkULA1b', SERVICE_ID='service_9klxd6u', TEMPLATE_ID='template_6b9hm7p';
  function initEmail(){if(!window.emailjs)return;try{emailjs.init({publicKey:PUBLIC_KEY});}catch(e){try{emailjs.init(PUBLIC_KEY);}catch(_){}}}
  function sendContactForm(e){e.preventDefault();var form=e.target;var from_name=form.name.value.trim(),from_email=form.email.value.trim(),phone=form.phone.value.trim(),company=form.company.value.trim(),interest=form.interest.value,message=form.message.value.trim();if(!from_name||!from_email||!message){alert('Please fill in your name, email, and project details.');return;}var payload={from_name:from_name,from_email:from_email,phone:phone,company:company,interest:interest,message:message,site_name:'KnC Automations',page_url:location.href,submitted_at:new Date().toISOString()};emailjs.send(SERVICE_ID,TEMPLATE_ID,payload).then(function(){alert('Thanks. Your message was sent successfully.');form.reset();}).catch(function(){var mailto=form.getAttribute('data-mailto')||'william@automatingsolutions.com';alert('Something went wrong. Please email us directly at '+mailto+'.');});}
  function ready(){initEmail();var form=document.getElementById('contact-form');if(form)form.addEventListener('submit',sendContactForm);}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',ready);}else{ready();}
})();
