/*
  send-booking.js — Netlify Function
  Casa e Bottega · Manfredonia

  Riceve i dati di una richiesta di prenotazione dal form
  su prenota.html e invia una notifica email all'host via Gmail SMTP.

  Usa le stesse variabili d'ambiente di submission-created.js:
    GMAIL_USER          → il tuo Gmail
    GMAIL_APP_PASSWORD  → App Password Gmail (16 caratteri)
    NOTIFY_EMAIL        → dove ricevere le notifiche
*/

const tls = require('tls');

// ─── Minuscolo client SMTP (senza dipendenze npm) ─────────────────
function smtpSend({ host, port, user, pass, from, to, subject, html }) {
  return new Promise((resolve, reject) => {
    const b64 = s => Buffer.from(s).toString('base64');
    let buffer = '';
    let stage = 0;

    const socket = tls.connect({ host, port, servername: host }, () => {
      const sequence = [
        () => socket.write(`EHLO netlify.function\r\n`),
        () => socket.write(`AUTH LOGIN\r\n`),
        () => socket.write(b64(user) + '\r\n'),
        () => socket.write(b64(pass) + '\r\n'),
        () => socket.write(`MAIL FROM:<${from}>\r\n`),
        () => socket.write(`RCPT TO:<${to}>\r\n`),
        () => socket.write(`DATA\r\n`),
        () => {
          const msg = [
            `From: "Casa e Bottega" <${from}>`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset=utf-8`,
            ``,
            html,
            ``,
            `.`
          ].join('\r\n');
          socket.write(msg + '\r\n');
        },
        () => socket.write(`QUIT\r\n`),
      ];

      socket.on('data', chunk => {
        buffer += chunk.toString();
        const parts = buffer.split(/\r?\n/);
        buffer = parts.pop();
        parts.forEach(line => {
          if (!line) return;
          const code = line.substring(0, 3);
          const isFinal = line[3] === ' ' || line.length === 3;
          if (!isFinal) return;
          if (code.startsWith('4') || code.startsWith('5')) {
            socket.destroy();
            return reject(new Error(`SMTP error stage=${stage}: ${line}`));
          }
          if      (stage === 0 && code === '220') { stage++; sequence[0](); }
          else if (stage === 1 && code === '250') { stage++; sequence[1](); }
          else if (stage === 2 && code === '334') { stage++; sequence[2](); }
          else if (stage === 3 && code === '334') { stage++; sequence[3](); }
          else if (stage === 4 && code === '235') { stage++; sequence[4](); }
          else if (stage === 5 && code === '250') { stage++; sequence[5](); }
          else if (stage === 6 && code === '250') { stage++; sequence[6](); }
          else if (stage === 7 && code === '354') { stage++; sequence[7](); }
          else if (stage === 8 && code === '250') { stage++; sequence[8](); }
          else if (stage === 9 && code === '221') { socket.destroy(); resolve(); }
        });
      });

      socket.on('error', reject);
      socket.on('close', () => { if (stage < 9) reject(new Error(`Closed at stage ${stage}`)); });
    });
  });
}

// ─── Formatta data italiana ───────────────────────────────────────
function formatTs(iso) {
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome'
    });
  } catch { return iso; }
}

// ─── Handler ──────────────────────────────────────────────────────
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const GMAIL_USER         = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
  const NOTIFY_EMAIL       = process.env.NOTIFY_EMAIL || GMAIL_USER;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error('[send-booking] GMAIL_USER o GMAIL_APP_PASSWORD mancanti');
    return { statusCode: 200, body: JSON.stringify({ ok: true, warn: 'email config missing' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const {
    room     = '—',
    checkin  = '—',
    checkout = '—',
    nights   = '—',
    guests   = '—',
    total    = '—',
    discount = '',
    name     = '—',
    phone    = '—',
    email    = '—',
    message  = '',
    method   = '—'
  } = data;

  const methodLabel = method === 'paypal' ? '💳 PayPal' : '🏦 Pagamento offline';
  const ricevuta = formatTs(new Date().toISOString());

  const subjectHost  = `🛎 Nuova prenotazione da ${name} — Casa e Bottega`;
  const subjectGuest = method === 'paypal'
    ? `✅ Richiesta ricevuta — ti invieremo il link PayPal | Casa e Bottega`
    : `✅ Richiesta ricevuta — ti contatteremo presto | Casa e Bottega`;

  // ─── Email all'ospite ─────────────────────────────────────────────
  const htmlGuest = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 20px; }
    .card { max-width: 560px; margin: 0 auto; background: white; border-radius: 8px;
            padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .logo { font-size: 1.1rem; font-weight: bold; color: #C8A96E; letter-spacing: 0.08em;
            text-transform: uppercase; margin-bottom: 4px; }
    h2 { color: #1B4F72; font-size: 1.4rem; margin: 0 0 8px; }
    .subtitle { color: #999; font-size: 0.85rem; margin: 0 0 24px;
                border-bottom: 2px solid #C8A96E; padding-bottom: 12px; }
    .intro { font-size: 0.98rem; color: #444; line-height: 1.6; margin-bottom: 24px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em;
                     color: #C8A96E; margin-bottom: 10px; font-weight: bold; }
    .field { margin-bottom: 10px; display: flex; gap: 8px; }
    .label { font-size: 0.8rem; color: #999; min-width: 100px; flex-shrink: 0; }
    .value { font-size: 0.95rem; color: #333; }
    .value.big { font-size: 1.3rem; font-weight: bold; color: #1B4F72; }
    .info-box { background: #f9f7f2; border-left: 3px solid #C8A96E;
                padding: 12px 16px; border-radius: 0 4px 4px 0;
                font-size: 0.9rem; color: #555; line-height: 1.6; margin-bottom: 24px; }
    .footer { margin-top: 24px; font-size: 0.78rem; color: #bbb; text-align: center;
              border-top: 1px solid #f0ebe0; padding-top: 16px; }
    a { color: #1B4F72; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Casa e Bottega</div>
    <h2>Abbiamo ricevuto la tua richiesta!</h2>
    <p class="subtitle">Manfredonia, Puglia · ${ricevuta}</p>

    <p class="intro">
      Caro/a <strong>${name}</strong>, grazie per aver scelto Casa e Bottega.<br>
      La tua richiesta di soggiorno è stata ricevuta correttamente.
      ${method === 'paypal'
        ? `Ti invieremo a breve un <strong>link PayPal</strong> per completare il pagamento e confermare definitivamente la prenotazione.`
        : `Ti contatteremo entro <strong>24 ore</strong> per confermare la disponibilità e accordarci sul pagamento.`
      }
    </p>

    <div class="section">
      <div class="section-title">🛏 Riepilogo richiesta</div>
      <div class="field"><span class="label">Camera</span><span class="value">${room}</span></div>
      <div class="field"><span class="label">Check-in</span><span class="value">${checkin}</span></div>
      <div class="field"><span class="label">Check-out</span><span class="value">${checkout}</span></div>
      <div class="field"><span class="label">Notti</span><span class="value">${nights}</span></div>
      <div class="field"><span class="label">Ospiti</span><span class="value">${guests}</span></div>
      ${discount ? `<div class="field"><span class="label">Sconto</span><span class="value">${discount}</span></div>` : ''}
      <div class="field"><span class="label">Totale stimato</span><span class="value big">€${total}</span></div>
      <div class="field"><span class="label">Pagamento</span><span class="value">${methodLabel}</span></div>
    </div>

    <div class="info-box">
      📍 <strong>Dove siamo:</strong> Manfredonia (FG), Puglia<br>
      📧 <a href="mailto:bookings@casaebottegapuglia.it">bookings@casaebottegapuglia.it</a><br>
      🌐 <a href="https://casaebottegapuglia.it">casaebottegapuglia.it</a>
    </div>

    <div class="footer">
      Hai inviato questa richiesta dal sito casaebottegapuglia.it.<br>
      Se non sei stato tu, ignora questa email.
    </div>
  </div>
</body>
</html>`;

  // ─── Email all'host ────────────────────────────────────────────────
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 20px; }
    .card { max-width: 560px; margin: 0 auto; background: white; border-radius: 8px;
            padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    h2 { color: #1B4F72; font-size: 1.4rem; margin: 0 0 8px; }
    .subtitle { color: #999; font-size: 0.85rem; margin: 0 0 24px;
                border-bottom: 2px solid #C8A96E; padding-bottom: 12px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em;
                     color: #C8A96E; margin-bottom: 10px; font-weight: bold; }
    .field { margin-bottom: 10px; display: flex; gap: 8px; }
    .label { font-size: 0.8rem; color: #999; min-width: 100px; flex-shrink: 0; }
    .value { font-size: 0.95rem; color: #333; }
    .value.big { font-size: 1.4rem; font-weight: bold; color: #1B4F72; }
    .value.method { font-size: 1rem; }
    .note-box { background: #f9f7f2; border-left: 3px solid #C8A96E;
                padding: 10px 14px; border-radius: 0 4px 4px 0; font-size: 0.9rem; color: #555; }
    .footer { margin-top: 24px; font-size: 0.78rem; color: #bbb; text-align: center;
              border-top: 1px solid #f0ebe0; padding-top: 16px; }
    a { color: #1B4F72; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Nuova richiesta di prenotazione</h2>
    <p class="subtitle">casaebottegapuglia.it · ${ricevuta}</p>

    <div class="section">
      <div class="section-title">🛏 Soggiorno</div>
      <div class="field"><span class="label">Camera</span><span class="value">${room}</span></div>
      <div class="field"><span class="label">Check-in</span><span class="value">${checkin}</span></div>
      <div class="field"><span class="label">Check-out</span><span class="value">${checkout}</span></div>
      <div class="field"><span class="label">Notti</span><span class="value">${nights}</span></div>
      <div class="field"><span class="label">Ospiti</span><span class="value">${guests}</span></div>
      ${discount ? `<div class="field"><span class="label">Sconto</span><span class="value">${discount}</span></div>` : ''}
      <div class="field"><span class="label">Totale</span><span class="value big">€${total}</span></div>
      <div class="field"><span class="label">Pagamento</span><span class="value method">${methodLabel}</span></div>
    </div>

    <div class="section">
      <div class="section-title">👤 Ospite</div>
      <div class="field"><span class="label">Nome</span><span class="value">${name}</span></div>
      <div class="field"><span class="label">Telefono</span><span class="value"><a href="tel:${phone}">${phone}</a></span></div>
      <div class="field"><span class="label">Email</span><span class="value"><a href="mailto:${email}">${email}</a></span></div>
      ${message ? `<div class="field" style="flex-direction:column; gap:4px;"><span class="label">Note</span><div class="note-box">${message.replace(/\n/g, '<br>')}</div></div>` : ''}
    </div>

    <div class="footer">
      Gestisci le prenotazioni su <a href="https://app.netlify.com">Netlify</a>
    </div>
  </div>
</body>
</html>`;

  // Invia entrambe le email (host + ospite) in parallelo
  const emailTasks = [
    smtpSend({
      host: 'smtp.gmail.com', port: 465,
      user: GMAIL_USER, pass: GMAIL_APP_PASSWORD,
      from: GMAIL_USER, to: NOTIFY_EMAIL,
      subject: subjectHost, html
    }).then(() => console.log(`[send-booking] Email host inviata per ${name}`))
      .catch(err => console.error('[send-booking] Errore email host:', err.message)),

    smtpSend({
      host: 'smtp.gmail.com', port: 465,
      user: GMAIL_USER, pass: GMAIL_APP_PASSWORD,
      from: GMAIL_USER, to: email,
      subject: subjectGuest, html: htmlGuest
    }).then(() => console.log(`[send-booking] Email conferma inviata a ${email}`))
      .catch(err => console.error('[send-booking] Errore email ospite:', err.message))
  ];

  await Promise.allSettled(emailTasks);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  };
};
