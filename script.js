// Ждем, пока весь HTML и CSS загрузятся
document.addEventListener('DOMContentLoaded', () => {
    // Получаем объект API Telegram
    const tg = window.Telegram.WebApp;
    tg.expand(); // Раскрываем приложение на весь экран

    // --- ДАННЫЕ ПРИЛОЖЕНИЯ (ВРЕМЕННОЕ ХРАНИЛИЩЕ) ---
    // В реальном приложении это будет приходить с сервера
    let appData = {
        plan: [
            { day: "Понедельник", exercises: [], isRestDay: false },
            { day: "Вторник", exercises: [], isRestDay: false },
            { day: "Среда", exercises: [], isRestDay: false },
            { day: "Четверг", exercises: [], isRestDay: false },
            { day: "Пятница", exercises: [], isRestDay: false },
            { day: "Суббота", exercises: [], isRestDay: true },
            { day: "Воскресенье", exercises: [], isRestDay: true },
        ],
        profile: {
            completedDays: 0,
            completedWeeks: 0,
            progress: "0/5"
        }
    };
    let currentEditingDayIndex = null;

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
                <span class="day-name">${dayData.day}</span>
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
        document.getElementById('stat-days').textContent = appData.profile.completedDays;
        document.getElementById('stat-weeks').textContent = appData.profile.completedWeeks;
        document.getElementById('stat-progress').textContent = appData.profile.progress;
    }

    // --- ЛОГИКА МОДАЛЬНОГО ОКНА ---

    function openDayModal(dayIndex) {
        currentEditingDayIndex = dayIndex;
        const dayData = appData.plan[dayIndex];

        document.getElementById('modal-day-title').textContent = `Упражнения на ${dayData.day}`;
        
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
                tg.HapticFeedback.notificationOccurred('warning'); // Вибрация-предупреждение
            }
        }
    });

    // --- НАЧАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ---
    
    // Устанавливаем имя пользователя
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        document.getElementById('user-name').textContent = tg.initDataUnsafe.user.first_name;
    }

    // Показываем главный экран при запуске
    showScreen('home-screen');
});