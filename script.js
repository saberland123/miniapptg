// Ждем, пока весь HTML и CSS загрузятся
document.addEventListener('DOMContentLoaded', () => {
    // Получаем объект API Telegram
    const tg = window.Telegram.WebApp;
    tg.expand(); // Раскрываем приложение на весь экран

    // ❗️❗️❗️ ВАЖНО: Заменили на ваш туннель serveo.net
    const BACKEND_URL = 'https://a06ad93ccdde5fcddf7a424f8637a937.serveo.net';

    // Данные теперь будут приходить с бэкенда, а не храниться здесь
    let appData = {
        plan: [],
        profile: {} // Профиль пока оставим пустым
    };
    let currentEditingDayIndex = null;
    const dayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

    // --- ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ СТРАНИЦЫ ---
    const screens = document.querySelectorAll('.screen');
    const modal = document.getElementById('day-modal');
    
    // --- ЛОГИКА НАВИГАЦИИ (ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ) ---
    function showScreen(screenId) {
        screens.forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    // Навешиваем события на кнопки меню
    document.getElementById('menu-plan-btn').addEventListener('click', () => {
        renderWeekPlan();
        showScreen('plan-screen');
    });
    document.getElementById('menu-profile-btn').addEventListener('click', () => {
        renderProfile();
        showScreen('profile-screen');
    });
    document.querySelectorAll('.back-button').forEach(button => {
        button.addEventListener('click', () => showScreen('home-screen'));
    });

    // --- ЛОГИКА РЕНДЕРИНГА (ОТОБРАЖЕНИЕ ДАННЫХ) ---
    
    // Функция для отрисовки плана на неделю
    function renderWeekPlan() {
        const container = document.getElementById('week-plan-container');
        container.innerHTML = ''; // Очищаем старый список
        appData.plan.forEach((dayData, index) => {
            const dayCard = document.createElement('div');
            dayCard.className = 'day-card';
            if (dayData.isRestDay) {
                dayCard.classList.add('rest-day');
            }
            
            const exerciseCountText = dayData.isRestDay 
                ? '🏖️ Выходной' 
                : `${dayData.exercises.length} упр.`;

            dayCard.innerHTML = `
                <span class="day-name">${dayNames[index]}</span>
                <span class="exercise-count">${exerciseCountText}</span>
            `;
            
            // При клике на день открываем модальное окно
            dayCard.addEventListener('click', () => {
                openDayModal(index);
            });
            
            container.appendChild(dayCard);
        });
    }

    // Функция для отрисовки профиля
    function renderProfile() {
        if (appData.profile) {
            document.getElementById('stat-days').textContent = appData.profile.completedDays || 0;
            document.getElementById('stat-weeks').textContent = appData.profile.completedWeeks || 0;
            document.getElementById('stat-progress').textContent = appData.profile.progress || "0/0";
        }
    }

    // --- ЛОГИКА МОДАЛЬНОГО ОКНА ---

    function openDayModal(dayIndex) {
        currentEditingDayIndex = dayIndex;
        const dayData = appData.plan[dayIndex];

        document.getElementById('modal-day-title').textContent = `Упражнения на ${dayNames[dayIndex]}`;
        
        // Отрисовываем список упражнений
        renderExercisesList(dayData.exercises);
        
        // Показываем или скрываем форму в зависимости от того, выходной ли день
        const form = document.getElementById('add-exercise-form');
        form.style.display = dayData.isRestDay ? 'none' : 'flex';

        modal.style.display = 'flex';
    }

    function closeDayModal() {
        modal.style.display = 'none';
        currentEditingDayIndex = null;
    }

    function renderExercisesList(exercises) {
        const listContainer = document.getElementById('exercises-list');
        listContainer.innerHTML = '';
        if (exercises.length === 0) {
            listContainer.innerHTML = '<p style="color: var(--secondary-text-color);">Упражнений пока нет.</p>';
            return;
        }

        exercises.forEach((ex, index) => {
            const item = document.createElement('div');
            item.className = 'exercise-item';
            item.innerHTML = `
                <span>${ex.name} (${ex.sets}x${ex.reps})</span>
                <button class="delete-btn" data-index="${index}">❌</button>
            `;
            listContainer.appendChild(item);
        });
    }

    // --- НОВЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С API ---

    async function loadPlan() {
        try {
            tg.MainButton.showProgress(); // Показываем крутилку загрузки
            const response = await fetch(`${BACKEND_URL}/api/plan`, {
                method: 'GET',
                headers: {
                    // Отправляем данные для аутентификации
                    'Authorization': `tma ${tg.initData}`
                }
            });
            if (!response.ok) {
                throw new Error('Ошибка при загрузке плана: ' + await response.text());
            }
            const planFromServer = await response.json();
            appData.plan = planFromServer;
            renderWeekPlan();
        } catch (error) {
            console.error(error);
            tg.showAlert('Не удалось загрузить ваш план. Попробуйте позже.');
            // Если сервер недоступен, используем временные данные
            appData.plan = dayNames.map(day => ({ 
                day, 
                exercises: [], 
                isRestDay: false 
            }));
            renderWeekPlan();
        } finally {
            tg.MainButton.hideProgress();
        }
    }

    async function savePlan() {
        try {
            tg.MainButton.showProgress();
            const response = await fetch(`${BACKEND_URL}/api/plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `tma ${tg.initData}`
                },
                body: JSON.stringify({ plan: appData.plan })
            });
            if (!response.ok) {
                throw new Error('Ошибка при сохранении плана: ' + await response.text());
            }
            tg.HapticFeedback.notificationOccurred('success');
            console.log('План успешно сохранен на сервере');
        } catch (error) {
            console.error(error);
            tg.showAlert('Не удалось сохранить план. Проверьте интернет-соединение.');
        } finally {
            tg.MainButton.hideProgress();
        }
    }

    // --- ОБРАБОТКА СОБЫТИЙ ФОРМ И КНОПОК ---

    // Закрытие модального окна
    document.getElementById('modal-close-btn').addEventListener('click', closeDayModal);

    // Добавление нового упражнения
    document.getElementById('add-exercise-form').addEventListener('submit', (e) => {
        e.preventDefault(); // Предотвращаем перезагрузку страницы
        
        const name = document.getElementById('ex-name').value;
        const sets = document.getElementById('ex-sets').value;
        const reps = document.getElementById('ex-reps').value;

        if (name && sets && reps && currentEditingDayIndex !== null) {
            appData.plan[currentEditingDayIndex].exercises.push({ name, sets, reps });
            
            // Перерисовываем список упражнений в модалке и обновляем счетчик на главном экране
            renderExercisesList(appData.plan[currentEditingDayIndex].exercises);
            renderWeekPlan();

            // Сохраняем на сервер
            savePlan();

            // Очищаем форму
            e.target.reset();
            tg.HapticFeedback.impactOccurred('light'); // Легкая вибрация
        }
    });

    // Удаление упражнения (делегирование событий)
    document.getElementById('exercises-list').addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('delete-btn')) {
            const exerciseIndex = parseInt(e.target.getAttribute('data-index'));
            if (currentEditingDayIndex !== null && !isNaN(exerciseIndex)) {
                appData.plan[currentEditingDayIndex].exercises.splice(exerciseIndex, 1);
                
                renderExercisesList(appData.plan[currentEditingDayIndex].exercises);
                renderWeekPlan();
                
                // Сохраняем на сервер
                savePlan();
                
                tg.HapticFeedback.notificationOccurred('warning'); // Вибрация-предупреждение
            }
        }
    });

    // --- НАЧАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ---
    
    // Настраиваем главную кнопку Telegram
    tg.MainButton.setText('Сохранить и закрыть');
    tg.onEvent('mainButtonClicked', () => {
        savePlan().then(() => {
            tg.close();
        });
    });

    // Устанавливаем имя пользователя
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        document.getElementById('user-name').textContent = tg.initDataUnsafe.user.first_name;
    }

    // Загружаем план с сервера при старте
    loadPlan().then(() => {
        showScreen('home-screen');
        tg.MainButton.show(); // Показываем кнопку после загрузки
    });

    // Показываем главный экран при запуске
    showScreen('home-screen');
});