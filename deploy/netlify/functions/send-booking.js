/*
  send-booking.js — Netlify Function
  Casa e Bottega · Manfredonia

  Riceve i dati di una richiesta di prenotazione dal form
  su prenota.html e invia una notifica email all'host via OVH SMTP.

  Variabili d'ambiente da configurare su Netlify:
    SMTP_USER     → booking@casaebottegapuglia.it
    SMTP_PASSWORD → password della casella OVH/Zimbra
    NOTIFY_EMAIL  → dove ricevere le notifiche (es. tua email personale)
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

  const SMTP_USER     = process.env.SMTP_USER;
  const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
  const NOTIFY_EMAIL  = process.env.NOTIFY_EMAIL || SMTP_USER;

  if (!SMTP_USER || !SMTP_PASSWORD) {
    console.error('[send-booking] SMTP_USER o SMTP_PASSWORD mancanti');
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

  const phoneClean  = phone.replace(/[\s\-\(\)]/g, '');
  const phoneWa     = phoneClean.replace(/^\+/, '');
  const firstName   = name.split(' ')[0] || name;
  const methodLabel = method === 'paypal' ? '💳 PayPal' : '🏦 Bonifico / Contanti all\'arrivo';
  const ricevuta    = formatTs(new Date().toISOString());

  const subjectHost  = `🛎 Nuova prenotazione — ${name} | Casa e Bottega`;
  const subjectGuest = method === 'paypal'
    ? `Richiesta ricevuta — ti mandiamo il link di pagamento | Casa e Bottega`
    : `Richiesta ricevuta — a presto! | Casa e Bottega`;

  // ══════════════════════════════════════════════════════════════════
  //  EMAIL ALL'OSPITE
  // ══════════════════════════════════════════════════════════════════
  const htmlGuest = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Casa e Bottega — Richiesta ricevuta</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F0E8;">
<tr><td align="center" style="padding:32px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

  <!-- ── HEADER ── -->
  <tr><td style="background:#1F4A4A;padding:28px 36px;border-radius:4px 4px 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;">
        <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(245,240,232,0.45);margin-bottom:5px;">Manfredonia · Gargano · Puglia</div>
        <div style="font-family:Georgia,serif;font-size:24px;font-weight:normal;color:#F5F0E8;letter-spacing:0.02em;">Casa <em>e</em> Bottega</div>
      </td>
      <td align="right" style="vertical-align:middle;">
        <table cellpadding="0" cellspacing="0" border="0"><tr><td align="center"
          style="width:52px;height:52px;border-radius:50%;border:2px solid rgba(200,169,110,0.55);
                 font-family:Georgia,serif;font-size:14px;font-weight:bold;color:#C8A96E;
                 text-align:center;vertical-align:middle;line-height:48px;">
          C&amp;B
        </td></tr></table>
      </td>
    </tr></table>
  </td></tr>

  <!-- ── BANNER NEXT STEP ── -->
  <tr><td style="background:${method === 'paypal' ? '#EEF8E8' : '#EAF0F8'};
                 border-left:4px solid ${method === 'paypal' ? '#5a8a30' : '#1F4A4A'};
                 padding:14px 36px;">
    <p style="font-family:Arial,sans-serif;font-size:13px;margin:0;
              color:${method === 'paypal' ? '#3a7a18' : '#1F4A4A'};font-weight:600;line-height:1.5;">
      ${method === 'paypal'
        ? '📩 Ti mandiamo a breve il link PayPal per completare il pagamento.'
        : '📋 Ti confermiamo la disponibilità entro 24 ore via email o WhatsApp.'}
    </p>
  </td></tr>

  <!-- ── BODY ── -->
  <tr><td style="background:#FFFFFF;padding:36px 36px 28px;border-radius:0 0 4px 4px;">

    <!-- Greeting -->
    <p style="font-family:Georgia,serif;font-size:20px;color:#1A1612;margin:0 0 6px;font-weight:normal;">
      Ciao <strong>${name}</strong>,
    </p>
    <p style="font-family:Arial,sans-serif;font-size:14px;color:#555;line-height:1.75;margin:0 0 30px;">
      grazie per aver scelto Casa e Bottega — siamo felici di averti ospite a Manfredonia!<br>
      Ho ricevuto la tua richiesta.
      ${method === 'paypal'
        ? 'Ti invio a breve il link PayPal per completare il pagamento e confermare definitivamente il soggiorno.'
        : 'Puoi pagare tramite bonifico (trovi i dati qui sotto) o in contanti all\'arrivo — scrivimi su WhatsApp per confermare.'}
    </p>

    <!-- Riepilogo soggiorno -->
    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.16em;
                text-transform:uppercase;color:#C8A96E;margin-bottom:14px;">
      🛏 Riepilogo soggiorno
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr><td style="border-top:1px solid #EEE9E0;padding:9px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-family:Arial,sans-serif;font-size:11px;color:#AAA;width:120px;">Camera</td>
          <td style="font-family:Georgia,serif;font-size:15px;color:#1A1612;">${room}</td>
        </tr></table>
      </td></tr>
      <tr><td style="border-top:1px solid #EEE9E0;padding:9px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-family:Arial,sans-serif;font-size:11px;color:#AAA;width:120px;">Check-in</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
            ${checkin}
            <span style="color:#AAA;font-size:11px;"> · dalle 15:00</span>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="border-top:1px solid #EEE9E0;padding:9px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-family:Arial,sans-serif;font-size:11px;color:#AAA;width:120px;">Check-out</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
            ${checkout}
            <span style="color:#AAA;font-size:11px;"> · entro le 11:00</span>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="border-top:1px solid #EEE9E0;padding:9px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-family:Arial,sans-serif;font-size:11px;color:#AAA;width:120px;">Notti · Ospiti</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
            ${nights} nott${nights == 1 ? 'e' : 'i'} · ${guests} ospit${guests == 1 ? 'e' : 'i'}
          </td>
        </tr></table>
      </td></tr>
      ${discount ? `<tr><td style="border-top:1px solid #EEE9E0;padding:9px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-family:Arial,sans-serif;font-size:11px;color:#AAA;width:120px;">Sconto</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;color:#5a8a30;">${discount}</td>
        </tr></table>
      </td></tr>` : ''}
      <tr><td style="border-top:1px solid #EEE9E0;border-bottom:2px solid #EEE9E0;padding:12px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-family:Arial,sans-serif;font-size:11px;color:#AAA;width:120px;">Totale stimato</td>
          <td style="font-family:Georgia,serif;font-size:24px;color:#1F4A4A;font-weight:bold;">€${total}</td>
        </tr></table>
      </td></tr>
    </table>

    ${method === 'offline' ? `
    <!-- Dati per il bonifico -->
    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.16em;
                text-transform:uppercase;color:#C8A96E;margin-bottom:14px;">
      🏦 Dati per il bonifico
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
    <tr><td style="background:#F5F0E8;padding:20px 24px;border-radius:4px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-family:Arial,sans-serif;font-size:11px;color:#999;width:110px;padding-bottom:8px;">Intestatario</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;color:#1A1612;font-weight:600;padding-bottom:8px;">La Torre Nicoletta</td>
        </tr>
        <tr>
          <td style="font-family:Arial,sans-serif;font-size:11px;color:#999;width:110px;padding-bottom:8px;">IBAN</td>
          <td style="font-family:'Courier New',Courier,monospace;font-size:13px;color:#1A1612;
                     letter-spacing:0.05em;padding-bottom:8px;">IT65 R360 8105 1382 5842 8558 440</td>
        </tr>
        <tr>
          <td style="font-family:Arial,sans-serif;font-size:11px;color:#999;">Causale</td>
          <td style="font-family:Arial,sans-serif;font-size:13px;color:#555;">
            Prenotazione ${room} — ${checkin}
          </td>
        </tr>
      </table>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#888;margin:14px 0 0;line-height:1.65;
                border-top:1px solid #E8E2D8;padding-top:12px;">
        In alternativa puoi pagare in <strong style="color:#555;">contanti all'arrivo</strong>.
        Scrivimi su WhatsApp per confermare — così organizziamo tutto al meglio.
      </p>
    </td></tr>
    </table>
    ` : ''}

    <!-- Note del check-in -->
    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.16em;
                text-transform:uppercase;color:#C8A96E;margin-bottom:14px;">
      🔑 Note per il check-in
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
    <tr><td style="background:#F5F0E8;padding:18px 24px;border-radius:4px;">
      <p style="font-family:Arial,sans-serif;font-size:14px;color:#444;margin:0;line-height:1.75;">
        Il check-in è a partire dalle <strong>15:00</strong>.
        Sentiamoci pure nei giorni precedenti: se la camera fosse pronta prima, sarò felice di accoglierti in anticipo.<br><br>
        Al vostro arrivo troverete in casa bagnoschiuma, cialde per il caffè e altri oggetti di cortesia.
        Ricordate di portare un documento d'identità per la registrazione obbligatoria.<br><br>
        <em style="font-size:12px;color:#888;">Nota: per i non residenti è prevista la tassa di soggiorno di €&nbsp;1,50 a notte per persona.</em>
      </p>
    </td></tr>
    </table>

    <!-- Come raggiungerci -->
    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.16em;
                text-transform:uppercase;color:#C8A96E;margin-bottom:14px;">
      📍 Come raggiungerci
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr><td style="border-top:1px solid #EEE9E0;padding:9px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-family:Arial,sans-serif;font-size:11px;color:#AAA;width:120px;">Indirizzo</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;color:#333;">Via Gargano 13, Manfredonia (FG)</td>
        </tr></table>
      </td></tr>
      <tr><td style="border-top:1px solid #EEE9E0;border-bottom:1px solid #EEE9E0;padding:9px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-family:Arial,sans-serif;font-size:11px;color:#AAA;width:120px;">Google Maps</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;">
            <a href="https://www.google.com/maps/search/?api=1&query=Via+Gargano+13%2C+Manfredonia+FG"
               style="color:#1F4A4A;text-decoration:none;font-weight:600;">
              Apri il percorso →
            </a>
          </td>
        </tr></table>
      </td></tr>
    </table>

    <!-- WhatsApp CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
    <tr><td align="center">
      <a href="https://wa.me/393334705574?text=Ciao%20Nicoletta%2C%20ho%20appena%20inviato%20una%20richiesta%20di%20prenotazione%20dal%20sito."
         style="display:inline-block;background:#25D366;color:#fff;font-family:Arial,sans-serif;
                font-size:13px;font-weight:700;text-decoration:none;padding:14px 32px;
                border-radius:3px;letter-spacing:0.04em;">
        💬 Scrivici su WhatsApp
      </a>
    </td></tr>
    </table>

    <!-- Firma -->
    <p style="font-family:Georgia,serif;font-size:15px;color:#888;line-height:1.7;margin:0 0 2px;">A presto,</p>
    <p style="font-family:Georgia,serif;font-size:15px;color:#1A1612;margin:0;">
      <em>Casa e Bottega</em>
    </p>

  </td></tr>

  <!-- ── FOOTER ── -->
  <tr><td style="padding:20px 36px;text-align:center;">
    <p style="font-family:Arial,sans-serif;font-size:11px;color:#B8B0A6;margin:0;line-height:1.7;">
      Hai inviato questa richiesta dal sito
      <a href="https://casaebottegapuglia.it" style="color:#B8B0A6;">casaebottegapuglia.it</a><br>
      Se non sei stato tu, ignora questa email.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  // ══════════════════════════════════════════════════════════════════
  //  EMAIL ALL'HOST
  // ══════════════════════════════════════════════════════════════════
  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Casa e Bottega — Nuova prenotazione</title>
</head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F0E8;">
<tr><td align="center" style="padding:32px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

  <!-- ── HEADER ── -->
  <tr><td style="background:#1F4A4A;padding:24px 32px;border-radius:4px 4px 0 0;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:middle;">
        <div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.2em;
                    text-transform:uppercase;color:rgba(245,240,232,0.4);margin-bottom:4px;">
          Casa e Bottega
        </div>
        <div style="font-family:Georgia,serif;font-size:20px;color:#F5F0E8;">
          🛎 Nuova richiesta di prenotazione
        </div>
        <div style="font-family:Arial,sans-serif;font-size:11px;color:rgba(245,240,232,0.45);margin-top:4px;">
          ${ricevuta}
        </div>
      </td>
      <td align="right" style="vertical-align:middle;">
        <table cellpadding="0" cellspacing="0" border="0"><tr><td align="center"
          style="width:48px;height:48px;border-radius:50%;border:2px solid rgba(200,169,110,0.5);
                 font-family:Georgia,serif;font-size:13px;font-weight:bold;color:#C8A96E;
                 text-align:center;line-height:44px;">
          C&amp;B
        </td></tr></table>
      </td>
    </tr></table>
  </td></tr>

  <!-- ── AZIONE RICHIESTA ── -->
  <tr><td style="background:${method === 'paypal' ? '#FFF8E8' : '#EAF2FF'};
                 border-left:4px solid ${method === 'paypal' ? '#C8A96E' : '#1F4A4A'};
                 padding:14px 32px;">
    <p style="font-family:Arial,sans-serif;font-size:13px;margin:0;font-weight:700;
              color:${method === 'paypal' ? '#8a6820' : '#1F4A4A'};">
      ${method === 'paypal'
        ? '💳 Invia il link PayPal a ' + email
        : '📋 Conferma disponibilità → blocca le date su Booking e Airbnb'}
    </p>
  </td></tr>

  <!-- ── BODY ── -->
  <tr><td style="background:#FFFFFF;padding:28px 32px 24px;border-radius:0 0 4px 4px;">

    <!-- Soggiorno -->
    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.16em;
                text-transform:uppercase;color:#C8A96E;margin-bottom:12px;">Soggiorno</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
      <tr><td style="border-top:1px solid #F0EAE0;padding:8px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:11px;color:#AAA;width:110px;">Camera</td>
          <td style="font-family:Georgia,serif;font-size:15px;color:#1A1612;">${room}</td>
        </tr></table>
      </td></tr>
      <tr><td style="border-top:1px solid #F0EAE0;padding:8px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:11px;color:#AAA;width:110px;">Check-in</td>
          <td style="font-size:14px;color:#333;">${checkin}</td>
        </tr></table>
      </td></tr>
      <tr><td style="border-top:1px solid #F0EAE0;padding:8px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:11px;color:#AAA;width:110px;">Check-out</td>
          <td style="font-size:14px;color:#333;">${checkout}</td>
        </tr></table>
      </td></tr>
      <tr><td style="border-top:1px solid #F0EAE0;padding:8px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:11px;color:#AAA;width:110px;">Notti · Ospiti</td>
          <td style="font-size:14px;color:#333;">${nights} notti · ${guests} ospiti</td>
        </tr></table>
      </td></tr>
      ${discount ? `<tr><td style="border-top:1px solid #F0EAE0;padding:8px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:11px;color:#AAA;width:110px;">Sconto</td>
          <td style="font-size:14px;color:#5a8a30;">${discount}</td>
        </tr></table>
      </td></tr>` : ''}
      <tr><td style="border-top:1px solid #F0EAE0;padding:8px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:11px;color:#AAA;width:110px;">Pagamento</td>
          <td style="font-size:14px;color:#333;">${methodLabel}</td>
        </tr></table>
      </td></tr>
      <tr><td style="border-top:1px solid #F0EAE0;border-bottom:2px solid #F0EAE0;padding:10px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:11px;color:#AAA;width:110px;">Totale</td>
          <td style="font-family:Georgia,serif;font-size:24px;color:#1F4A4A;font-weight:bold;">€${total}</td>
        </tr></table>
      </td></tr>
    </table>

    <!-- Ospite -->
    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.16em;
                text-transform:uppercase;color:#C8A96E;margin-bottom:12px;">Ospite</div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
      <tr><td style="border-top:1px solid #F0EAE0;padding:8px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:11px;color:#AAA;width:110px;">Nome</td>
          <td style="font-size:14px;color:#1A1612;font-weight:600;">${name}</td>
        </tr></table>
      </td></tr>
      <tr><td style="border-top:1px solid #F0EAE0;padding:8px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:11px;color:#AAA;width:110px;">Telefono</td>
          <td style="font-size:14px;">
            <a href="https://wa.me/${phoneWa}" style="color:#25D366;font-weight:600;text-decoration:none;">
              📱 ${phone}
            </a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="border-top:1px solid #F0EAE0;border-bottom:1px solid #F0EAE0;padding:8px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:11px;color:#AAA;width:110px;">Email</td>
          <td style="font-size:14px;">
            <a href="mailto:${email}" style="color:#1F4A4A;text-decoration:none;">${email}</a>
          </td>
        </tr></table>
      </td></tr>
      ${message ? `<tr><td style="border-bottom:1px solid #F0EAE0;padding:10px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:11px;color:#AAA;width:110px;vertical-align:top;padding-top:2px;">Note</td>
          <td style="font-size:13px;color:#555;font-style:italic;background:#F9F6F1;
                     padding:10px 14px;border-radius:3px;border-left:2px solid #C8A96E;">
            ${message.replace(/\n/g, '<br>')}
          </td>
        </tr></table>
      </td></tr>` : ''}
    </table>

    <!-- Pulsanti azione rapida -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:4px;">
        <a href="https://wa.me/${phoneWa}?text=Ciao%20${encodeURIComponent(firstName)}%2C%20ho%20ricevuto%20la%20tua%20richiesta%20per%20Casa%20e%20Bottega."
           style="display:inline-block;background:#25D366;color:#fff;font-size:12px;font-weight:700;
                  text-decoration:none;padding:11px 20px;border-radius:3px;font-family:Arial,sans-serif;
                  letter-spacing:0.04em;">
          📱 WhatsApp
        </a>
      </td>
      <td align="center" style="padding:4px;">
        <a href="mailto:${email}?subject=Conferma prenotazione Casa e Bottega&body=Ciao ${encodeURIComponent(firstName)},"
           style="display:inline-block;background:#1F4A4A;color:#fff;font-size:12px;font-weight:700;
                  text-decoration:none;padding:11px 20px;border-radius:3px;font-family:Arial,sans-serif;
                  letter-spacing:0.04em;">
          ✉ Rispondi per email
        </a>
      </td>
    </tr>
    </table>

  </td></tr>

  <!-- ── FOOTER ── -->
  <tr><td style="padding:18px 32px;text-align:center;">
    <p style="font-family:Arial,sans-serif;font-size:11px;color:#B8B0A6;margin:0;line-height:1.7;">
      Casa e Bottega · Via Gargano 13, Manfredonia ·
      <a href="mailto:booking@casaebottegapuglia.it" style="color:#B8B0A6;">
        booking@casaebottegapuglia.it
      </a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  // Invia entrambe le email (host + ospite) in parallelo
  const emailTasks = [
    smtpSend({
      host: 'ssl0.ovh.net', port: 465,
      user: SMTP_USER, pass: SMTP_PASSWORD,
      from: SMTP_USER, to: NOTIFY_EMAIL,
      subject: subjectHost, html
    }).then(() => console.log(`[send-booking] Email host inviata per ${name}`))
      .catch(err => console.error('[send-booking] Errore email host:', err.message)),

    smtpSend({
      host: 'ssl0.ovh.net', port: 465,
      user: SMTP_USER, pass: SMTP_PASSWORD,
      from: SMTP_USER, to: email,
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
