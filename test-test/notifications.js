// Notifications Manager - מנהל התראות
class NotificationsManager {
  constructor() {
    this.permission = 'default';
    this.checkInterval = null;
    console.log('🔔 NotificationsManager: Initialized');
    console.log('🔔 NotificationsManager: Notification support:', 'Notification' in window);
    if ('Notification' in window) {
      console.log('🔔 NotificationsManager: Current permission:', Notification.permission);
      this.permission = Notification.permission;
    }
  }

  // בקשת הרשאות להתראות
  async requestPermission() {
    console.log('🔔 requestPermission: Requesting notification permission...');
    
    if (!('Notification' in window)) {
      console.error('❌ requestPermission: Browser does not support notifications');
      return false;
    }

    console.log('🔔 requestPermission: Current permission status:', Notification.permission);
    
    if (Notification.permission === 'granted') {
      console.log('✅ requestPermission: Permission already granted');
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      console.log('🔔 requestPermission: Requesting permission from user...');
      const permission = await Notification.requestPermission();
      console.log('🔔 requestPermission: User response:', permission);
      this.permission = permission;
      return permission === 'granted';
    }

    console.warn('⚠️ requestPermission: Permission denied');
    return false;
  }

  // שליחת התראה
  async sendNotification(title, options = {}) {
    console.log('🔔 sendNotification: Sending notification...');
    console.log('🔔 sendNotification: Title:', title);
    console.log('🔔 sendNotification: Options:', options);
    
    if (this.permission !== 'granted') {
      console.warn('⚠️ sendNotification: Permission not granted, cannot send notification');
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '📚',
        badge: '📚',
        ...options
      });
      
      console.log('✅ sendNotification: Notification created:', notification);

      notification.onclick = () => {
        console.log('👆 sendNotification: Notification clicked');
        window.focus();
        notification.close();
      };

