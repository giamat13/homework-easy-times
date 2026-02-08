// Notifications Manager - מנהל התראות
class NotificationsManager {
  constructor() {
    this.permission = 'default';
    this.checkInterval = null;
  }

  // בקשת הרשאות להתראות
  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('הדפדפן לא תומך בהתראות');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  // שליחת התראה
  async sendNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '📚',
        badge: '📚',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return true;
    } catch (error) {
      console.error('שגיאה בשליחת התראה:', error);
      return false;
    }
  }

  // בדיקת משימות שצריכות התראה
  async checkHomeworkNotifications(homework, settings) {
    if (!settings.enableNotifications) return;

    const notificationDays = settings.notificationDays || 1;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const hw of homework) {
      if (hw.completed) continue;

      const dueDate = new Date(hw.dueDate + 'T00:00:00');
      const daysUntil = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));

      // התראה עבור משימות שמתקרבות
      if (daysUntil === notificationDays && !hw.notified) {
        const subject = await this.getSubjectName(hw.subject);
        await this.sendNotification(`תזכורת: ${hw.title}`, {
          body: `עוד ${daysUntil} ימים להגשה${subject ? ` ב${subject}` : ''}`,
          tag: `homework-${hw.id}`
        });
        hw.notified = true;
      }

      // התראה עבור משימות שעוברות את המועד היום
      if (daysUntil === 0 && !hw.todayNotified) {
        const subject = await this.getSubjectName(hw.subject);
        await this.sendNotification(`⚠️ דחוף: ${hw.title}`, {
          body: `ההגשה היא היום!${subject ? ` (${subject})` : ''}`,
          tag: `homework-urgent-${hw.id}`,
          requireInteraction: true
        });
        hw.todayNotified = true;
      }
    }
  }

  // קבלת שם מקצוע
  async getSubjectName(subjectId) {
    try {
      const subjects = await storage.get('homework-subjects') || [];
      const subject = subjects.find(s => s.id == subjectId);
      return subject ? subject.name : null;
    } catch (error) {
      return null;
    }
  }

  // התחלת בדיקה תקופתית
  async startPeriodicCheck(homework, settings) {
    // בדיקה כל שעה
    this.checkInterval = setInterval(async () => {
      const currentHomework = await storage.get('homework-list') || [];
      const currentSettings = await storage.get('homework-settings') || {};
      await this.checkHomeworkNotifications(currentHomework, currentSettings);
      
      // שמירת המצב המעודכן
      await storage.set('homework-list', currentHomework);
    }, 60 * 60 * 1000); // כל שעה

    // בדיקה מיידית
    await this.checkHomeworkNotifications(homework, settings);
  }

  // עצירת בדיקה תקופתית
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // התראה יומית בשעה מסוימת
  async scheduleDailyNotification(time, homework) {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime - now;

    setTimeout(async () => {
      await this.sendDailySummary(homework);
      // תזמן מחדש למחר
      this.scheduleDailyNotification(time, homework);
    }, timeUntilNotification);
  }

  // סיכום יומי
  async sendDailySummary(homework) {
    const pendingHomework = homework.filter(h => !h.completed);
    const urgentHomework = pendingHomework.filter(h => {
      const daysUntil = this.getDaysUntilDue(h.dueDate);
      return daysUntil <= 2;
    });

    if (urgentHomework.length > 0) {
      await this.sendNotification('סיכום משימות יומי', {
        body: `יש לך ${urgentHomework.length} משימות דחופות היום`,
        tag: 'daily-summary'
      });
    } else if (pendingHomework.length > 0) {
      await this.sendNotification('סיכום משימות יומי', {
        body: `יש לך ${pendingHomework.length} משימות ממתינות`,
        tag: 'daily-summary'
      });
    }
  }

  // חישוב ימים עד המועד
  getDaysUntilDue(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + 'T00:00:00');
    return Math.round((due - today) / (1000 * 60 * 60 * 24));
  }

  // הצגת התראה ויזואלית במערכת
  showInAppNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-badge ${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    notification.innerHTML = `
      <svg width="24" height="24"><use href="#bell"></use></svg>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 5000);
  }
}

// יצירת אובייקט גלובלי
const notifications = new NotificationsManager();

// הוספת אנימציית יציאה ל-CSS (נעשה דינמית)
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(-100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
