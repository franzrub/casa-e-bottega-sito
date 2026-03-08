/* ============================================
   CASA E BOTTEGA — Main JavaScript
   ============================================ */

/* ============================================
   DATE BLOCCATE — aggiorna qui ad ogni prenotazione
   Formato: 'YYYY-MM-DD'
   Inserisci tutte le notti occupate (escluso giorno checkout).
   Queste date vengono sempre applicate, anche se iCal non carica.
   ============================================ */
const MANUAL_BLOCKED = {
  dimora: [
    // Prenotazione: check-in 4 mar, check-out 8 mar 2026
    '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07'
  ],
  bottega: [
    // Aggiungi date per La Bottega quando necessario
  ]
};

/* ============================================
   PRICING CONFIGURATION
   I prezzi vengono caricati da /_data/prezzi.json
   (modificabile dal pannello admin senza toccare il codice)
   ============================================ */
let PRICING = {
  dimora: { high: 100, low: 60 },
  bottega: { high: 90, low: 50 },
  otaMarkup: 1.20,
  weeklyDiscount: 0.10,
  monthlyDiscount: 0.20,
  highSeasonMonths: [6, 7, 8]
};

// Carica prezzi aggiornati da _data/prezzi.json (gestito dal CMS)
fetch('/_data/prezzi.json')
  .then(r => r.ok ? r.json() : null)
  .then(data => {
    if (!data) return;
    PRICING.dimora   = { high: data.alta.dimora,   low: data.bassa.dimora };
    PRICING.bottega  = { high: data.alta.bottega,  low: data.bassa.bottega };
    PRICING.otaMarkup        = data.ota_markup       || PRICING.otaMarkup;
    PRICING.weeklyDiscount   = data.weekly_discount  || PRICING.weeklyDiscount;
    PRICING.monthlyDiscount  = data.monthly_discount || PRICING.monthlyDiscount;
    // Aggiorna le card prezzi con i nuovi valori
    if (typeof window.updatePricingCards === 'function') window.updatePricingCards();
  })
  .catch(() => { /* usa prezzi di default */ });

function getSeasonPrice(room, month) {
  const r = PRICING[room] || PRICING.dimora;
  const isHigh = PRICING.highSeasonMonths.includes(month);
  return isHigh ? r.high : r.low;
}

function getOTAPrice(directPrice) {
  return Math.round(directPrice * PRICING.otaMarkup);
}

function isHighSeason(month) {
  return PRICING.highSeasonMonths.includes(month);
}

/* ============================================
   BOOKING STATE & BOOKING FLOW
   ============================================ */
const bookingState = {
  checkin: null,
  checkout: null,
  room: null,
  nights: 0,
  totalDirect: 0,
  totalOTA: 0,
  discount: 0,
  discountLabel: ''
};

function showBookingStep(stepNumber) {
  // Hide all steps
  ['booking-step-1', 'booking-step-2', 'booking-step-3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('active');
      setTimeout(() => { el.style.display = 'none'; }, 300);
    }
  });

  // Show target step
  const targetStep = document.getElementById(`booking-step-${stepNumber}`);
  if (targetStep) {
    targetStep.style.display = 'block';
    setTimeout(() => { targetStep.classList.add('active'); }, 10);
  }

  // Update step indicators
  document.querySelectorAll('.step-indicator .step').forEach((step, idx) => {
    const stepNum = idx + 1;
    if (stepNum < stepNumber) {
      step.classList.add('completed');
      step.classList.remove('active');
    } else if (stepNum === stepNumber) {
      step.classList.add('active');
      step.classList.remove('completed');
    } else {
      step.classList.remove('active', 'completed');
    }
  });
}

function calculateBookingPricing(room, startDateStr, endDateStr) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  if (nights <= 0) return null;

  let totalDirect = 0;
  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    totalDirect += getSeasonPrice(room, d.getMonth());
  }

  let totalOTA = Math.round(totalDirect * PRICING.otaMarkup);
  let discountLabel = '';
  let discount = 0;

  if (nights >= 30) {
    discount = PRICING.monthlyDiscount;
    discountLabel = `-${Math.round(PRICING.monthlyDiscount * 100)}% soggiorno mensile`;
    totalDirect = Math.round(totalDirect * (1 - PRICING.monthlyDiscount));
  } else if (nights >= 7) {
    discount = PRICING.weeklyDiscount;
    discountLabel = `-${Math.round(PRICING.weeklyDiscount * 100)}% soggiorno settimanale`;
    totalDirect = Math.round(totalDirect * (1 - PRICING.weeklyDiscount));
  }

  const savings = totalOTA - totalDirect;

  return {
    nights,
    totalDirect,
    totalOTA,
    savings,
    discount,
    discountLabel
  };
}

