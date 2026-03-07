/*
  submission-created.js — Netlify Function
  Casa e Bottega · Manfredonia

  Si attiva automaticamente ogni volta che qualcuno compila
  il form di contatto sul sito. Invia una notifica email
  via Gmail SMTP usando solo moduli built-in di Node.js.

  ─── Setup richiesto (una tantum) ──────────────────────────────────
  1. Abilita 2FA sul tuo account Google:
     https://myaccount.google.com/security

  2. Crea una "App Password" Gmail:
     https://myaccount.google.com/apppasswords
     → Seleziona app: "Altra (nome personalizzato)" → es: "Netlify B&B"
     → Copia la password di 16 caratteri generata

  3. Su Netlify → Site configuration → Environment variables, aggiungi:
     GMAIL_USER        →  il tuo indirizzo Gmail (es: d.francescorubino@gmail.com)
     GMAIL_APP_PASSWORD → la password di 16 caratteri copiata sopra
     NOTIFY_EMAIL      →  dove ricevere le notifiche (es: d.francescorubino@gmail.com)
  ──────────────────────────────────────────────────────────────────
*/

const tls  = require('tls');
const net  = require('net');

// ─── Minuscolo client SMTP (senza dipendenze npm) ─────────────────
function smtpSend({ host, port, secure, user, pass, from, to, subject, html }) {
  return new Promise((resolve, reject) => {
    const b64 = s => Buffer.from(s).toString('base64');
    const lines = [];

    function connect(socket) {
      let buffer = '';
      let stage  = 0;

      const sequence = [
        // stage 0: greeting (we just read it)
        () => socket.write(`EHLO netlify.function\r\n`),
        // stage 1: after EHLO
        () => socket.write(`AUTH LOGIN\r\n`),
        // stage 2: after AUTH LOGIN (334 Username:)
        () => socket.write(b64(user) + '\r\n'),
        // stage 3: after username (334 Password:)
        () => socket.write(b64(pass) + '\r\n'),
        // stage 4: after password (235 Authentication successful)
        () => socket.write(`MAIL FROM:<${from}>\r\n`),
        // stage 5: after MAIL FROM
        () => socket.write(`RCPT TO:<${to}>\r\n`),
        // stage 6: after RCPT TO
        () => socket.write(`DATA\r\n`),
        // stage 7: after DATA (354)
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
        // stage 8: after message body (250)
        () => socket.write(`QUIT\r\n`),
      ];

      socket.on('data', chunk => {
        buffer += chunk.toString();
        // Process complete lines (ending in \r\n or \n)
        const parts = buffer.split(/\r?\n/);
        buffer = parts.pop(); // keep incomplete line
        parts.forEach(line => {
          if (!line) return;
          lines.push(line);
          console.log(`[smtp] stage=${stage} → ${line}`);

          // Multi-line responses end with "NNN " (space after code)
          // While continuation lines are "NNN-" (dash after code)
          const code = line.substring(0, 3);
          const isFinal = line[3] === ' ' || line.length === 3;
          if (!isFinal) return; // wait for last line of multi-line response

          // Check for errors
          if (code.startsWith('4') || code.startsWith('5')) {
            socket.destroy();
            return reject(new Error(`SMTP error at stage ${stage}: ${line}`));
          }

          if (stage === 0 && code === '220') {
            // Greeting received
            stage++;
            sequence[0]();
          } else if (stage === 1 && code === '250') {
            // EHLO accepted
            stage++;
            sequence[1]();
          } else if (stage === 2 && code === '334') {
            // Username prompt
            stage++;
            sequence[2]();
          } else if (stage === 3 && code === '334') {
            // Password prompt
            stage++;
            sequence[3]();
          } else if (stage === 4 && code === '235') {
            // Auth success
            stage++;
            sequence[4]();
          } else if (stage === 5 && code === '250') {
            // MAIL FROM accepted
            stage++;
            sequence[5]();
          } else if (stage === 6 && code === '250') {
            // RCPT TO accepted
            stage++;
            sequence[6]();
          } else if (stage === 7 && code === '354') {
            // DATA ready
            stage++;
            sequence[7]();
          } else if (stage === 8 && code === '250') {
            // Message accepted
            stage++;
            sequence[8]();
          } else if (stage === 9 && code === '221') {
            // QUIT accepted
            socket.destroy();
            resolve({ success: true, log: lines });
          }
        });
      });

      socket.on('error', err => reject(err));
      socket.on('close', () => {
        if (stage < 9) reject(new Error(`Connection closed at stage ${stage}`));
      });
    }

    if (secure) {
      // Direct TLS (porta 465)
      const socket = tls.connect({ host, port, servername: host }, () => {
        connect(socket);
      });
    } else {
      // STARTTLS (porta 587) — non usato qui ma lasciato per riferimento
      const socket = net.connect({ host, port }, () => {
        connect(socket);
      });
    }
  });
}

