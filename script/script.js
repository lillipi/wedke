document.addEventListener('DOMContentLoaded', function () {
  // Всегда начинать страницу сверху при загрузке/обновлении
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  // Анимация появления блоков при скролле
  const scrollElements = document.querySelectorAll('.scroll-animate');

  if ('IntersectionObserver' in window) {
    const observerOptions = {
      threshold: 0.2
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    scrollElements.forEach(el => observer.observe(el));
  } else {
    // Фолбек: если IntersectionObserver не поддерживается,
    // просто сразу показываем элементы
    scrollElements.forEach(el => el.classList.add('in-view'));
  }

  // Интро-конверт и музыка
  const intro = document.getElementById('intro');
  const introButton = document.getElementById('introButton');
  const siteContent = document.getElementById('site-content');
  const bgMusic = document.getElementById('bg-music');

  if (intro && introButton && siteContent) {
    introButton.addEventListener('click', () => {
      // все части конверта открываются одновременно
      intro.classList.add('intro-open');

      // после всего убираем интро и показываем сайт
      setTimeout(() => {
        intro.classList.add('intro-hidden');
        siteContent.classList.remove('hidden');
      }, 1100);

      if (bgMusic) {
        bgMusic.loop = true;
        bgMusic.play().catch(() => {
          // если браузер заблокировал автоплей — ничего страшного
        });
      }
    });
  }

  const EMAIL_TO = 'neuztroeva.liza@gmail.com';
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxd2ntcq4ZPwAQXmHCztgt9Vp7pW2REh-YtWqhS-nDvLBCBUR3oVrYdbDK1bT0oaXuI/exec'; // 👈 URL для Google Sheets (опционально)

  const form = document.getElementById('telegramForm');
  const loading = document.getElementById('loading');
  const message = document.getElementById('message');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('name');
      const attendanceRadio = document.querySelector('input[name="attendance"]:checked');

      if (!nameInput?.value.trim()) {
        showMessage('❌ Пожалуйста, введите имя и фамилию', 'error');
        nameInput?.focus();
        return;
      }

      if (!attendanceRadio) {
        showMessage('❌ Пожалуйста, выберите вариант присутствия', 'error');
        return;
      }

      loading?.classList.remove('hidden');
      message?.classList.add('hidden');

      const formData = collectFormData();

      try {
        const emailResult = await sendToEmail(formData);
        if (!emailResult.success) throw new Error(emailResult.error || 'Ошибка отправки email');

        const sheetsResult = await sendToGoogleSheets(formData);
        if (sheetsResult.success) {
          showMessage('✅ Ваш ответ успешно отправлен!', 'success');
        } else {
          console.error('Google Sheets error:', sheetsResult.error);
          showMessage('✅ Ответ отправлен, но не удалось сохранить в Google Таблицы.', 'error');
        }

        form.reset();
        document.querySelectorAll('input[type="checkbox"], input[type="radio"]')
          .forEach(el => el.checked = false);
      } catch (error) {
        console.error('Ошибка:', error);
        showMessage(error.message || '❌ Произошла ошибка при отправке. Пожалуйста, попробуйте позже.', 'error');
      } finally {
        loading?.classList.add('hidden');
      }
    });

    function collectFormData() {
      const name = document.getElementById('name')?.value.trim() || '';
      const attendance = document.querySelector('input[name="attendance"]:checked')?.value;
      const allergy = document.getElementById('allergy')?.value.trim() || 'Нет ограничений';

      const checked = document.querySelectorAll('input[name="drinks"]:checked');
      const drinks = Array.from(checked).map(cb => cb.value);
      const drinksCustom = document.getElementById('drinks_custom')?.value.trim();
      if (drinksCustom) drinks.push(drinksCustom);

      return {
        name,
        attendance,
        allergy,
        drinks: drinks.length ? drinks.join(', ') : 'Не указано',
        date: new Date().toLocaleString('ru-RU')
      };
    }

    async function sendToEmail(formData) {
      const formSubmitUrl = 'https://formsubmit.co/ajax/' + EMAIL_TO;
      try {
        const response = await fetch(formSubmitUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            message: `Имя: ${formData.name}
Присутствие: ${formData.attendance}
Ограничения: ${formData.allergy}
Напитки: ${formData.drinks}
Дата: ${formData.date}`,
            _subject: `🎉 Новая анкета гостя - ${formData.name}`,
            _template: 'table',
            _captcha: 'false'
          })
        });

        const result = await response.json();
        const successRaw = result?.success;
        const isFailure = successRaw === false || successRaw === 'false' || successRaw === 0 || successRaw === '0';

        if (response.ok && !isFailure) return { success: true };
        return { success: false, error: result?.message || result?.error || 'Ошибка отправки email' };
      } catch (error) {
        console.error('Email error:', error);
        return { success: false, error: 'Не удалось отправить email. Проверьте интернет-соединение.' };
      }
    }

    async function sendToGoogleSheets(formData) {
      const isGoogleConfigured =
        GOOGLE_SCRIPT_URL &&
        !GOOGLE_SCRIPT_URL.includes('ВАШ_GOOGLE_SCRIPT_ID') &&
        !GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_SCRIPT_ID');

      if (!isGoogleConfigured) return { success: true };

      try {
        const payload = new URLSearchParams({
          date: formData.date || '',
          name: formData.name || '',
          attendance: formData.attendance || '',
          allergy: formData.allergy || '',
          drinks: formData.drinks || ''
        });

        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'Accept': 'application/json'
          },
          body: payload.toString()
        });

        const data = await response.json().catch(() => null);
        const ok = response.ok && data && (data.success === true || data.success === 'true');
        if (ok) return { success: true };
        return { success: false, error: data?.error || 'Ошибка сохранения в Google Sheets' };
      } catch (error) {
        return { success: false, error: error.message || 'Ошибка сети при сохранении в Google Sheets' };
      }
    }

    function showMessage(text, type) {
      if (!message) return;
      message.textContent = text;
      message.className = `message ${type}`;
      message.classList.remove('hidden');
      setTimeout(() => message?.classList.add('hidden'), 5000);
    }
  } else {
    console.error('Форма с id="telegramForm" не найдена');
  }
});