function isRoomAvailable(room, startDateStr, endDateStr) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    if (bookedDates[room].has(dateStr)) {
      return false;
    }
  }
  return true;
}

function initBookingFlow() {
  const searchBtn = document.getElementById('book-search-btn');
  const checkinInput = document.getElementById('book-checkin');
  const checkoutInput = document.getElementById('book-checkout');

  if (!searchBtn || !checkinInput || !checkoutInput) return;

  searchBtn.addEventListener('click', () => {
    const checkin = checkinInput.value;
    const checkout = checkoutInput.value;

    if (!checkin || !checkout) {
      alert('Seleziona entrambe le date');
      return;
    }

    const startDate = new Date(checkin);
    const endDate = new Date(checkout);

    if (endDate <= startDate) {
      alert('La data di checkout deve essere dopo il check-in');
      return;
    }

    // Store in booking state
    bookingState.checkin = checkin;
    bookingState.checkout = checkout;

    // Render room results
    renderBookingRoomResults(checkin, checkout);

    // Show step 2
    showBookingStep(2);
  });

  // Step 2: Select room
  document.querySelectorAll('.book-select-room-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const room = btn.dataset.room;
      const pricing = calculateBookingPricing(room, bookingState.checkin, bookingState.checkout);

      if (pricing) {
        bookingState.room = room;
        bookingState.nights = pricing.nights;
        bookingState.totalDirect = pricing.totalDirect;
        bookingState.totalOTA = pricing.totalOTA;
        bookingState.discount = pricing.discount;
        bookingState.discountLabel = pricing.discountLabel;

        renderBookingSummary();
        showBookingStep(3);
      }
    });
  });

  // Step 3: Back to step 1
  const modifyLink = document.getElementById('booking-modify-link');
  if (modifyLink) {
    modifyLink.addEventListener('click', (e) => {
      e.preventDefault();
      showBookingStep(1);
    });
  }

  // Offline booking button
  const offlineBtn = document.getElementById('book-offline-btn');
  if (offlineBtn) {
    offlineBtn.addEventListener('click', () => {
      const roomName = bookingState.room === 'dimora' ? 'La Dimora' : 'La Bottega';
      const waMsg = encodeURIComponent(
        `Ciao! Vorrei prenotare:\n` +
        `Camera: ${roomName}\n` +
        `Check-in: ${bookingState.checkin}\n` +
        `Check-out: ${bookingState.checkout}\n` +
        `Notti: ${bookingState.nights}\n` +
        `Prezzo totale: €${bookingState.totalDirect}\n` +
        `${bookingState.discountLabel ? 'Sconto: ' + bookingState.discountLabel + '\n' : ''}`
      );
      window.open(`https://wa.me/393334705574?text=${waMsg}`, '_blank');
    });
  }
}

function renderBookingRoomResults(checkin, checkout) {
  const container = document.getElementById('rooms-results');
  if (!container) return;

  const rooms = [
    { id: 'dimora', name: 'La Dimora', tagline: 'Intima, silenziosa, ci si sente a casa' },
    { id: 'bottega', name: 'La Bottega', tagline: 'Curata nei dettagli, artigianale, ospitalità attesa' }
  ];

  let html = '';
  rooms.forEach(room => {
    const available = isRoomAvailable(room.id, checkin, checkout);
    const pricing = calculateBookingPricing(room.id, checkin, checkout);

    const avgPerNight = Math.round(pricing.totalDirect / pricing.nights);
    const roomClass = available ? '' : 'unavailable';

    html += `
      <div class="booking-room-card ${roomClass}">
        <h4>${room.name}</h4>
        <p class="room-tagline">${room.tagline}</p>
        <div class="room-pricing-detail">
          <div>Notti: ${pricing.nights}</div>
          <div>Media/notte: €${avgPerNight}</div>
          <div class="price-ota-strikethrough">Booking/Airbnb: €${pricing.totalOTA}</div>
          <div class="price-highlight">Prenotando qui: €${pricing.totalDirect}</div>
          ${pricing.discountLabel ? `<div class="discount-label">${pricing.discountLabel}</div>` : ''}
          <div class="savings">Risparmi: €${pricing.savings}</div>
        </div>
        ${available
          ? `<button class="book-select-room-btn btn btn-primary" data-room="${room.id}">Seleziona</button>`
          : `<div class="unavailable-message">Non disponibile nel periodo selezionato</div>`
        }
      </div>
    `;
  });

  container.innerHTML = html;

  // Re-attach event listeners
  document.querySelectorAll('.book-select-room-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const room = btn.dataset.room;
      const pricing = calculateBookingPricing(room, bookingState.checkin, bookingState.checkout);

      if (pricing) {
        bookingState.room = room;
        bookingState.nights = pricing.nights;
        bookingState.totalDirect = pricing.totalDirect;
        bookingState.totalOTA = pricing.totalOTA;
        bookingState.discount = pricing.discount;
        bookingState.discountLabel = pricing.discountLabel;

        renderBookingSummary();
        showBookingStep(3);
      }
    });
  });
}

