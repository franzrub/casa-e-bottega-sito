/*
  send-receipt.js — Netlify Function
  Casa e Bottega · Manfredonia

  Chiamata dalla pagina /admin/conferma.html per inviare
  all'ospite una email di conferma prenotazione / ricevuta di pagamento.

  Stesse variabili d'ambiente degli altri mailer:
    GMAIL_USER          → il tuo Gmail
    GMAIL_APP_PASSWORD  → App Password Gmail (16 caratteri)
*/

const tls = require('tls');

// ─── Minuscolo client SMTP (identico agli altri) ───────────────────
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

// ─── Genera numero ricevuta univoco ───────────────────────────────
function receipNumber() {
  const now = new Date();
  const yy  = now.getFullYear();
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const rnd = String(Math.floor(Math.random() * 9000) + 1000);
  return `CEB-${yy}${mm}-${rnd}`;
}

// ─── Handler ──────────────────────────────────────────────────────
exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const GMAIL_USER         = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error('[send-receipt] Credenziali Gmail mancanti');
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'email config missing' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const {
    name     = '—',
    email    = '—',
    room     = '—',
    checkin  = '—',
    checkout = '—',
    nights   = '—',
    guests   = '—',
    amount   = '—',
    method   = '—',
    note     = ''
  } = data;

  const receiptId = receipNumber();
  const emessa = new Date().toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Rome'
  });

  const subject = `🏠 Prenotazione confermata — Casa e Bottega (${receiptId})`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 20px; }
    .card { max-width: 560px; margin: 0 auto; background: white; border-radius: 8px;
            padding: 36px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .logo { font-size: 1rem; font-weight: bold; color: #C8A96E;
            letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }
    .receipt-id { font-size: 0.75rem; color: #bbb; margin-bottom: 20px; }
    h2 { color: #1B4F72; font-size: 1.45rem; margin: 0 0 6px; }
    .subtitle { color: #999; font-size: 0.85rem; margin: 0 0 24px;
                border-bottom: 2px solid #C8A96E; padding-bottom: 12px; }
    .intro { font-size: 0.97rem; color: #444; line-height: 1.7; margin-bottom: 28px; }
    .section-title { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.1em;
                     color: #C8A96E; font-weight: bold; margin: 24px 0 10px;
                     border-bottom: 1px solid #f0ebe0; padding-bottom: 6px; }
    .field { display: flex; gap: 8px; margin-bottom: 10px; align-items: baseline; }
    .label { font-size: 0.8rem; color: #999; min-width: 110px; flex-shrink: 0; }
    .value { font-size: 0.95rem; color: #333; }
    .amount-box {
      background: #1B4F72; color: white; border-radius: 8px;
      padding: 18px 20px; margin: 24px 0; display: flex;
      justify-content: space-between; align-items: center;
    }
    .amount-label { font-size: 0.85rem; opacity: 0.8; }
    .amount-value { font-size: 1.8rem; font-weight: bold; }
    .amount-method { font-size: 0.8rem; opacity: 0.7; margin-top: 2px; }
    .note-box { background: #f9f7f2; border-left: 3px solid #C8A96E;
                padding: 10px 14px; font-size: 0.88rem; color: #555;
                border-radius: 0 4px 4px 0; margin-top: 8px; line-height: 1.6; }
    .info-box { background: #f9f7f2; border-left: 3px solid #C8A96E;
                padding: 12px 16px; font-size: 0.88rem; color: #555;
                border-radius: 0 4px 4px 0; line-height: 1.8; margin-bottom: 8px; }
    .footer { margin-top: 28px; font-size: 0.78rem; color: #bbb; text-align: center;
              border-top: 1px solid #f0ebe0; padding-top: 16px; line-height: 1.6; }
    a { color: #1B4F72; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Casa e Bottega</div>
    <div class="receipt-id">Ricevuta n. ${receiptId}</div>

    <h2>Prenotazione confermata ✓</h2>
    <p class="subtitle">Manfredonia, Puglia · emessa il ${emessa}</p>

    <p class="intro">
      Caro/a <strong>${name}</strong>, siamo felici di confermarti la prenotazione
      presso Casa e Bottega. Conserva questa email come ricevuta del tuo pagamento.
    </p>

    <!-- Importo pagato -->
    <div class="amount-box">
      <div>
        <div class="amount-label">Totale pagato</div>
        <div class="amount-method">${method}</div>
      </div>
      <div class="amount-value">€${amount}</div>
    </div>

    <div class="section-title">🛏 Dettagli soggiorno</div>
    <div class="field"><span class="label">Camera</span><span class="value">${room}</span></div>
    <div class="field"><span class="label">Check-in</span><span class="value"><strong>${checkin}</strong></span></div>
    <div class="field"><span class="label">Check-out</span><span class="value"><strong>${checkout}</strong></span></div>
    <div class="field"><span class="label">Notti</span><span class="value">${nights}</span></div>
    <div class="field"><span class="label">Ospiti</span><span class="value">${guests}</span></div>

    ${note ? `
    <div class="section-title">📝 Note</div>
    <div class="note-box">${note.replace(/\n/g, '<br>')}</div>
    ` : ''}

    <div class="section-title">📍 Come raggiungerci</div>
    <div class="info-box">
      <strong>Casa e Bottega</strong><br>
      Manfredonia (FG), Puglia<br>
      📧 <a href="mailto:bookings@casaebottegapuglia.it">bookings@casaebottegapuglia.it</a><br>
      🌐 <a href="https://casaebottegapuglia.it">casaebottegapuglia.it</a>
    </div>

    <div class="footer">
      Grazie per aver scelto Casa e Bottega — non vediamo l'ora di accoglierti!<br>
      Ricevuta n. ${receiptId} · ${emessa}
    </div>
  </div>
</body>
</html>`;

  try {
    await smtpSend({
      host: 'smtp.gmail.com',
      port: 465,
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
      from: GMAIL_USER,
      to: email,
      subject,
      html
    });
    console.log(`[send-receipt] Ricevuta ${receiptId} inviata a ${email}`);
  } catch (err) {
    console.error('[send-receipt] Errore invio:', err.message);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, receiptId })
  };
};
