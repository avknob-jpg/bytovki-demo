(function () {
  document.documentElement.classList.add('js');

  // Меню
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    var setOpen = function (open) {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  // Закрываем меню после перехода по якорю
  document.querySelectorAll('.site-nav a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (nav) { nav.classList.remove('open'); }
      if (toggle) { toggle.setAttribute('aria-expanded', 'false'); }
    });
  });

  // Текущая страница
  var file = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a').forEach(function (a) {
    if (a.getAttribute('href') === file) {
      a.setAttribute('aria-current', 'page');
    }
  });

  // Форма запроса КП (демо: данные никуда не отправляются)
  var form = document.querySelector('form[data-quote-form]');
  if (!form) return;
  form.setAttribute('novalidate', '');

  var rules = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Укажите имя (не короче 2 символов).'; },
    company: function (v) { return v.trim().length >= 2 ? '' : 'Укажите город или посёлок.'; },
    phone: function (v) {
      var digits = v.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 12 ? '' : 'Введите телефон, например +7 900 123-45-67.';
    },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Введите корректный e-mail.'; },
    order: function (v) { return v.trim().length >= 10 ? '' : 'Опишите состав заказа (не короче 10 символов).'; },
    consent: function (_v, el) { return el.checked ? '' : 'Нужно согласие на обработку данных.'; }
  };

  function check(el) {
    var rule = rules[el.name];
    if (!rule) return true;
    var msg = rule(el.value, el);
    var box = el.closest('.field');
    var out = box.querySelector('.field-error');
    box.classList.toggle('invalid', !!msg);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    out.textContent = msg;
    return !msg;
  }

  form.querySelectorAll('input,textarea').forEach(function (el) {
    el.addEventListener('blur', function () { check(el); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var firstBad = null;
    form.querySelectorAll('input,textarea').forEach(function (el) {
      if (!check(el) && !firstBad) firstBad = el;
    });
    if (firstBad) { firstBad.focus(); return; }
    form.hidden = true;
    var ok = document.getElementById('quote-success');
    ok.hidden = false;
    ok.focus();
  });
})();
