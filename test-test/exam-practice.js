// Exam Practice Manager - מנהל התאמנות למבחנים
// =========================================================

class ExamPracticeManager {
  constructor() {
    console.log('📝 ExamPracticeManager: Initializing...');
    
    this.exams = [];
    this.practiceHistory = [];
    this.stats = {
      totalPracticed: 0,
      totalTimeSpent: 0,
      subjectStats: {}
    };
    
    console.log('✅ ExamPracticeManager: Initialized');
  }

  // ==================== טעינה ושמירה ====================
  
  async loadData() {
    console.log('📥 loadData: Loading exam practice data...');
    try {
      const savedExams = await storage.get('exam-practice-exams');
      if (savedExams) {
        this.exams = savedExams;
        console.log('✅ loadData: Exams loaded:', this.exams.length);
      }
      
      const savedHistory = await storage.get('exam-practice-history');
      if (savedHistory) {
        this.practiceHistory = savedHistory;
        console.log('✅ loadData: Practice history loaded:', this.practiceHistory.length);
      }
      
      const savedStats = await storage.get('exam-practice-stats');
      if (savedStats) {
        this.stats = savedStats;
        console.log('✅ loadData: Stats loaded:', this.stats);
      }
    } catch (error) {
      console.error('❌ loadData: Error loading data:', error);
    }
  }

  async saveData() {
    console.log('💾 saveData: Saving exam practice data...');
    try {
      await storage.set('exam-practice-exams', this.exams);
      await storage.set('exam-practice-history', this.practiceHistory);
      await storage.set('exam-practice-stats', this.stats);
      console.log('✅ saveData: Data saved');
    } catch (error) {
      console.error('❌ saveData: Error saving data:', error);
    }
  }

  // ==================== ניהול מבחנים ====================
  
  addExam(title, subject, examDate, topics = []) {
    console.log('➕ addExam:', { title, subject, examDate, topics });
    
    const exam = {
      id: Date.now(),
      title,
      subject,
      examDate,
      topics,
      createdAt: new Date().toISOString(),
      practiceCount: 0,
      lastPracticed: null,
      completed: false
    };
    
    this.exams.push(exam);
    this.saveData();
    
    // הוספת למשימות
    if (typeof homework !== 'undefined') {
      homework.push({
        id: Date.now() + 1,
        subject: subject,
        title: `📝 מבחן: ${title}`,
        description: topics.length > 0 ? `נושאים: ${topics.join(', ')}` : '',
        dueDate: examDate,
        priority: 'high',
        completed: false,
        files: [],
        tags: ['מבחן'],
        isExam: true,
        examId: exam.id,
        createdAt: new Date().toISOString()
      });
      
      saveData();
      render();
    }
    
    notifications.showInAppNotification(`המבחן "${title}" נוסף`, 'success');
    return exam;
  }

  deleteExam(examId) {
    console.log('🗑️ deleteExam:', examId);
    
    const exam = this.exams.find(e => e.id === examId);
    if (!exam) {
      console.warn('⚠️ deleteExam: Exam not found');
      return;
    }
    
    if (!confirm(`האם למחוק את המבחן "${exam.title}"?`)) {
      return;
    }
    
    this.exams = this.exams.filter(e => e.id !== examId);
    this.practiceHistory = this.practiceHistory.filter(p => p.examId !== examId);
    
    // מחיקה מהמשימות
    if (typeof homework !== 'undefined') {
      homework = homework.filter(h => h.examId !== examId);
      saveData();
      render();
    }
    
    this.saveData();
    notifications.showInAppNotification('המבחן נמחק', 'success');
  }

  // ==================== התאמנות ====================
  
  startPractice(examId) {
    console.log('▶️ startPractice: Starting practice for exam', examId);
    
    const exam = this.exams.find(e => e.id === examId);
    if (!exam) {
      console.warn('⚠️ startPractice: Exam not found');
      return;
    }
    
    // פתיחת מודאל תרגול
    this.openPracticeModal(exam);
  }