function renderBookingSummary() {
  const summaryEl = document.getElementById('booking-summary');
  if (!summaryEl) return;

  const roomName = bookingState.room === 'dimora' ? 'La Dimora' : 'La Bottega';

  summaryEl.innerHTML = `
    <div class="summary-row">
      <span>Camera:</span>
      <strong>${roomName}</strong>
    </div>
    <div class="summary-row">
      <span>Check-in:</span>
      <strong>${bookingState.checkin}</strong>
    </div>
    <div class="summary-row">
      <span>Check-out:</span>
      <strong>${bookingState.checkout}</strong>
    </div>
    <div class="summary-row">
      <span>Notti:</span>
      <strong>${bookingState.nights}</strong>
    </div>
    <div class="summary-row summary-divider">
      <span>Prezzo Booking/Airbnb:</span>
      <strong class="price-ota-strike">€${bookingState.totalOTA}</strong>
    </div>
    <div class="summary-row summary-highlight">
      <span>Prezzo diretto:</span>
      <strong>€${bookingState.totalDirect}</strong>
    </div>
    ${bookingState.discountLabel ? `
      <div class="summary-row summary-discount">
        <span>${bookingState.discountLabel}</span>
      </div>
    ` : ''}
    <div class="summary-row summary-savings">
      <span>Risparmi:</span>
      <strong>€${bookingState.savings}</strong>
    </div>
  `;
}

