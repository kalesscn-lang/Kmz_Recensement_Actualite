(() => {
  const form = document.querySelector('#contactForm');
  const hint = document.querySelector('#contactHint');
  const btnWhatsApp = document.querySelector('#btnWhatsApp');

  const emailTo = "kaless.cn@gmail.com";
  const waNumber = "261341949158"; // 034 19 491 58 -> format international

  const nameEl = document.querySelector('#cName');
  const phoneEl = document.querySelector('#cPhone');
  const subjectEl = document.querySelector('#cSubject');
  const messageEl = document.querySelector('#cMessage');

  function setHint(msg, ok=true) {
    if (!hint) return;
    hint.textContent = msg || "";
    hint.classList.toggle('text-danger', !ok);
    hint.classList.toggle('text-secondary', ok);
  }

  function buildMailto(name, phone, subject, message) {
    const body =
`Anarana: ${name}
Finday: ${phone || "—"}

Hafatra:
${message}

--- 
Nalefa avy amin'ny pejy Contact (KMZ).`;

    const url = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return url;
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = (nameEl?.value || "").trim();
    const phone = (phoneEl?.value || "").trim();
    const subject = (subjectEl?.value || "").trim();
    const message = (messageEl?.value || "").trim();

    if (!name || !subject || !message) {
      setHint("Fenoy azafady: Anaranao, Lohahevitra, Hafatra.", false);
      return;
    }

    setHint("Misokatra ny mailaka… raha tsy misokatra dia jereo ny navigateur-nao / app mailaka.", true);
    window.location.href = buildMailto(name, phone, subject, message);
  });

  btnWhatsApp?.addEventListener('click', () => {
    const name = (nameEl?.value || "").trim();
    const subject = (subjectEl?.value || "").trim();
    const message = (messageEl?.value || "").trim();

    const text =
`Salama tompoko,
Izaho dia: ${name || "—"}
Lohahevitra: ${subject || "—"}

${message || ""}

Misaotra.`;

    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener");
  });
})();
