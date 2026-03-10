document.addEventListener('DOMContentLoaded', function () {
  // Всегда начинать страницу сверху при загрузке/обновлении
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  const form = document.getElementById('telegramForm');
  const loading = document.getElementById('loading');
  const message = document.getElementById('message');

  const BOT_TOKEN = '8174989811:AAH1SWNZe99GWJ0emDapYKuVw_rhUHXardQ';
  const CHAT_ID = '705145803';

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    console.log('=== ПРОВЕРКА ФОРМЫ ===');

    // Проверка Chat ID
    if (CHAT_ID === 'ВАШ_РЕАЛЬНЫЙ_CHAT_ID' || !CHAT_ID) {
      showMessage('❌ Ошибка: Не настроен Chat ID.', 'error');
      return;
    }

    // Валидация формы
    const nameInput = document.getElementById('name');
    const attendanceRadio = document.querySelector('input[name="attendance"]:checked');

    if (!nameInput.value.trim()) {
      showMessage('❌ Пожалуйста, введите имя и фамилию', 'error');
      nameInput.focus();
      return;
    }

    if (!attendanceRadio) {
      showMessage('❌ Пожалуйста, выберите вариант присутствия', 'error');
      return;
    }

    // Показать загрузку
    loading.classList.remove('hidden');
    message.classList.add('hidden');

    // Сбор данных
    const name = nameInput.value.trim();
    const attendance = attendanceRadio.value;
    const allergy = document.getElementById('allergy').value.trim() || 'Нет ограничений';

    const drinkCheckboxes = document.querySelectorAll('input[name="drinks"]:checked');
    const drinks = Array.from(drinkCheckboxes).map(cb => cb.value);
    const drinksCustom = document.getElementById('drinks_custom')?.value.trim();

    if (drinksCustom) {
      drinks.push(drinksCustom);
    }

    const drinksText = drinks.length > 0 ? drinks.join(', ') : 'Не указано';

    // Формирование сообщения
    const telegramMessage = `
🎉 НОВЫЙ ОТВЕТ НА ПРИГЛАШЕНИЕ

👤 Имя: ${name}
✅ Присутствие: ${attendance}
⚠️ Ограничения: ${allergy}
🥂 Напитки: ${drinksText}

📅 Дата: ${new Date().toLocaleString('ru-RU')}
        `;

    console.log('Отправляемые данные:', { name, attendance, allergy, drinksText });

    try {
      // Отправка в Telegram
      const response = await sendToTelegram(telegramMessage);
      console.log('Ответ Telegram:', response);

      if (response.ok) {
        showMessage('✅ Ваш ответ успешно отправлен! Организатор получил уведомление.', 'success');
        form.reset();
      } else {
        // Обработка ошибок Telegram
        let errorMsg = '❌ Ошибка отправки: ';

        if (response.error_code === 400) {
          errorMsg += 'Неверный Chat ID. ';
          errorMsg += 'Получите актуальный Chat ID по ссылке выше.';
        } else if (response.error_code === 403) {
          errorMsg += 'Бот не добавлен в чат. ';
          errorMsg += 'Добавьте бота в чат или отправьте ему /start';
        } else {
          errorMsg += response.description || 'Неизвестная ошибка';
        }

        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showMessage(error.message, 'error');
    } finally {
      loading.classList.add('hidden');
    }
  });

  async function sendToTelegram(message) {
    // Кодируем сообщение
    const encodedMessage = encodeURIComponent(message);

    // Формируем URL (без parse_mode для простоты)
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodedMessage}`;

    console.log('URL запроса (без токена):',
      `https://api.telegram.org/bot[TOKEN]/sendMessage?chat_id=${CHAT_ID}&text=...`);

    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      throw new Error('Проблема с интернет-соединением');
    }
  }

  function showMessage(text, type) {
    message.textContent = text;
    message.className = `message ${type}`;
    message.classList.remove('hidden');

    // Для ошибок с Chat ID не скрываем автоматически
    if (!text.includes('Chat ID')) {
      setTimeout(() => {
        message.classList.add('hidden');
      }, 8000);
    }
  }

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
});