/* ============================================
   MAIN APP
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {

  // --- Language System ---
  let currentLang = localStorage.getItem('ceb_lang') || 'it';

  function t(key) {
    const lang = translations[currentLang] || translations.it;
    return lang[key] || translations.it[key] || key;
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('ceb_lang', lang);
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else if (el.tagName === 'OPTION') {
        el.textContent = text;
      } else {
        el.textContent = text;
      }
    });

    document.querySelectorAll('.lang-switcher button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    if (typeof renderCalendar === 'function') renderCalendar();
    if (typeof updatePricingCards === 'function') updatePricingCards();
    if (typeof updateBookingEstimate === 'function') updateBookingEstimate();

    // Auto-populate tooltip text on amenity items from their translated strong label
    document.querySelectorAll('.amenity-detail-item:not(.amenity-detail-item--extra-bed)').forEach(item => {
      const strong = item.querySelector('strong[data-i18n]');
      if (strong) item.setAttribute('data-tooltip', strong.textContent.trim());
    });
  }

  document.querySelectorAll('.lang-switcher button').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  setLang(currentLang);

  // --- Header Scroll ---
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // --- Mobile Menu ---
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }

  // --- Fade-in on Scroll ---
  const fadeEls = document.querySelectorAll('.fade-in');
  if (fadeEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    fadeEls.forEach(el => observer.observe(el));
  }

  // --- Reviews Carousel ---
  const track = document.querySelector('.reviews-track');
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');

  if (track && prevBtn && nextBtn) {
    let carouselIndex = 0;
    const cards = track.querySelectorAll('.review-card');
    const getPerView = () => window.innerWidth >= 768 ? 2 : 1;

    function updateCarousel() {
      const perView = getPerView();
      const maxIndex = Math.max(0, cards.length - perView);
      carouselIndex = Math.min(carouselIndex, maxIndex);
      const pct = (100 / perView) * carouselIndex;
      track.style.transform = `translateX(-${pct}%)`;
    }

    prevBtn.addEventListener('click', () => {
      if (carouselIndex > 0) { carouselIndex--; updateCarousel(); }
    });

    nextBtn.addEventListener('click', () => {
      const perView = getPerView();
      const maxIndex = Math.max(0, cards.length - perView);
      if (carouselIndex < maxIndex) { carouselIndex++; updateCarousel(); }
    });

    window.addEventListener('resize', updateCarousel);

    setInterval(() => {
      const perView = getPerView();
      const maxIndex = Math.max(0, cards.length - perView);
      carouselIndex = carouselIndex >= maxIndex ? 0 : carouselIndex + 1;
      updateCarousel();
    }, 6000);
  }

  // --- Lightbox ---
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const lbImg = lightbox.querySelector('img');
    const lbClose = lightbox.querySelector('.lightbox-close');
    const lbPrev = lightbox.querySelector('.lightbox-prev');
    const lbNext = lightbox.querySelector('.lightbox-next');
    let lbImages = [];
    let lbIndex = 0;

    document.querySelectorAll('[data-lightbox]').forEach((img) => {
      img.style.cursor = 'pointer';
      img.addEventListener('click', () => {
        // Scope lightbox to parent .room-gallery if available, otherwise whole page
        const parentGallery = img.closest('.room-gallery');
        const scope = parentGallery || document;
        lbImages = Array.from(scope.querySelectorAll('[data-lightbox]')).map(i => i.src);
        lbIndex = lbImages.indexOf(img.src);
        if (lbIndex === -1) lbIndex = 0;
        lbImg.src = lbImages[lbIndex];
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    });

    function closeLb() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }

    if (lbClose) lbClose.addEventListener('click', closeLb);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLb(); });

    if (lbPrev) lbPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length;
      lbImg.src = lbImages[lbIndex];
    });

    if (lbNext) lbNext.addEventListener('click', (e) => {
      e.stopPropagation();
      lbIndex = (lbIndex + 1) % lbImages.length;
      lbImg.src = lbImages[lbIndex];
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft' && lbPrev) lbPrev.click();
      if (e.key === 'ArrowRight' && lbNext) lbNext.click();
    });
  }

  // --- Mobile Room Gallery Carousel ---
  document.querySelectorAll('.room-gallery').forEach(gallery => {
    const mainSlot = gallery.querySelector('.gallery-main');
    const allImgs = gallery.querySelectorAll('[data-lightbox]');
    const prevBtn = gallery.querySelector('.gallery-prev');
    const nextBtn = gallery.querySelector('.gallery-next');
    const dotsContainer = gallery.querySelector('.gallery-dots');

    if (!mainSlot || allImgs.length < 2 || !prevBtn || !nextBtn) return;

    // Collect all image sources
    const srcs = Array.from(allImgs).map(img => ({ src: img.src, alt: img.alt }));
    let idx = 0;

    // Build dots
    if (dotsContainer) {
      srcs.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Foto ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
      });
    }

    function goTo(i) {
      idx = i;
      const mainImg = mainSlot.querySelector('img');
      mainImg.src = srcs[idx].src;
      mainImg.alt = srcs[idx].alt;
      if (dotsContainer) {
        dotsContainer.querySelectorAll('.gallery-dot').forEach((d, di) => {
          d.classList.toggle('active', di === idx);
        });
      }
    }

    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goTo((idx - 1 + srcs.length) % srcs.length);
    });

    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goTo((idx + 1) % srcs.length);
    });

    // Swipe support for touch devices
    let touchStartX = 0;
    mainSlot.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    mainSlot.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) nextBtn.click(); // swipe left = next
        else prevBtn.click();           // swipe right = prev
      }
    }, { passive: true });
  });

  // --- Blog Category Filter ---
  document.querySelectorAll('.blog-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.blog-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      document.querySelectorAll('.blog-card').forEach(card => {
        card.style.display = (cat === 'all' || card.dataset.cat === cat) ? '' : 'none';
      });
    });
  });

  // --- Room Selection Cards (Prenota page) ---
  document.querySelectorAll('.room-select-card').forEach(card => {
    card.addEventListener('click', () => {
      const room = card.dataset.room;
      // Update card selection
      document.querySelectorAll('.room-select-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      // Sync with calendar tabs
      selectedRoom = room;
      document.querySelectorAll('.room-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.room === room);
      });
      // Sync with form select
      const sel = document.getElementById('booking-room-select');
      if (sel) sel.value = room === 'dimora' ? 'La Dimora' : 'La Bottega';
      renderCalendar();
      updateBookingEstimate();
    });
  });

  // --- Pricing Cards Population ---
  window.updatePricingCards = function() {
    ['dimora', 'bottega'].forEach(room => {
      const el = document.getElementById('pricing-' + room);
      if (!el) return;
      const highPrice = getSeasonPrice(room, 7); // August
      const lowPrice = getSeasonPrice(room, 0);  // January
      const highOTA = getOTAPrice(highPrice);
      const lowOTA = getOTAPrice(lowPrice);

      el.innerHTML = `
        <div class="price-line">
          <span class="price-season">Lug–Set</span>
          <span class="price-ota-inline">€${highOTA}</span>
          <span class="price-direct-inline">€${highPrice}/notte</span>
        </div>
        <div class="price-line">
          <span class="price-season">Ott–Giu</span>
          <span class="price-ota-inline">€${lowOTA}</span>
          <span class="price-direct-inline">€${lowPrice}/notte</span>
        </div>
      `;
    });
  };
  updatePricingCards();

  // --- Booking Estimate Calculator ---
  window.updateBookingEstimate = function() {
    const estimateEl = document.getElementById('booking-estimate');
    if (!estimateEl) return;

    const form = document.getElementById('booking-form');
    if (!form) return;

    const roomVal = form.querySelector('[name="room"]').value;
    const checkin = form.querySelector('[name="checkin"]').value;
    const checkout = form.querySelector('[name="checkout"]').value;

    if (!roomVal || !checkin || !checkout) {
      estimateEl.style.display = 'none';
      return;
    }

    const room = roomVal === 'La Dimora' ? 'dimora' : 'bottega';
    const pricing = calculateBookingPricing(room, checkin, checkout);

    if (!pricing) {
      estimateEl.style.display = 'none';
      return;
    }

    const savings = pricing.totalOTA - pricing.totalDirect;

    estimateEl.style.display = 'block';
    estimateEl.innerHTML = `
      <div class="estimate-detail">${pricing.nights} notti · ${roomVal}</div>
      <div class="estimate-ota">Booking/Airbnb: €${pricing.totalOTA}</div>
      <div class="estimate-direct">€${pricing.totalDirect}</div>
      ${pricing.discountLabel ? `<div class="estimate-savings">${pricing.discountLabel}</div>` : ''}
      <div class="estimate-savings">Risparmi €${savings} prenotando direttamente</div>
    `;
  };

  // (booking form submit handled by prenota.html inline script)

  // --- Contact Form Submission ---
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      btn.textContent = 'Invio in corso…';
      btn.disabled = true;

      const formData = new FormData(contactForm);
      const encoded = new URLSearchParams(formData).toString();

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encoded
      })
      .then(() => {
        // Mostra messaggio di successo
        contactForm.innerHTML = `
          <div style="text-align:center; padding:2rem 0;">
            <p style="font-size:2rem; margin-bottom:0.5rem;">✅</p>
            <p style="font-family:'Cormorant Garamond',serif; font-size:1.3rem; color:var(--blu); margin-bottom:0.5rem;">Messaggio ricevuto!</p>
            <p style="color:#555;">Ti risponderemo entro 24 ore a <strong>${formData.get('email')}</strong>.</p>
          </div>`;
      })
      .catch(() => {
        btn.textContent = 'Errore — riprova';
        btn.disabled = false;
        btn.style.background = '#c0392b';
        setTimeout(() => { btn.style.background = ''; }, 3000);
      });
    });
  }

  // --- Initialize Booking Flow if on prenota page ---
  if (document.getElementById('book-search-btn')) {
    initBookingFlow();
  }

});

/* ============================================
   iCal Calendar System
   ============================================ */