  openPracticeModal(exam) {
    console.log('📝 openPracticeModal: Opening practice modal for', exam.title);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'practice-modal';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>📝 תרגול: ${exam.title}</h2>
          <button class="close-modal-btn" onclick="document.getElementById('practice-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="practice-info">
            <p><strong>מקצוע:</strong> ${this.getSubjectName(exam.subject)}</p>
            <p><strong>תאריך מבחן:</strong> ${new Date(exam.examDate).toLocaleDateString('he-IL')}</p>
            ${exam.topics.length > 0 ? `<p><strong>נושאים:</strong> ${exam.topics.join(', ')}</p>` : ''}
            <p><strong>תרגולים עד כה:</strong> ${exam.practiceCount}</p>
          </div>
          
          <div class="practice-timer">
            <div class="timer-display" id="practice-timer">00:00</div>
            <div class="timer-controls">
              <button class="btn btn-primary" id="practice-start-btn" onclick="examPractice.startTimer(${exam.id})">
                <svg width="20" height="20"><use href="#play"></use></svg>
                התחל תרגול
              </button>
              <button class="btn btn-secondary hidden" id="practice-pause-btn" onclick="examPractice.pauseTimer()">
                <svg width="20" height="20"><use href="#pause"></use></svg>
                השהה
              </button>
              <button class="btn btn-danger" id="practice-stop-btn" onclick="examPractice.stopTimer(${exam.id})">
                <svg width="20" height="20"><use href="#square"></use></svg>
                סיים תרגול
              </button>
            </div>
          </div>
          
          <div class="practice-notes">
            <h4>הערות תרגול:</h4>
            <textarea class="textarea" id="practice-notes" 
                      placeholder="כתוב כאן הערות על התרגול, נקודות חלשות, שאלות שנתקלת בהן..."></textarea>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (confirm('האם לסגור את החלון? התרגול יופסק.')) {
          this.stopTimer(exam.id);
          modal.remove();
        }
      }
    });
  }

  // ==================== טיימר תרגול ====================
  
  startTimer(examId) {
    console.log('⏱️ startTimer: Starting practice timer for exam', examId);
    
    this.currentExamId = examId;
    this.practiceStartTime = Date.now();
    this.practiceElapsed = 0;
    this.practiceInterval = setInterval(() => {
      this.updatePracticeTimer();
    }, 1000);
    
    const startBtn = document.getElementById('practice-start-btn');
    const pauseBtn = document.getElementById('practice-pause-btn');
    
    if (startBtn) startBtn.classList.add('hidden');
    if (pauseBtn) pauseBtn.classList.remove('hidden');
  }

  pauseTimer() {
    console.log('⏸️ pauseTimer: Pausing practice timer');
    
    if (this.practiceInterval) {
      clearInterval(this.practiceInterval);
      this.practiceInterval = null;
    }
    
    const startBtn = document.getElementById('practice-start-btn');
    const pauseBtn = document.getElementById('practice-pause-btn');
    
    if (startBtn) {
      startBtn.classList.remove('hidden');
      startBtn.innerHTML = '<svg width="20" height="20"><use href="#play"></use></svg> המשך';
    }
    if (pauseBtn) pauseBtn.classList.add('hidden');
  }

  updatePracticeTimer() {
    if (!this.practiceStartTime) return;
    
    this.practiceElapsed = Math.floor((Date.now() - this.practiceStartTime) / 1000);
    
    const minutes = Math.floor(this.practiceElapsed / 60);
    const seconds = this.practiceElapsed % 60;
    
    const display = document.getElementById('practice-timer');
    if (display) {
      display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }

  stopTimer(examId) {
    console.log('⏹️ stopTimer: Stopping practice timer');
    
    if (this.practiceInterval) {
      clearInterval(this.practiceInterval);
      this.practiceInterval = null;
    }
    
    // שמירת תרגול
    const notes = document.getElementById('practice-notes');
    const duration = this.practiceElapsed || 0;
    
    if (duration > 0) {
      this.recordPractice(examId, duration, notes ? notes.value : '');
    }
    
    document.getElementById('practice-modal').remove();
  }

  recordPractice(examId, duration, notes = '') {
    console.log('💾 recordPractice:', { examId, duration, notes });
    
    const exam = this.exams.find(e => e.id === examId);
    if (!exam) {
      console.warn('⚠️ recordPractice: Exam not found');
      return;
    }
    
    // עדכון מבחן
    exam.practiceCount++;
    exam.lastPracticed = new Date().toISOString();
    
    // הוספת להיסטוריה
    const practice = {
      id: Date.now(),
      examId,
      date: new Date().toISOString(),
      duration,
      notes
    };
    
    this.practiceHistory.push(practice);
    
    // עדכון סטטיסטיקות
    this.stats.totalPracticed++;
    this.stats.totalTimeSpent += duration;
    
    if (!this.stats.subjectStats[exam.subject]) {
      this.stats.subjectStats[exam.subject] = {
        practiced: 0,
        timeSpent: 0
      };
    }
    
    this.stats.subjectStats[exam.subject].practiced++;
    this.stats.subjectStats[exam.subject].timeSpent += duration;
    
    this.saveData();
    
    // גמיפיקציה
    if (typeof gamification !== 'undefined') {
      gamification.userStats.examsPracticed = (gamification.userStats.examsPracticed || 0) + 1;
      gamification.addXP(20, 'תרגול למבחן');
      gamification.checkAchievements();
    }
    
    // שמירת רצף
    this.recordActivityForStreak();
    
    const minutes = Math.floor(duration / 60);
    notifications.showInAppNotification(
      `תרגול של ${minutes} דקות נשמר! 🎉`,
      'success'
    );
  }

  recordActivityForStreak() {
    console.log('🔥 recordActivityForStreak: Recording activity for streak...');
    
    if (typeof gamification !== 'undefined') {
      gamification.recordActivity();
    }
  }

  // ==================== עזרים ====================
  
  getSubjectName(subjectId) {
    if (typeof subjects === 'undefined') return 'לא ידוע';
    const subject = subjects.find(s => s.id == subjectId);
    return subject ? subject.name : 'לא ידוע';
  }

  getTodayExams() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.exams.filter(exam => {
      const examDate = new Date(exam.examDate);
      examDate.setHours(0, 0, 0, 0);
      return examDate.getTime() === today.getTime() && !exam.completed;
    });
  }

  getUpcomingExams(days = 7) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const future = new Date(today);
    future.setDate(future.getDate() + days);
    
    return this.exams.filter(exam => {
      const examDate = new Date(exam.examDate);
      examDate.setHours(0, 0, 0, 0);
      return examDate >= today && examDate <= future && !exam.completed;
    }).sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
  }

  // ==================== UI ====================
  
  openExamManager() {
    console.log('📝 openExamManager: Opening exam manager...');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'exam-manager-modal';
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
          <h2>📝 ניהול מבחנים</h2>
          <button class="close-modal-btn" onclick="document.getElementById('exam-manager-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="exam-stats">
            <div class="stat-card blue">
              <div class="stat-number blue">${this.exams.length}</div>
              <div class="stat-label">מבחנים</div>
            </div>
            <div class="stat-card green">
              <div class="stat-number green">${this.stats.totalPracticed}</div>
              <div class="stat-label">תרגולים</div>
            </div>
            <div class="stat-card orange">
              <div class="stat-number orange">${Math.floor(this.stats.totalTimeSpent / 60)}</div>
              <div class="stat-label">דקות תרגול</div>
            </div>
          </div>
          
          <button class="btn btn-primary" onclick="examPractice.openAddExamForm()" style="margin-bottom: 1rem;">
            <svg width="20" height="20"><use href="#plus"></use></svg>
            הוסף מבחן
          </button>
          
          <div id="exam-list">
            ${this.renderExamList()}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  renderExamList() {
    if (this.exams.length === 0) {
      return '<p class="empty-state">טרם נוספו מבחנים</p>';
    }
    
    const upcoming = this.getUpcomingExams(30);
    
    return `
      <div class="exam-list">
        ${upcoming.map(exam => {
          const daysUntil = Math.ceil((new Date(exam.examDate) - new Date()) / (1000 * 60 * 60 * 24));
          const isUrgent = daysUntil <= 3;
          
          return `
            <div class="exam-item ${isUrgent ? 'urgent' : ''}">
              <div class="exam-header">
                <h4>${exam.title}</h4>
                <div class="exam-actions">
                  <button class="btn btn-primary" style="padding: 0.5rem 1rem; width: auto;" 
                          onclick="examPractice.startPractice(${exam.id})">
                    📝 תרגל
                  </button>
                  <button class="icon-btn" onclick="examPractice.deleteExam(${exam.id})">
                    <svg width="20" height="20"><use href="#trash"></use></svg>
                  </button>
                </div>
              </div>
              <div class="exam-details">
                <span class="badge" style="background-color: ${this.getSubjectColor(exam.subject)};">
                  ${this.getSubjectName(exam.subject)}
                </span>
                <span>📅 ${new Date(exam.examDate).toLocaleDateString('he-IL')}</span>
                <span>${daysUntil > 0 ? `עוד ${daysUntil} ימים` : daysUntil === 0 ? 'היום!' : 'עבר'}</span>
                <span>🔄 ${exam.practiceCount} תרגולים</span>
              </div>
              ${exam.topics.length > 0 ? `
                <div class="exam-topics">
                  <strong>נושאים:</strong> ${exam.topics.join(', ')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  getSubjectColor(subjectId) {
    if (typeof subjects === 'undefined') return '#6b7280';
    const subject = subjects.find(s => s.id == subjectId);
    return subject ? subject.color : '#6b7280';
  }

  openAddExamForm() {
    const form = document.createElement('div');
    form.className = 'add-exam-form';
    form.innerHTML = `
      <h3>הוסף מבחן חדש</h3>
      <div class="form-group">
        <label>כותרת</label>
        <input type="text" class="input" id="new-exam-title" placeholder="למשל: מבחן באנגלית">
      </div>
      <div class="form-group">
        <label>מקצוע</label>
        <select class="select" id="new-exam-subject">
          <option value="">בחר מקצוע</option>
          ${typeof subjects !== 'undefined' ? subjects.map(s => `
            <option value="${s.id}">${s.name}</option>
          `).join('') : ''}
        </select>
      </div>
      <div class="form-group">
        <label>תאריך מבחן</label>
        <input type="date" class="input" id="new-exam-date">
      </div>
      <div class="form-group">
        <label>נושאים (מופרדים בפסיק)</label>
        <input type="text" class="input" id="new-exam-topics" placeholder="למשל: Past Simple, Present Perfect, Conditionals">
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="examPractice.submitNewExam()">
          <svg width="20" height="20"><use href="#plus"></use></svg>
          הוסף
        </button>
        <button class="btn btn-secondary" onclick="this.closest('.add-exam-form').remove()">
          ביטול
        </button>
      </div>
    `;
    
    const examList = document.getElementById('exam-list');
    if (examList) {
      examList.insertBefore(form, examList.firstChild);
    }
  }

  submitNewExam() {
    const title = document.getElementById('new-exam-title').value.trim();
    const subject = document.getElementById('new-exam-subject').value;
    const date = document.getElementById('new-exam-date').value;
    const topicsStr = document.getElementById('new-exam-topics').value.trim();
    
    if (!title || !subject || !date) {
      notifications.showInAppNotification('נא למלא את כל השדות', 'error');
      return;
    }
    
    const topics = topicsStr ? topicsStr.split(',').map(t => t.trim()) : [];
    
    this.addExam(title, subject, date, topics);
    
    // רענון התצוגה
    const examList = document.getElementById('exam-list');
    if (examList) {
      examList.innerHTML = this.renderExamList();
    }
  }
}

// יצירת אובייקט גלובלי
console.log('📝 Creating global exam practice manager...');
const examPractice = new ExamPracticeManager();
console.log('✅ Global exam practice manager created');

// אתחול
window.addEventListener('DOMContentLoaded', async () => {
  console.log('📝 exam-practice.js: Initializing...');
  await examPractice.loadData();
  console.log('✅ exam-practice.js: Initialized');
});