      console.log('✅ sendNotification: Notification sent successfully');
      return true;
    } catch (error) {
      console.error('❌ sendNotification: Error sending notification:', error);
      console.error('❌ sendNotification: Error stack:', error.stack);
      return false;
    }
  }

  // בדיקת משימות שצריכות התראה
  async checkHomeworkNotifications(homework, settings) {
    console.log('🔍 checkHomeworkNotifications: Checking homework for notifications...');
    console.log('🔍 checkHomeworkNotifications: Homework count:', homework.length);
    console.log('🔍 checkHomeworkNotifications: Settings:', settings);
    
    if (!settings.enableNotifications) {
      console.log('⏸️ checkHomeworkNotifications: Notifications disabled in settings');
      return;
    }

    const notificationDays = settings.notificationDays || 1;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    console.log('🔍 checkHomeworkNotifications: Current date:', now.toISOString());
    console.log('🔍 checkHomeworkNotifications: Notification days threshold:', notificationDays);

    let notificationsSent = 0;
    for (const hw of homework) {
      if (hw.completed) {
        console.log('⏭️ checkHomeworkNotifications: Skipping completed homework:', hw.id, hw.title);
        continue;
      }

      const dueDate = new Date(hw.dueDate + 'T00:00:00');
      const daysUntil = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
      console.log(`🔍 checkHomeworkNotifications: Homework "${hw.title}" - Days until due: ${daysUntil}`);

      // התראה עבור משימות שמתקרבות
      if (daysUntil === notificationDays && !hw.notified) {
        console.log(`🔔 checkHomeworkNotifications: Sending approaching notification for "${hw.title}"`);
        const subject = await this.getSubjectName(hw.subject);
        await this.sendNotification(`תזכורת: ${hw.title}`, {
          body: `עוד ${daysUntil} ימים להגשה${subject ? ` ב${subject}` : ''}`,
          tag: `homework-${hw.id}`
        });
        hw.notified = true;
        notificationsSent++;
        console.log(`✅ checkHomeworkNotifications: Notification sent for "${hw.title}"`);
      }

      // התראה עבור משימות שעוברות את המועד היום
      if (daysUntil === 0 && !hw.todayNotified) {
        console.log(`🔔 checkHomeworkNotifications: Sending urgent notification for "${hw.title}"`);
        const subject = await this.getSubjectName(hw.subject);
        await this.sendNotification(`⚠️ דחוף: ${hw.title}`, {
          body: `ההגשה היא היום!${subject ? ` (${subject})` : ''}`,
          tag: `homework-urgent-${hw.id}`,
          requireInteraction: true
        });
        hw.todayNotified = true;
        notificationsSent++;
        console.log(`✅ checkHomeworkNotifications: Urgent notification sent for "${hw.title}"`);
      }
    }
    
    console.log(`✅ checkHomeworkNotifications: Check complete, ${notificationsSent} notifications sent`);
  }

  // קבלת שם מקצוע
  async getSubjectName(subjectId) {
    console.log('📚 getSubjectName: Getting subject name for ID:', subjectId);
    try {
      const subjects = await storage.get('homework-subjects') || [];
      console.log('📚 getSubjectName: Subjects loaded:', subjects.length);
      const subject = subjects.find(s => s.id == subjectId);
      if (subject) {
        console.log('✅ getSubjectName: Subject found:', subject.name);
        return subject.name;
      } else {
        console.warn('⚠️ getSubjectName: Subject not found for ID:', subjectId);
        return null;
      }
    } catch (error) {
      console.error('❌ getSubjectName: Error getting subject name:', error);
      return null;
    }
  }

  // התחלת בדיקה תקופתית
  async startPeriodicCheck(homework, settings) {
    console.log('🔄 startPeriodicCheck: Starting periodic notification check...');
    console.log('🔄 startPeriodicCheck: Homework count:', homework.length);
    console.log('🔄 startPeriodicCheck: Settings:', settings);
    
    // בדיקה כל שעה
    this.checkInterval = setInterval(async () => {
      console.log('⏰ startPeriodicCheck: Periodic check triggered');
      const currentHomework = await storage.get('homework-list') || [];
      const currentSettings = await storage.get('homework-settings') || {};
      console.log('⏰ startPeriodicCheck: Current homework count:', currentHomework.length);
      
      await this.checkHomeworkNotifications(currentHomework, currentSettings);
      
      // שמירת המצב המעודכן
      await storage.set('homework-list', currentHomework);
      console.log('✅ startPeriodicCheck: Periodic check complete, data saved');
    }, 60 * 60 * 1000); // כל שעה
    
    console.log('✅ startPeriodicCheck: Interval set (every hour)');

    // בדיקה מיידית
    console.log('🔄 startPeriodicCheck: Running immediate check...');
    await this.checkHomeworkNotifications(homework, settings);
    console.log('✅ startPeriodicCheck: Periodic check started successfully');
  }

  // עצירת בדיקה תקופתית
  stopPeriodicCheck() {
    console.log('⏸️ stopPeriodicCheck: Stopping periodic check...');
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('✅ stopPeriodicCheck: Periodic check stopped');
    } else {
      console.log('⚠️ stopPeriodicCheck: No active periodic check to stop');
    }
  }

  // חישוב ימים עד המועד
  getDaysUntilDue(dueDate) {
    console.log('📅 getDaysUntilDue: Calculating days for:', dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + 'T00:00:00');
    const days = Math.round((due - today) / (1000 * 60 * 60 * 24));
    console.log('📅 getDaysUntilDue: Result:', days, 'days');
    return days;
  }

  // הצגת התראה ויזואלית במערכת
  showInAppNotification(message, type = 'info') {
    console.log('💬 showInAppNotification: Showing in-app notification');
    console.log('💬 showInAppNotification: Message:', message);
    console.log('💬 showInAppNotification: Type:', type);
    
    const notification = document.createElement('div');
    notification.className = `notification-badge ${type}`;
    
    notification.innerHTML = `
      <svg width="24" height="24"><use href="#bell"></use></svg>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    console.log('💬 showInAppNotification: Notification element added to DOM');

    setTimeout(() => {
      console.log('💬 showInAppNotification: Starting fadeout animation...');
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
          console.log('✅ showInAppNotification: Notification removed from DOM');
        }
      }, 300);
    }, 5000);
  }
}

// יצירת אובייקט גלובלי
console.log('🔔 Creating global notifications manager...');
const notifications = new NotificationsManager();
console.log('✅ Global notifications manager created');

// הוספת אנימציית יציאה ל-CSS (נעשה דינמית)
console.log('🎨 Adding slideOut animation CSS...');
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
console.log('✅ slideOut animation CSS added');
