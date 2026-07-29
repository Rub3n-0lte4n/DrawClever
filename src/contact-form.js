/**
 * Draw Clever Architecture — contact form submission
 *
 * POSTs the enquiry to Web3Forms and falls back to a prefilled mailto: if the
 * request fails. Lives in its own module (rather than inline in contact.html)
 * so the site's Content-Security-Policy can run script-src without
 * 'unsafe-inline' — bundled output is covered by 'self'.
 */

(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  // Web3Forms access key (managed at app.web3forms.com; safe to expose:
  // it only lets people send mail TO the studio inbox).
  const ACCESS_KEY = 'ff6e40a3-c49e-4162-a929-efe5a2ef6372';

  const ok = document.getElementById('form-ok');
  const okTitle = document.getElementById('form-ok-title');
  const okNote = document.getElementById('form-ok-note');
  const btn = form.querySelector('button[type="submit"]');

  function showOk(title, note) {
    if (okTitle) okTitle.textContent = title;
    if (okNote) okNote.textContent = note;
    if (ok) { ok.hidden = false; ok.focus(); }
  }

  function mailtoFallback(d, name) {
    const subject = encodeURIComponent('New project enquiry: ' + (d.get('type') || 'General'));
    const body = encodeURIComponent(
      'Name: ' + name + '\nEmail: ' + (d.get('email') || '') + '\nProject type: ' + (d.get('type') || '') + '\n\n' + (d.get('message') || '')
    );
    window.location.href = 'mailto:hello@drawclever.com?subject=' + subject + '&body=' + body;
    showOk('Almost there. Your email is ready to send.',
           "Your mail app should have opened with your enquiry pre-filled. If it didn't, write to us at hello@drawclever.com.");
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const d = new FormData(form);
    const name = ((d.get('first') || '') + ' ' + (d.get('last') || '')).trim();

    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(12000) : undefined,
        body: JSON.stringify({
          access_key: ACCESS_KEY,
          subject: 'New project enquiry: ' + (d.get('type') || 'General'),
          from_name: name || 'Draw Clever website',
          name: name,
          email: d.get('email') || '',
          project_type: d.get('type') || '',
          message: d.get('message') || '',
          botcheck: d.get('botcheck') || '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'send failed');
      form.reset();
      showOk('Thank you. Your message is on its way.',
             'We read every enquiry personally and reply within two business days.');
    } catch (err) {
      mailtoFallback(d, name);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Send Message'; }
    }
  });
})();
