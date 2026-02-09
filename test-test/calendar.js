// Calendar View Manager - מנהל תצוגת לוח שנה
class CalendarManager {
  constructor() {
    this.currentDate = new Date();
    this.selectedDate = null;
    this.showArchive = false; // תיקון: הוספת מצב ארכיון
    console.log('📅 CalendarManager: Initialized');
  }

  // יצירת תצוגת לוח השנה
  renderCalendar() {
    console.log('📅 renderCalendar: Rendering calendar for', this.currentDate);
    
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // חישוב ימים בחודש
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    console.log('📅 renderCalendar: Month info:', { year, month, daysInMonth, startingDayOfWeek });
    
    // קבלת משימות לחודש הנוכחי
    const monthHomework = this.getHomeworkForMonth(year, month);
    console.log('📅 renderCalendar: Homework for month:', monthHomework.length);
    
    // תיקון: סינון לפי מצב ארכיון
    let displayHomework = monthHomework;
    if (!this.showArchive) {
      // הצג רק משימות פעילות (לא הושלמו או שעדיין בתוך המועד)
      displayHomework = monthHomework.filter(hw => {
        if (!hw.completed) return true;
        const daysLeft = this.getDaysUntilDue(hw.dueDate);
        return daysLeft >= 0;
      });
    }
    
    console.log('📅 renderCalendar: Display homework count:', displayHomework.length);
    
    // יצירת HTML של לוח השנה
    let html = `
      <div class="calendar-view">
        <div class="calendar-header">
          <button class="calendar-nav-btn" onclick="calendar.previousMonth()">
            <svg width="20" height="20"><use href="#chevron-right"></use></svg>
          </button>
          <h2 class="calendar-month-title">${this.getHebrewMonthName(month)} ${year}</h2>
          <button class="calendar-nav-btn" onclick="calendar.nextMonth()">
            <svg width="20" height="20"><use href="#chevron-left"></use></svg>
          </button>
          <button class="btn btn-secondary calendar-today-btn" onclick="calendar.goToToday()">
            היום
          </button>
        </div>
        
        <div class="calendar-weekdays">
          <div class="calendar-weekday">ראשון</div>
          <div class="calendar-weekday">שני</div>
          <div class="calendar-weekday">שלישי</div>
          <div class="calendar-weekday">רביעי</div>
          <div class="calendar-weekday">חמישי</div>
          <div class="calendar-weekday">שישי</div>
          <div class="calendar-weekday">שבת</div>
        </div>
        
        <div class="calendar-grid">
    `;
    
    // ימים ריקים לפני תחילת החודש
    for (let i = 0; i < startingDayOfWeek; i++) {
      html += '<div class="calendar-day empty"></div>';
    }
    
    // ימי החודש
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      currentDate.setHours(0, 0, 0, 0);
      
      const isToday = currentDate.getTime() === today.getTime();
      const isPast = currentDate < today;
      const homeworkForDay = this.getHomeworkForDate(displayHomework, currentDate);
      
      let dayClasses = 'calendar-day';
      if (isToday) dayClasses += ' today';
      if (isPast) dayClasses += ' past';
      if (homeworkForDay.length > 0) dayClasses += ' has-homework';
      
      html += `
        <div class="${dayClasses}" onclick="calendar.selectDate('${currentDate.toISOString()}')">
          <div class="calendar-day-number">${day}</div>
          ${homeworkForDay.length > 0 ? `
            <div class="calendar-day-indicators">
              ${homeworkForDay.slice(0, 3).map(hw => {
                const subject = subjects.find(s => s.id == hw.subject);
                const color = subject ? subject.color : '#6b7280';
                return `<div class="calendar-indicator" style="background-color: ${color};" title="${hw.title}"></div>`;
              }).join('')}
              ${homeworkForDay.length > 3 ? `<div class="calendar-more">+${homeworkForDay.length - 3}</div>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }
    
    html += `
        </div>
      </div>
    `;
    
    // עדכון התצוגה
    const homeworkList = document.getElementById('homework-list');
    if (homeworkList) {
      homeworkList.innerHTML = html;
    }
    
    // תיקון: עדכון כפתור הארכיון
    this.updateArchiveButton();
    
    console.log('✅ renderCalendar: Calendar rendered');
  }

  // תיקון: פונקציה לעדכון כפתור הארכיון
  updateArchiveButton() {
    const archiveBtn = document.getElementById('archive-toggle');
    if (!archiveBtn) return;
    
    // חישוב כמה משימות בארכיון
    const archivedHomework = homework.filter(h => {
      if (!h.completed) return false;
      return this.getDaysUntilDue(h.dueDate) < 0;
    });
    
    if (archivedHomework.length > 0) {
      archiveBtn.classList.remove('hidden');
      archiveBtn.textContent = this.showArchive ? 'הסתר ארכיון' : `ארכיון (${archivedHomework.length})`;
      archiveBtn.onclick = () => this.toggleArchive();
    } else {
      archiveBtn.classList.add('hidden');
    }
  }

  // תיקון: פונקציה להחלפת מצב ארכיון
  toggleArchive() {
    console.log('📅 toggleArchive: Toggling archive mode');
    this.showArchive = !this.showArchive;
    this.renderCalendar();
  }

  // קבלת משימות לחודש מסוים
  getHomeworkForMonth(year, month) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    
    return homework.filter(hw => {
      const dueDate = new Date(hw.dueDate + 'T00:00:00');
      return dueDate >= monthStart && dueDate <= monthEnd;
    });
  }

  // קבלת משימות לתאריך מסוים
  getHomeworkForDate(monthHomework, date) {
    const dateStr = date.toISOString().split('T')[0];
    return monthHomework.filter(hw => hw.dueDate === dateStr);
  }

  // שם חודש בעברית
  getHebrewMonthName(month) {
    const months = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    return months[month];
  }

  // מעבר לחודש הבא
  nextMonth() {
    console.log('📅 nextMonth: Moving to next month');
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.renderCalendar();
  }

  // מעבר לחודש הקודם
  previousMonth() {
    console.log('📅 previousMonth: Moving to previous month');
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.renderCalendar();
  }

  // חזרה להיום
  goToToday() {
    console.log('📅 goToToday: Going back to today');
    this.currentDate = new Date();
    this.renderCalendar();
  }

  // בחירת תאריך
  selectDate(dateStr) {
    console.log('📅 selectDate: Date selected:', dateStr);
    const date = new Date(dateStr);
    this.selectedDate = date;
    
    // הצגת משימות ליום זה
    this.showDayHomework(date);
  }

  // הצגת משימות ליום מסוים
  showDayHomework(date) {
    const dateStr = date.toISOString().split('T')[0];
    const dayHomework = homework.filter(hw => hw.dueDate === dateStr);
    
    console.log('📅 showDayHomework: Homework for', dateStr, ':', dayHomework.length);
    
    if (dayHomework.length === 0) {
      notifications.showInAppNotification(
        `אין משימות ליום ${date.toLocaleDateString('he-IL')}`,
        'info'
      );
      return;
    }

    // יצירת מודאל עם משימות היום
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h2>משימות ל-${date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
          <button class="close-modal-btn" onclick="this.closest('.modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="day-homework-list">
            ${dayHomework.map(hw => {
              const subject = subjects.find(s => s.id == hw.subject);
              const isCompleted = hw.completed;
              
              return `
                <div class="day-homework-item ${isCompleted ? 'completed' : ''}">
                  <input type="checkbox" class="checkbox" ${isCompleted ? 'checked' : ''} 
                         onchange="toggleComplete(${hw.id}); this.closest('.modal').remove(); render();">
                  <div class="day-homework-content">
                    ${subject ? `<span class="badge" style="background-color: ${subject.color};">${subject.name}</span>` : ''}
                    <h4 class="${isCompleted ? 'completed' : ''}">${hw.title}</h4>
                    ${hw.description ? `<p>${hw.description}</p>` : ''}
                    ${hw.tags && hw.tags.length > 0 ? `
                      <div class="homework-badges">
                        ${hw.tags.map(tag => `<span class="badge tag-badge">${tag}</span>`).join('')}
                      </div>
                    ` : ''}
                  </div>
                  <button class="icon-btn" onclick="deleteHomework(${hw.id}); this.closest('.modal').remove(); render();">
                    <svg width="20" height="20"><use href="#trash"></use></svg>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // סגירה בלחיצה על הרקע
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // פונקציה עזר לחישוב ימים עד תאריך
  getDaysUntilDue(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + 'T00:00:00');
    const days = Math.round((due - today) / (1000 * 60 * 60 * 24));
    return days;
  }
}

// יצירת אובייקט גלובלי
console.log('📅 Creating global calendar manager...');
const calendar = new CalendarManager();
console.log('✅ Global calendar manager created');