// ─── Formatta data italiana ───────────────────────────────────────
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome'
  });
}

// ─── Handler ──────────────────────────────────────────────────────
exports.handler = async function(event) {
  // Leggi configurazione da variabili d'ambiente
  const GMAIL_USER         = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
  const NOTIFY_EMAIL       = process.env.NOTIFY_EMAIL || GMAIL_USER;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error('[form-notify] Variabili GMAIL_USER o GMAIL_APP_PASSWORD mancanti');
    return { statusCode: 200, body: 'Config missing, skipping email' };
  }

  // Netlify invia il payload del form come JSON nel body
  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch (e) {
    console.error('[form-notify] Impossibile leggere payload:', e.message);
    return { statusCode: 200, body: 'Bad payload' };
  }

  const data     = payload.data || {};
  const nome     = data.nome     || '(non specificato)';
  const email    = data.email    || '(non specificata)';
  const telefono = data.telefono || '(non specificato)';
  const camera   = data.camera   || '(non specificata)';
  const messaggio = data.messaggio || '(vuoto)';
  const quando   = formatDate(payload.created_at || new Date().toISOString());

  const subject = `📬 Nuovo messaggio da ${nome} — Casa e Bottega`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Georgia, serif; background: #F5F0E8; margin: 0; padding: 20px; }
    .card { max-width: 520px; margin: 0 auto; background: white; border-radius: 8px;
            padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    h2 { color: #1B4F72; font-size: 1.4rem; margin: 0 0 24px; border-bottom: 2px solid #C8A96E; padding-bottom: 12px; }
    .field { margin-bottom: 14px; }
    .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;
             color: #999; margin-bottom: 4px; }
    .value { font-size: 1rem; color: #333; line-height: 1.5; }
    .messaggio { background: #f9f7f2; border-left: 3px solid #C8A96E;
                 padding: 12px 16px; border-radius: 0 4px 4px 0; }
    .footer { margin-top: 28px; font-size: 0.8rem; color: #aaa; text-align: center; }
    a { color: #1B4F72; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Nuovo messaggio da casaebottegapuglia.it</h2>

    <div class="field">
      <div class="label">👤 Nome</div>
      <div class="value">${nome}</div>
    </div>

    <div class="field">
      <div class="label">✉️ Email</div>
      <div class="value"><a href="mailto:${email}">${email}</a></div>
    </div>

    <div class="field">
      <div class="label">📱 Telefono / WhatsApp</div>
      <div class="value">${telefono}</div>
    </div>

    <div class="field">
      <div class="label">🛏 Camera di interesse</div>
      <div class="value">${camera}</div>
    </div>

    <div class="field">
      <div class="label">💬 Messaggio</div>
      <div class="value messaggio">${messaggio.replace(/\n/g, '<br>')}</div>
    </div>

    <div class="footer">
      Ricevuto il ${quando} · <a href="https://app.netlify.com">Netlify Forms</a>
    </div>
  </div>
</body>
</html>`;

  try {
    await smtpSend({
      host:    'smtp.gmail.com',
      port:    465,
      secure:  true,
      user:    GMAIL_USER,
      pass:    GMAIL_APP_PASSWORD,
      from:    GMAIL_USER,
      to:      NOTIFY_EMAIL,
      subject,
      html
    });
    console.log(`[form-notify] Email inviata a ${NOTIFY_EMAIL}`);
    return { statusCode: 200, body: 'Email inviata' };
  } catch (err) {
    console.error('[form-notify] Errore invio email:', err.message);
    // Restituiamo 200 comunque: il form Netlify è già stato salvato
    return { statusCode: 200, body: 'Email fallita, ma form salvato' };
  }
};
