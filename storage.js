// Storage Manager - מנהל אחסון עם תמיכה ב-localStorage ו-window.storage
class StorageManager {
  constructor() {
    this.useClaudeStorage = typeof window.storage !== 'undefined';
    console.log('💾 StorageManager: Initialized, using Claude storage:', this.useClaudeStorage);
  }

  // טעינת נתונים
  async get(key) {
    console.log(`📥 StorageManager.get: Loading key "${key}"...`);
    try {
      if (this.useClaudeStorage) {
        console.log(`📥 StorageManager.get: Using Claude storage for "${key}"`);
        const result = await window.storage.get(key);
        console.log(`📥 StorageManager.get: Raw result for "${key}":`, result);
        
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          console.log(`✅ StorageManager.get: Successfully loaded "${key}":`, parsed);
          return parsed;
        } else {
          console.log(`⚠️ StorageManager.get: No data found for "${key}"`);
          return null;
        }
      } else {
        console.log(`📥 StorageManager.get: Using localStorage for "${key}"`);
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          console.log(`✅ StorageManager.get: Successfully loaded "${key}" from localStorage:`, parsed);
          return parsed;
        } else {
          console.log(`⚠️ StorageManager.get: No data found for "${key}" in localStorage`);
          return null;
        }
      }
    } catch (error) {
      console.error(`❌ StorageManager.get: Error loading "${key}":`, error);
      console.error(`❌ StorageManager.get: Error stack:`, error.stack);
      return null;
    }
  }

  // שמירת נתונים
  async set(key, value) {
    console.log(`💾 StorageManager.set: Saving key "${key}"...`);
    console.log(`💾 StorageManager.set: Value:`, value);
    
    try {
      const jsonData = JSON.stringify(value);
      console.log(`💾 StorageManager.set: JSON length: ${jsonData.length} characters`);
      
      if (this.useClaudeStorage) {
        console.log(`💾 StorageManager.set: Using Claude storage for "${key}"`);
        await window.storage.set(key, jsonData);
        console.log(`✅ StorageManager.set: Successfully saved "${key}" to Claude storage`);
      } else {
        console.log(`💾 StorageManager.set: Using localStorage for "${key}"`);
        localStorage.setItem(key, jsonData);
        console.log(`✅ StorageManager.set: Successfully saved "${key}" to localStorage`);
      }
      return true;
    } catch (error) {
      console.error(`❌ StorageManager.set: Error saving "${key}":`, error);
      console.error(`❌ StorageManager.set: Error stack:`, error.stack);
      return false;
    }
  }

  // מחיקת נתונים
  async delete(key) {
    console.log(`🗑️ StorageManager.delete: Deleting key "${key}"...`);
    try {
      if (this.useClaudeStorage) {
        console.log(`🗑️ StorageManager.delete: Using Claude storage for "${key}"`);
        await window.storage.delete(key);
        console.log(`✅ StorageManager.delete: Successfully deleted "${key}" from Claude storage`);
      } else {
        console.log(`🗑️ StorageManager.delete: Using localStorage for "${key}"`);
        localStorage.removeItem(key);
        console.log(`✅ StorageManager.delete: Successfully deleted "${key}" from localStorage`);
      }
      return true;
    } catch (error) {
      console.error(`❌ StorageManager.delete: Error deleting "${key}":`, error);
      console.error(`❌ StorageManager.delete: Error stack:`, error.stack);
      return false;
    }
  }

  // מחיקת כל הנתונים
  async clearAll() {
    console.log('🗑️ StorageManager.clearAll: Clearing all data...');
    try {
      const keys = ['homework-subjects', 'homework-list', 'homework-settings', 'homework-last-backup', 'homework-tags'];
      console.log('🗑️ StorageManager.clearAll: Keys to delete:', keys);
      
      for (const key of keys) {
        console.log(`🗑️ StorageManager.clearAll: Deleting "${key}"...`);
        await this.delete(key);
      }
      
      console.log('✅ StorageManager.clearAll: All data cleared successfully');
      return true;
    } catch (error) {
      console.error('❌ StorageManager.clearAll: Error clearing data:', error);
      console.error('❌ StorageManager.clearAll: Error stack:', error.stack);
      return false;
    }
  }

  // ייצוא נתונים לקובץ JSON
  async exportData() {
    console.log('📤 StorageManager.exportData: Starting data export...');
    try {
      console.log('📤 StorageManager.exportData: Loading all data...');
      const subjects = await this.get('homework-subjects') || [];
      console.log('📤 StorageManager.exportData: Subjects loaded:', subjects.length);
      
      const homework = await this.get('homework-list') || [];
      console.log('📤 StorageManager.exportData: Homework loaded:', homework.length);
      
      const settings = await this.get('homework-settings') || {};
      console.log('📤 StorageManager.exportData: Settings loaded:', settings);
      
      const tags = await this.get('homework-tags') || [];
      console.log('📤 StorageManager.exportData: Tags loaded:', tags.length);
      
      const exportData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        subjects,
        homework,
        settings,
        tags
      };
      
      console.log('📤 StorageManager.exportData: Export data prepared:', exportData);

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      console.log('📤 StorageManager.exportData: Blob created, size:', blob.size, 'bytes');
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `homework-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.download = filename;
      console.log('📤 StorageManager.exportData: Download filename:', filename);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('📤 StorageManager.exportData: Download triggered');

      // עדכון תאריך גיבוי אחרון
      const backupDate = new Date().toISOString();
      await this.set('homework-last-backup', backupDate);
      console.log('📤 StorageManager.exportData: Last backup date updated:', backupDate);
      
      console.log('✅ StorageManager.exportData: Export completed successfully');
      return true;
    } catch (error) {
      console.error('❌ StorageManager.exportData: Error during export:', error);
      console.error('❌ StorageManager.exportData: Error stack:', error.stack);
      return false;
    }
  }

  // ייבוא נתונים מקובץ JSON
  async importData(file) {
    console.log('📥 StorageManager.importData: Starting import...');
    console.log('📥 StorageManager.importData: File:', file.name, file.size, 'bytes', file.type);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        console.log('📥 StorageManager.importData: File read complete');
        try {
          console.log('📥 StorageManager.importData: Parsing JSON...');
          const importData = JSON.parse(e.target.result);
          console.log('📥 StorageManager.importData: JSON parsed:', importData);
          
          // בדיקת תקינות הקובץ
          if (!importData.version || !importData.subjects || !importData.homework) {
            console.error('❌ StorageManager.importData: Invalid file structure');
            throw new Error('קובץ לא תקין');
          }
          
          console.log('✅ StorageManager.importData: File structure valid');
          console.log('📊 StorageManager.importData: Subjects:', importData.subjects.length);
          console.log('📚 StorageManager.importData: Homework:', importData.homework.length);
          console.log('🏷️ StorageManager.importData: Tags:', importData.tags ? importData.tags.length : 0);

          // ⚠️ אזהרה לפני החלפת נתונים
          const confirmMsg = `האם אתה בטוח שברצונך לייבא את הנתונים?\n\n` +
                           `הפעולה תחליף את כל הנתונים הקיימים:\n` +
                           `- ${importData.subjects.length} מקצועות\n` +
                           `- ${importData.homework.length} משימות\n` +
                           (importData.tags ? `- ${importData.tags.length} תגיות\n` : '') +
                           `\n⚠️ הנתונים הנוכחיים יימחקו לצמיתות!`;
          
          console.log('⚠️ StorageManager.importData: Asking user for confirmation...');
          if (!confirm(confirmMsg)) {
            console.log('⏸️ StorageManager.importData: User cancelled import');
            resolve({ success: false, message: 'הייבוא בוטל על ידי המשתמש' });
            return;
          }
          
          console.log('✅ StorageManager.importData: User confirmed, saving data...');

          // שמירת הנתונים
          await this.set('homework-subjects', importData.subjects);
          console.log('✅ StorageManager.importData: Subjects saved');
          
          await this.set('homework-list', importData.homework);
          console.log('✅ StorageManager.importData: Homework saved');
          
          if (importData.settings) {
            await this.set('homework-settings', importData.settings);
            console.log('✅ StorageManager.importData: Settings saved');
          }
          if (importData.tags) {
            await this.set('homework-tags', importData.tags);
            console.log('✅ StorageManager.importData: Tags saved');
          }

          console.log('✅ StorageManager.importData: Import completed successfully');
          resolve({ 
            success: true, 
            message: `הנתונים יובאו בהצלחה: ${importData.subjects.length} מקצועות, ${importData.homework.length} משימות`,
            data: importData
          });
        } catch (error) {
          console.error('❌ StorageManager.importData: Error during import:', error);
          console.error('❌ StorageManager.importData: Error stack:', error.stack);
          reject({ success: false, message: `שגיאה בקריאת הקובץ: ${error.message}` });
        }
      };

      reader.onerror = () => {
        console.error('❌ StorageManager.importData: FileReader error');
        reject({ success: false, message: 'שגיאה בקריאת הקובץ' });
      };

      console.log('📥 StorageManager.importData: Starting file read...');
      reader.readAsText(file);
    });
  }

  // גיבוי אוטומטי יומי
  async autoBackup() {
    console.log('🔄 StorageManager.autoBackup: Checking auto backup...');
    try {
      const settings = await this.get('homework-settings') || {};
      console.log('🔄 StorageManager.autoBackup: Settings:', settings);
      
      if (!settings.autoBackup) {
        console.log('⏸️ StorageManager.autoBackup: Auto backup disabled');
        return;
      }

      const lastBackup = await this.get('homework-last-backup');
      const now = new Date();
      console.log('🔄 StorageManager.autoBackup: Last backup:', lastBackup);
      console.log('🔄 StorageManager.autoBackup: Current time:', now.toISOString());
      
      if (!lastBackup) {
        console.log('🔄 StorageManager.autoBackup: No previous backup, creating first backup...');
        await this.exportData();
        return;
      }

      const lastBackupDate = new Date(lastBackup);
      const daysSinceBackup = Math.floor((now - lastBackupDate) / (1000 * 60 * 60 * 24));
      console.log('🔄 StorageManager.autoBackup: Days since backup:', daysSinceBackup);

      if (daysSinceBackup >= 1) {
        console.log('🔄 StorageManager.autoBackup: Creating auto backup...');
        await this.exportData();
      } else {
        console.log('⏸️ StorageManager.autoBackup: Backup not needed yet');
      }
    } catch (error) {
      console.error('❌ StorageManager.autoBackup: Error in auto backup:', error);
      console.error('❌ StorageManager.autoBackup: Error stack:', error.stack);
    }
  }

  // קבלת תאריך גיבוי אחרון
  async getLastBackupDate() {
    console.log('📅 StorageManager.getLastBackupDate: Getting last backup date...');
    try {
      const lastBackup = await this.get('homework-last-backup');
      if (lastBackup) {
        const date = new Date(lastBackup);
        console.log('✅ StorageManager.getLastBackupDate: Last backup:', date);
        return date;
      } else {
        console.log('⚠️ StorageManager.getLastBackupDate: No backup date found');
        return null;
      }
    } catch (error) {
      console.error('❌ StorageManager.getLastBackupDate: Error getting backup date:', error);
      return null;
    }
  }
}

// יצירת אובייקט גלובלי
console.log('💾 Creating global storage manager...');
const storage = new StorageManager();
console.log('✅ Global storage manager created');