const icalFeeds = {
  dimora: [
    'https://www.airbnb.it/calendar/ical/1138415603108313561.ics?t=948d119c86634a1ca2246dc4705089ab',
    'https://ical.booking.com/v1/export?t=12e665bb-ba43-4b72-93d9-ea4c791e9824'
  ],
  bottega: [
    'https://www.airbnb.it/calendar/ical/1116637938226303262.ics?t=7bb16c4c0c7142b2bbf43ea12cafd400',
    'https://ical.booking.com/v1/export?t=b9b2884e-11f8-4164-984e-584c2e8e20b8'
  ]
};

let bookedDates = { dimora: new Set(), bottega: new Set() };
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();
let selectedRoom = 'dimora';

function parseICS(icsText) {
  const dates = [];
  const events = icsText.split('BEGIN:VEVENT');
  events.forEach(event => {
    const startMatch = event.match(/DTSTART;?[^:]*:(\d{8})/);
    const endMatch = event.match(/DTEND;?[^:]*:(\d{8})/);
    if (startMatch && endMatch) {
      const start = startMatch[1];
      const end = endMatch[1];
      const startDate = new Date(start.slice(0,4), parseInt(start.slice(4,6))-1, parseInt(start.slice(6,8)));
      const endDate = new Date(end.slice(0,4), parseInt(end.slice(4,6))-1, parseInt(end.slice(6,8)));
      for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().slice(0, 10));
      }
    }
  });
  return dates;
}

