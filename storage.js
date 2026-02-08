// Storage Manager - מנהל אחסון עם תמיכה ב-localStorage ו-window.storage
class StorageManager {
  constructor() {
    this.useClaudeStorage = typeof window.storage !== 'undefined';
  }

  // טעינת נתונים
  async get(key) {
    try {
      if (this.useClaudeStorage) {
        const result = await window.storage.get(key);
        return result ? JSON.parse(result.value) : null;
      } else {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }
    } catch (error) {
      console.error(`שגיאה בטעינת ${key}:`, error);
      return null;
    }
  }

  // שמירת נתונים
  async set(key, value) {
    try {
      const jsonData = JSON.stringify(value);
      if (this.useClaudeStorage) {
        await window.storage.set(key, jsonData);
      } else {
        localStorage.setItem(key, jsonData);
      }
      return true;
    } catch (error) {
      console.error(`שגיאה בשמירת ${key}:`, error);
      return false;
    }
  }

  // מחיקת נתונים
  async delete(key) {
    try {
      if (this.useClaudeStorage) {
        await window.storage.delete(key);
      } else {
        localStorage.removeItem(key);
      }
      return true;
    } catch (error) {
      console.error(`שגיאה במחיקת ${key}:`, error);
      return false;
    }
  }

  // מחיקת כל הנתונים
  async clearAll() {
    try {
      const keys = ['homework-subjects', 'homework-list', 'homework-settings', 'homework-last-backup'];
      for (const key of keys) {
        await this.delete(key);
      }
      return true;
    } catch (error) {
      console.error('שגיאה במחיקת כל הנתונים:', error);
      return false;
    }
  }

  // ייצוא נתונים לקובץ JSON
  async exportData() {
    try {
      const subjects = await this.get('homework-subjects') || [];
      const homework = await this.get('homework-list') || [];
      const settings = await this.get('homework-settings') || {};
      
      const exportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        subjects,
        homework,
        settings
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `homework-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // עדכון תאריך גיבוי אחרון
      await this.set('homework-last-backup', new Date().toISOString());
      
      return true;
    } catch (error) {
      console.error('שגיאה בייצוא נתונים:', error);
      return false;
    }
  }

  // ייבוא נתונים מקובץ JSON
  async importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const importData = JSON.parse(e.target.result);
          
          // בדיקת תקינות הקובץ
          if (!importData.version || !importData.subjects || !importData.homework) {
            throw new Error('קובץ לא תקין');
          }

          // ⚠️ אזהרה לפני החלפת נתונים
          const confirmMsg = `האם אתה בטוח שברצונך לייבא את הנתונים?\n\n` +
                           `הפעולה תחליף את כל הנתונים הקיימים:\n` +
                           `- ${importData.subjects.length} מקצועות\n` +
                           `- ${importData.homework.length} משימות\n\n` +
                           `⚠️ הנתונים הנוכחיים יימחקו לצמיתות!`;
          
          if (!confirm(confirmMsg)) {
            resolve({ success: false, message: 'הייבוא בוטל על ידי המשתמש' });
            return;
          }

          // שמירת הנתונים
          await this.set('homework-subjects', importData.subjects);
          await this.set('homework-list', importData.homework);
          if (importData.settings) {
            await this.set('homework-settings', importData.settings);
          }

          resolve({ 
            success: true, 
            message: `הנתונים יובאו בהצלחה: ${importData.subjects.length} מקצועות, ${importData.homework.length} משימות`,
            data: importData
          });
        } catch (error) {
          reject({ success: false, message: `שגיאה בקריאת הקובץ: ${error.message}` });
        }
      };

      reader.onerror = () => {
        reject({ success: false, message: 'שגיאה בקריאת הקובץ' });
      };

      reader.readAsText(file);
    });
  }

  // גיבוי אוטומטי יומי
  async autoBackup() {
    try {
      const settings = await this.get('homework-settings') || {};
      if (!settings.autoBackup) return;

      const lastBackup = await this.get('homework-last-backup');
      const now = new Date();
      
      if (!lastBackup) {
        await this.exportData();
        return;
      }

      const lastBackupDate = new Date(lastBackup);
      const daysSinceBackup = Math.floor((now - lastBackupDate) / (1000 * 60 * 60 * 24));

      if (daysSinceBackup >= 1) {
        await this.exportData();
      }
    } catch (error) {
      console.error('שגיאה בגיבוי אוטומטי:', error);
    }
  }

  // קבלת תאריך גיבוי אחרון
  async getLastBackupDate() {
    try {
      const lastBackup = await this.get('homework-last-backup');
      return lastBackup ? new Date(lastBackup) : null;
    } catch (error) {
      return null;
    }
  }
}

// יצירת אובייקט גלובלי
const storage = new StorageManager();