async function loadCalendarData() {
  // Primary: Netlify Function (server-side, no CORS issues)
  try {
    // Aggiunge un parametro che cambia ogni 5 minuti per evitare cache obsoleta del browser
    const cacheBust = Math.floor(Date.now() / 300000);
    const resp = await fetch(`/.netlify/functions/ical-proxy?v=${cacheBust}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.dimora) data.dimora.forEach(d => bookedDates.dimora.add(d));
      if (data.bottega) data.bottega.forEach(d => bookedDates.bottega.add(d));
    }
  } catch (e) {
    console.log('Netlify function unavailable, trying direct fetch...');
    // Fallback: direct fetch (for local development)
    const proxy = 'https://api.allorigins.win/raw?url=';
    for (const room of ['dimora', 'bottega']) {
      for (const url of icalFeeds[room]) {
        try {
          const resp = await fetch(proxy + encodeURIComponent(url));
          if (resp.ok) {
            const text = await resp.text();
            parseICS(text).forEach(d => bookedDates[room].add(d));
          }
        } catch (e2) {
          console.log('iCal fetch failed for', room, '- using demo data');
        }
      }
    }
  }

  // Applica sempre le date bloccate manualmente
  MANUAL_BLOCKED.dimora.forEach(d => bookedDates.dimora.add(d));
  MANUAL_BLOCKED.bottega.forEach(d => bookedDates.bottega.add(d));

  // Demo data fallback (solo se nessuna data reale né manuale disponibile)
  if (bookedDates.dimora.size === 0) {
    const now = new Date();
    [3,4,5,6,7,15,16,17,18,19].forEach(i => {
      const d = new Date(now.getFullYear(), now.getMonth(), i);
      bookedDates.dimora.add(d.toISOString().slice(0, 10));
    });
  }
  if (bookedDates.bottega.size === 0) {
    const now = new Date();
    [5,6,7,8,9,22,23,24,25,26].forEach(i => {
      const d = new Date(now.getFullYear(), now.getMonth(), i);
      bookedDates.bottega.add(d.toISOString().slice(0, 10));
    });
  }

  // Enable search button if on booking page
  const searchBtn = document.getElementById('book-search-btn');
  if (searchBtn) {
    searchBtn.disabled = false;
  }

  // Notifica a qualsiasi calendar sulla pagina che i dati sono pronti
  document.dispatchEvent(new CustomEvent('calendarDataReady'));
  if (typeof renderCalendar === 'function') renderCalendar();
}

function renderCalendar() {
  const container = document.getElementById('calendar-grid');
  if (!container) return;

  const lang = localStorage.getItem('ceb_lang') || 'it';
  const tr = translations[lang] || translations.it;

  const titleEl = document.getElementById('cal-month-title');
  if (titleEl) titleEl.textContent = `${tr.cal_months[calMonth]} ${calYear}`;

  let html = '';
  tr.cal_days.forEach(day => {
    html += `<div class="cal-day-name">${day}</div>`;
  });

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const startOffset = (firstDay + 6) % 7;
  for (let i = 0; i < startOffset; i++) {
    html += '<div class="cal-day empty"></div>';
  }

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isBooked = bookedDates[selectedRoom].has(dateStr);
    const isPast = dateStr < today;
    const isToday = dateStr === today;

    let cls = 'cal-day';
    if (isPast || isBooked) cls += ' booked';
    else cls += ' available';
    if (isToday) cls += ' today';

    html += `<div class="${cls}">${d}</div>`;
  }

  container.innerHTML = html;

  // Update price indicator
  const priceIndicator = document.getElementById('cal-price-indicator');
  if (priceIndicator) {
    const price = getSeasonPrice(selectedRoom, calMonth);
    const otaPrice = getOTAPrice(price);
    const seasonLabel = isHighSeason(calMonth) ? 'Lug–Set' : 'Ott–Giu';
    const roomName = selectedRoom === 'dimora' ? 'La Dimora' : 'La Bottega';

    priceIndicator.innerHTML = `
      ${roomName} · ${seasonLabel}:
      <span class="cal-price-ota">€${otaPrice}</span>
      <span class="cal-price-amount">€${price}/notte</span>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const prevMonth = document.getElementById('cal-prev');
  const nextMonth = document.getElementById('cal-next');

  if (prevMonth) prevMonth.addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });

  if (nextMonth) nextMonth.addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });

  document.querySelectorAll('.room-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.room-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedRoom = tab.dataset.room;
      // Sync room select cards
      document.querySelectorAll('.room-select-card').forEach(c => {
        c.classList.toggle('active', c.dataset.room === selectedRoom);
      });
      renderCalendar();
    });
  });

  if (document.getElementById('calendar-grid') || document.getElementById('mini-cal-grid')) {
    loadCalendarData();
  }

  /* ============================================
     HERO CAROUSEL
     ============================================ */
  const heroCarousel = document.getElementById('hero-carousel');
  const heroDots = document.getElementById('hero-dots');
  if (heroCarousel) {
    // Determine base path: ./foto-homepage/ for deploy, ../foto-homepage/ for sito/
    const basePath = document.querySelector('.hero-bg')
      ? document.querySelector('.hero-bg').style.backgroundImage.replace(/url\(['"]?/, '').replace(/[^/]*['"]?\)/, '')
      : '../foto-homepage/';

    // Fallback images if manifest is not available
    const fallbackImages = [
      '1.jpeg',
      '2.jpeg',
      '3.jpeg',
      '4.jpeg'
    ];

    function initCarousel(imageFiles) {
      // Build slides
      heroCarousel.innerHTML = '';
      imageFiles.forEach((file, i) => {
        const slide = document.createElement('div');
        slide.className = 'hero-bg' + (i === 0 ? ' active' : '');
        slide.style.backgroundImage = `url('${basePath}${file}')`;
        heroCarousel.appendChild(slide);
      });

      // Build dots
      if (heroDots) {
        heroDots.innerHTML = '';
        if (imageFiles.length > 1) {
          imageFiles.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', `Slide ${i + 1}`);
            dot.addEventListener('click', () => goToSlide(i));
            heroDots.appendChild(dot);
          });
        }
      }

      let currentSlide = 0;
      let heroInterval = null;

      function goToSlide(index) {
        const slides = heroCarousel.querySelectorAll('.hero-bg');
        const dots = heroDots ? heroDots.querySelectorAll('.hero-dot') : [];
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        currentSlide = index;
        if (slides[currentSlide]) slides[currentSlide].classList.add('active');
        if (dots[currentSlide]) dots[currentSlide].classList.add('active');
      }

      function nextSlide() {
        const slides = heroCarousel.querySelectorAll('.hero-bg');
        goToSlide((currentSlide + 1) % slides.length);
      }

      // Auto-play every 6 seconds (only if more than 1 image)
      if (imageFiles.length > 1) {
        heroInterval = setInterval(nextSlide, 6000);

        // Pause on hover
        heroCarousel.closest('.hero').addEventListener('mouseenter', () => clearInterval(heroInterval));
        heroCarousel.closest('.hero').addEventListener('mouseleave', () => {
          heroInterval = setInterval(nextSlide, 6000);
        });
      }
    }

    // Try to load manifest, fallback to hardcoded list
    fetch(basePath + 'images.json')
      .then(r => r.ok ? r.json() : fallbackImages)
      .then(files => initCarousel(files))
      .catch(() => initCarousel(fallbackImages));
  }
});
