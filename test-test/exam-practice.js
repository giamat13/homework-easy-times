// Exam Practice Manager - מנהל תרגול מבחנים
// =================================================

console.log('📝 exam-practice.js: Loading...');

class ExamPracticeManager {
  constructor() {
    this.subjects = [];
    this.currentSubject = null;
    this.currentQuestion = null;
    this.questionHistory = [];
    this.stats = {
      totalQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      perfectScores: 0,
      subjectStats: {}
    };
    
    console.log('✅ ExamPracticeManager: Initialized');
  }

  // ==================== טעינה ושמירה ====================

  async loadData() {
    console.log('📥 loadData: Loading exam practice data...');
    try {
      const subjects = await storage.get('homework-subjects') || [];
      this.subjects = subjects;
      console.log('✅ loadData: Subjects loaded:', subjects.length);
      
      const stats = await storage.get('exam-practice-stats');
      if (stats) {
        this.stats = stats;
        console.log('✅ loadData: Stats loaded:', this.stats);
      }
      
      const history = await storage.get('exam-practice-history');
      if (history) {
        this.questionHistory = history;
        console.log('✅ loadData: History loaded:', history.length, 'questions');
      }
    } catch (error) {
      console.error('❌ loadData: Error loading data:', error);
    }
  }

  async saveData() {
    console.log('💾 saveData: Saving exam practice data...');
    try {
      await storage.set('exam-practice-stats', this.stats);
      await storage.set('exam-practice-history', this.questionHistory);
      console.log('✅ saveData: Data saved');
    } catch (error) {
      console.error('❌ saveData: Error saving data:', error);
    }
  }

  // ==================== יצירת שאלות ====================

  async startPractice(subjectId) {
    console.log('📝 startPractice: Starting practice for subject:', subjectId);
    
    this.currentSubject = this.subjects.find(s => s.id == subjectId);
    if (!this.currentSubject) {
      console.error('❌ startPractice: Subject not found');
      notifications.showInAppNotification('שגיאה: מקצוע לא נמצא', 'error');
      return;
    }
    
    console.log('✅ startPractice: Subject found:', this.currentSubject.name);
    
    // יצירת שאלה חדשה
    this.generateNewQuestion();
  }

  generateNewQuestion() {
    console.log('🎲 generateNewQuestion: Generating new question...');
    
    // בחירת סוג שאלה רנדומלי
    const questionTypes = ['multipleChoice', 'trueFalse', 'fillBlank', 'shortAnswer'];
    const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    
    console.log('🎲 generateNewQuestion: Question type:', randomType);
    
    this.currentQuestion = {
      id: Date.now(),
      subject: this.currentSubject.id,
      subjectName: this.currentSubject.name,
      type: randomType,
      timestamp: new Date().toISOString(),
      answered: false,
      correct: null,
      userAnswer: null
    };
    
    this.renderQuestion();
  }

  renderQuestion() {
    console.log('🎨 renderQuestion: Rendering current question...');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'exam-practice-modal';
    
    let questionContent = '';
    
    switch (this.currentQuestion.type) {
      case 'multipleChoice':
        questionContent = this.renderMultipleChoice();
        break;
      case 'trueFalse':
        questionContent = this.renderTrueFalse();
        break;
      case 'fillBlank':
        questionContent = this.renderFillBlank();
        break;
      case 'shortAnswer':
        questionContent = this.renderShortAnswer();
        break;
    }
    
    const progress = this.getSessionProgress();
    
    modal.innerHTML = `
      <div class="modal-content exam-practice-modal-content">
        <div class="modal-header">
          <h2>📝 תרגול: ${this.currentSubject.name}</h2>
          <button class="close-modal-btn" onclick="examPractice.endPractice()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        
        <div class="exam-progress-bar">
          <div class="exam-progress-fill" style="width: ${progress}%;"></div>
        </div>
        <div class="exam-progress-text">
          שאלה ${this.questionHistory.filter(q => q.subject == this.currentSubject.id).length + 1} | 
          ${this.stats.subjectStats[this.currentSubject.id]?.correct || 0} נכונות מתוך 
          ${this.stats.subjectStats[this.currentSubject.id]?.total || 0}
        </div>
        
        <div class="modal-body">
          ${questionContent}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    console.log('✅ renderQuestion: Question rendered');
  }

  renderMultipleChoice() {
    console.log('🎨 renderMultipleChoice: Rendering multiple choice question');
    
    return `
      <div class="exam-question">
        <div class="question-type-badge">שאלת אמריקאית</div>
        <div class="question-text">
          <h3>זהו תרגול עצמאי - הכנס שאלה משלך:</h3>
          <textarea class="textarea" id="custom-question" placeholder="הקלד את השאלה שלך כאן..." style="margin-bottom: 1rem;"></textarea>
          
          <h4>תשובות אפשריות:</h4>
          <div id="answer-options">
            <div class="answer-option">
              <input type="text" class="input" placeholder="תשובה 1" id="option-1" style="margin-bottom: 0.5rem;">
            </div>
            <div class="answer-option">
              <input type="text" class="input" placeholder="תשובה 2" id="option-2" style="margin-bottom: 0.5rem;">
            </div>
            <div class="answer-option">
              <input type="text" class="input" placeholder="תשובה 3" id="option-3" style="margin-bottom: 0.5rem;">
            </div>
            <div class="answer-option">
              <input type="text" class="input" placeholder="תשובה 4" id="option-4" style="margin-bottom: 0.5rem;">
            </div>
          </div>
          
          <div style="margin-top: 1rem;">
            <label>
              <strong>בחר את התשובה הנכונה:</strong>
              <select class="select" id="correct-answer" style="margin-top: 0.5rem;">
                <option value="1">תשובה 1</option>
                <option value="2">תשובה 2</option>
                <option value="3">תשובה 3</option>
                <option value="4">תשובה 4</option>
              </select>
            </label>
          </div>
        </div>
        
        <div class="exam-actions" style="margin-top: 2rem;">
          <button class="btn btn-primary" onclick="examPractice.startAnswering()">
            התחל לענות
          </button>
          <button class="btn btn-secondary" onclick="examPractice.skipQuestion()">
            דלג לשאלה אחרת
          </button>
        </div>
      </div>
    `;
  }

  renderTrueFalse() {
    console.log('🎨 renderTrueFalse: Rendering true/false question');
    
    return `
      <div class="exam-question">
        <div class="question-type-badge">נכון/לא נכון</div>
        <div class="question-text">
          <h3>הכנס משפט לבדיקה:</h3>
          <textarea class="textarea" id="custom-statement" placeholder="הקלד משפט לבדיקה..." style="margin-bottom: 1rem;"></textarea>
          
          <div style="margin-top: 1rem;">
            <label>
              <strong>בחר את התשובה הנכונה:</strong>
              <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                <label style="flex: 1;">
                  <input type="radio" name="tf-answer" value="true" id="tf-true">
                  נכון
                </label>
                <label style="flex: 1;">
                  <input type="radio" name="tf-answer" value="false" id="tf-false">
                  לא נכון
                </label>
              </div>
            </label>
          </div>
        </div>
        
        <div class="exam-actions" style="margin-top: 2rem;">
          <button class="btn btn-primary" onclick="examPractice.startAnswering()">
            התחל לענות
          </button>
          <button class="btn btn-secondary" onclick="examPractice.skipQuestion()">
            דלג לשאלה אחרת
          </button>
        </div>
      </div>
    `;
  }

  renderFillBlank() {
    console.log('🎨 renderFillBlank: Rendering fill-in-the-blank question');
    
    return `
      <div class="exam-question">
        <div class="question-type-badge">השלמת משפט</div>
        <div class="question-text">
          <h3>הכנס משפט עם חסר:</h3>
          <textarea class="textarea" id="custom-sentence" placeholder="הקלד משפט והשאר מקום ריק עם _____ למילה החסרה" style="margin-bottom: 1rem;"></textarea>
          
          <div style="margin-top: 1rem;">
            <label>
              <strong>התשובה הנכונה למילוי החסר:</strong>
              <input type="text" class="input" id="blank-answer" placeholder="התשובה" style="margin-top: 0.5rem;">
            </label>
          </div>
        </div>
        
        <div class="exam-actions" style="margin-top: 2rem;">
          <button class="btn btn-primary" onclick="examPractice.startAnswering()">
            התחל לענות
          </button>
          <button class="btn btn-secondary" onclick="examPractice.skipQuestion()">
            דלג לשאלה אחרת
          </button>
        </div>
      </div>
    `;
  }

  renderShortAnswer() {
    console.log('🎨 renderShortAnswer: Rendering short answer question');
    
    return `
      <div class="exam-question">
        <div class="question-type-badge">תשובה קצרה</div>
        <div class="question-text">
          <h3>הכנס שאלה פתוחה:</h3>
          <textarea class="textarea" id="custom-open-question" placeholder="הקלד שאלה פתוחה..." style="margin-bottom: 1rem;"></textarea>
          
          <div style="margin-top: 1rem;">
            <label>
              <strong>תשובה לדוגמה:</strong>
              <textarea class="textarea" id="example-answer" placeholder="תשובה לדוגמה או נקודות מפתח" style="margin-top: 0.5rem;"></textarea>
            </label>
          </div>
        </div>
        
        <div class="exam-actions" style="margin-top: 2rem;">
          <button class="btn btn-primary" onclick="examPractice.startAnswering()">
            התחל לענות
          </button>
          <button class="btn btn-secondary" onclick="examPractice.skipQuestion()">
            דלג לשאלה אחרת
          </button>
        </div>
      </div>
    `;
  }

  startAnswering() {
    console.log('▶️ startAnswering: Starting answer phase...');
    
    // שמירת פרטי השאלה
    const questionData = this.collectQuestionData();
    if (!questionData) {
      notifications.showInAppNotification('נא למלא את כל השדות', 'error');
      return;
    }
    
    this.currentQuestion.questionData = questionData;
    
    // רינדור מסך מענה
    this.renderAnswerScreen();
  }

  collectQuestionData() {
    console.log('📝 collectQuestionData: Collecting question data...');
    
    switch (this.currentQuestion.type) {
      case 'multipleChoice':
        const question = document.getElementById('custom-question')?.value;
        const options = [
          document.getElementById('option-1')?.value,
          document.getElementById('option-2')?.value,
          document.getElementById('option-3')?.value,
          document.getElementById('option-4')?.value
        ];
        const correctAnswer = document.getElementById('correct-answer')?.value;
        
        if (!question || options.some(o => !o)) {
          return null;
        }
        
        return { question, options, correctAnswer };
        
      case 'trueFalse':
        const statement = document.getElementById('custom-statement')?.value;
        const tfTrue = document.getElementById('tf-true')?.checked;
        const tfFalse = document.getElementById('tf-false')?.checked;
        
        if (!statement || (!tfTrue && !tfFalse)) {
          return null;
        }
        
        return { statement, correctAnswer: tfTrue ? 'true' : 'false' };
        
      case 'fillBlank':
        const sentence = document.getElementById('custom-sentence')?.value;
        const blankAnswer = document.getElementById('blank-answer')?.value;
        
        if (!sentence || !blankAnswer || !sentence.includes('_____')) {
          return null;
        }
        
        return { sentence, correctAnswer: blankAnswer };
        
      case 'shortAnswer':
        const openQuestion = document.getElementById('custom-open-question')?.value;
        const exampleAnswer = document.getElementById('example-answer')?.value;
        
        if (!openQuestion || !exampleAnswer) {
          return null;
        }
        
        return { question: openQuestion, exampleAnswer };
        
      default:
        return null;
    }
  }

  renderAnswerScreen() {
    console.log('🎨 renderAnswerScreen: Rendering answer screen...');
    
    const modal = document.getElementById('exam-practice-modal');
    if (!modal) return;
    
    let answerContent = '';
    
    switch (this.currentQuestion.type) {
      case 'multipleChoice':
        answerContent = `
          <div class="question-display">
            <h3>${this.currentQuestion.questionData.question}</h3>
            <div class="answer-choices">
              ${this.currentQuestion.questionData.options.map((opt, i) => `
                <label class="answer-choice">
                  <input type="radio" name="user-answer" value="${i + 1}">
                  <span>${opt}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `;
        break;
        
      case 'trueFalse':
        answerContent = `
          <div class="question-display">
            <h3>${this.currentQuestion.questionData.statement}</h3>
            <div class="answer-choices">
              <label class="answer-choice">
                <input type="radio" name="user-answer" value="true">
                <span>נכון</span>
              </label>
              <label class="answer-choice">
                <input type="radio" name="user-answer" value="false">
                <span>לא נכון</span>
              </label>
            </div>
          </div>
        `;
        break;
        
      case 'fillBlank':
        answerContent = `
          <div class="question-display">
            <h3>${this.currentQuestion.questionData.sentence.replace('_____', '<input type="text" id="user-blank-answer" class="input inline-input" placeholder="___">')}</h3>
          </div>
        `;
        break;
        
      case 'shortAnswer':
        answerContent = `
          <div class="question-display">
            <h3>${this.currentQuestion.questionData.question}</h3>
            <textarea class="textarea" id="user-short-answer" placeholder="הקלד את תשובתך כאן..." rows="5"></textarea>
          </div>
        `;
        break;
    }
    
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="exam-question answering-phase">
          <div class="question-type-badge">${this.getQuestionTypeLabel()}</div>
          ${answerContent}
          
          <div class="exam-actions" style="margin-top: 2rem;">
            <button class="btn btn-success" onclick="examPractice.submitAnswer()">
              שלח תשובה
            </button>
            <button class="btn btn-secondary" onclick="examPractice.giveUp()">
              התמודדתי - הראה תשובה
            </button>
          </div>
        </div>
      `;
    }
  }

  getQuestionTypeLabel() {
    const labels = {
      multipleChoice: 'שאלת אמריקאית',
      trueFalse: 'נכון/לא נכון',
      fillBlank: 'השלמת משפט',
      shortAnswer: 'תשובה קצרה'
    };
    return labels[this.currentQuestion.type] || '';
  }

  submitAnswer() {
    console.log('✅ submitAnswer: Submitting user answer...');
    
    let userAnswer = null;
    let isCorrect = false;
    
    switch (this.currentQuestion.type) {
      case 'multipleChoice':
        const selected = document.querySelector('input[name="user-answer"]:checked');
        if (!selected) {
          notifications.showInAppNotification('נא לבחור תשובה', 'error');
          return;
        }
        userAnswer = selected.value;
        isCorrect = userAnswer === this.currentQuestion.questionData.correctAnswer;
        break;
        
      case 'trueFalse':
        const tfSelected = document.querySelector('input[name="user-answer"]:checked');
        if (!tfSelected) {
          notifications.showInAppNotification('נא לבחור תשובה', 'error');
          return;
        }
        userAnswer = tfSelected.value;
        isCorrect = userAnswer === this.currentQuestion.questionData.correctAnswer;
        break;
        
      case 'fillBlank':
        userAnswer = document.getElementById('user-blank-answer')?.value;
        if (!userAnswer) {
          notifications.showInAppNotification('נא למלא את החסר', 'error');
          return;
        }
        // השוואה לא תלויה רישיות
        isCorrect = userAnswer.toLowerCase().trim() === this.currentQuestion.questionData.correctAnswer.toLowerCase().trim();
        break;
        
      case 'shortAnswer':
        userAnswer = document.getElementById('user-short-answer')?.value;
        if (!userAnswer) {
          notifications.showInAppNotification('נא לכתוב תשובה', 'error');
          return;
        }
        // בשאלות פתוחות - המשתמש מחליט
        this.showShortAnswerReview(userAnswer);
        return;
    }
    
    this.currentQuestion.answered = true;
    this.currentQuestion.correct = isCorrect;
    this.currentQuestion.userAnswer = userAnswer;
    
    this.updateStats(isCorrect);
    this.showResult(isCorrect);
  }

  showShortAnswerReview(userAnswer) {
    console.log('📝 showShortAnswerReview: Showing answer review...');
    
    const modal = document.getElementById('exam-practice-modal');
    if (!modal) return;
    
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="exam-question review-phase">
          <div class="question-type-badge">תשובה קצרה - סקירה</div>
          
          <div class="answer-comparison">
            <div class="user-answer-section">
              <h4>התשובה שלך:</h4>
              <div class="answer-box">${userAnswer}</div>
            </div>
            
            <div class="example-answer-section">
              <h4>תשובה לדוגמה:</h4>
              <div class="answer-box">${this.currentQuestion.questionData.exampleAnswer}</div>
            </div>
          </div>
          
          <div class="self-evaluation">
            <h4>איך היית מעריך את התשובה שלך?</h4>
            <div class="rating-options">
              <button class="btn btn-danger" onclick="examPractice.selfEvaluate(false)">
                לא נכונה
              </button>
              <button class="btn btn-secondary" onclick="examPractice.selfEvaluate('partial')">
                נכונה חלקית
              </button>
              <button class="btn btn-success" onclick="examPractice.selfEvaluate(true)">
                נכונה
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  selfEvaluate(rating) {
    console.log('⭐ selfEvaluate: User self-evaluated as:', rating);
    
    this.currentQuestion.answered = true;
    this.currentQuestion.userAnswer = 'self-evaluated';
    
    if (rating === true) {
      this.currentQuestion.correct = true;
      this.updateStats(true);
      this.showResult(true);
    } else if (rating === 'partial') {
      this.currentQuestion.correct = 'partial';
      this.updateStats(false); // נספור כשגויה לצורך סטטיסטיקה
      notifications.showInAppNotification('תשובה חלקית נרשמה', 'info');
      setTimeout(() => this.generateNewQuestion(), 1000);
    } else {
      this.currentQuestion.correct = false;
      this.updateStats(false);
      this.showResult(false);
    }
  }

  giveUp() {
    console.log('🏳️ giveUp: User gave up on question');
    
    this.currentQuestion.answered = true;
    this.currentQuestion.correct = false;
    this.currentQuestion.userAnswer = null;
    
    this.updateStats(false);
    this.showResult(false);
  }

  updateStats(isCorrect) {
    console.log('📊 updateStats: Updating statistics, correct:', isCorrect);
    
    this.stats.totalQuestions++;
    
    if (isCorrect) {
      this.stats.correctAnswers++;
    } else {
      this.stats.wrongAnswers++;
    }
    
    // סטטיסטיקות לפי מקצוע
    if (!this.stats.subjectStats[this.currentSubject.id]) {
      this.stats.subjectStats[this.currentSubject.id] = {
        total: 0,
        correct: 0,
        wrong: 0
      };
    }
    
    this.stats.subjectStats[this.currentSubject.id].total++;
    if (isCorrect) {
      this.stats.subjectStats[this.currentSubject.id].correct++;
    } else {
      this.stats.subjectStats[this.currentSubject.id].wrong++;
    }
    
    // שמירת השאלה להיסטוריה
    this.questionHistory.push(this.currentQuestion);
    
    // בדיקת ציון מושלם (5 שאלות ברצף נכונות)
    const recentQuestions = this.questionHistory.slice(-5);
    if (recentQuestions.length === 5 && recentQuestions.every(q => q.correct === true)) {
      this.stats.perfectScores++;
      
      // הישג
      if (typeof gamification !== 'undefined') {
        const achievement = {
          id: 'exam-perfect-score',
          name: 'ציון מושלם',
          description: 'קבל 100% בתרגול מבחן',
          icon: '💯',
          xp: 150
        };
        gamification.unlockAchievement(achievement);
      }
    }
    
    // עדכון גמיפיקציה
    if (typeof gamification !== 'undefined') {
      gamification.userStats.examQuestions = this.stats.totalQuestions;
      gamification.checkAchievements();
    }
    
    this.saveData();
  }

  showResult(isCorrect) {
    console.log('🎉 showResult: Showing result, correct:', isCorrect);
    
    const modal = document.getElementById('exam-practice-modal');
    if (!modal) return;
    
    const correctAnswer = this.getCorrectAnswerDisplay();
    
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="exam-question result-phase">
          <div class="result-indicator ${isCorrect ? 'correct' : 'wrong'}">
            ${isCorrect ? '✅ תשובה נכונה!' : '❌ תשובה שגויה'}
          </div>
          
          ${!isCorrect ? `
            <div class="correct-answer-display">
              <h4>התשובה הנכונה:</h4>
              <div class="answer-box">${correctAnswer}</div>
            </div>
          ` : ''}
          
          <div class="session-stats">
            <div class="stat-item">
              <div class="stat-value">${this.stats.subjectStats[this.currentSubject.id]?.correct || 0}</div>
              <div class="stat-label">נכונות</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.stats.subjectStats[this.currentSubject.id]?.wrong || 0}</div>
              <div class="stat-label">שגויות</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.calculateAccuracy()}%</div>
              <div class="stat-label">דיוק</div>
            </div>
          </div>
          
          <div class="exam-actions" style="margin-top: 2rem;">
            <button class="btn btn-primary" onclick="examPractice.generateNewQuestion()">
              שאלה הבאה
            </button>
            <button class="btn btn-secondary" onclick="examPractice.endPractice()">
              סיים תרגול
            </button>
          </div>
        </div>
      `;
    }
  }

  getCorrectAnswerDisplay() {
    const data = this.currentQuestion.questionData;
    
    switch (this.currentQuestion.type) {
      case 'multipleChoice':
        const correctIndex = parseInt(data.correctAnswer) - 1;
        return data.options[correctIndex];
        
      case 'trueFalse':
        return data.correctAnswer === 'true' ? 'נכון' : 'לא נכון';
        
      case 'fillBlank':
        return data.correctAnswer;
        
      case 'shortAnswer':
        return data.exampleAnswer;
        
      default:
        return '';
    }
  }

  calculateAccuracy() {
    const subjectStats = this.stats.subjectStats[this.currentSubject.id];
    if (!subjectStats || subjectStats.total === 0) return 0;
    
    return Math.round((subjectStats.correct / subjectStats.total) * 100);
  }

  getSessionProgress() {
    const subjectStats = this.stats.subjectStats[this.currentSubject.id];
    if (!subjectStats || subjectStats.total === 0) return 0;
    
    // פרוגרס בסיסי על 10 שאלות
    return Math.min((subjectStats.total / 10) * 100, 100);
  }

  skipQuestion() {
    console.log('⏭️ skipQuestion: Skipping current question');
    this.generateNewQuestion();
  }

  endPractice() {
    console.log('🏁 endPractice: Ending practice session');
    
    const modal = document.getElementById('exam-practice-modal');
    if (modal) {
      modal.remove();
    }
    
    const sessionStats = this.stats.subjectStats[this.currentSubject.id];
    if (sessionStats && sessionStats.total > 0) {
      const accuracy = this.calculateAccuracy();
      notifications.showInAppNotification(
        `תרגול הסתיים! דיוק: ${accuracy}% (${sessionStats.correct}/${sessionStats.total})`,
        'success'
      );
    }
    
    this.currentSubject = null;
    this.currentQuestion = null;
  }

  // ==================== ממשק משתמש ראשי ====================

  openExamPractice() {
    console.log('📝 openExamPractice: Opening exam practice menu...');
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'exam-practice-menu-modal';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>📝 תרגול מבחנים</h2>
          <button class="close-modal-btn" onclick="document.getElementById('exam-practice-menu-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        
        <div class="modal-body">
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
            בחר מקצוע לתרגול. המערכת תאפשר לך ליצור שאלות משלך ולתרגל ללא הגבלה.
          </p>
          
          <div class="exam-subjects-grid">
            ${this.renderSubjectsGrid()}
          </div>
          
          <div class="exam-overall-stats" style="margin-top: 2rem; padding: 1.5rem; background: var(--border-color); border-radius: 0.75rem;">
            <h3>סטטיסטיקה כללית</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${this.stats.totalQuestions}</div>
                <div class="stat-label">סך שאלות</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${this.stats.correctAnswers}</div>
                <div class="stat-label">נכונות</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${this.stats.wrongAnswers}</div>
                <div class="stat-label">שגויות</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${this.stats.totalQuestions > 0 ? Math.round((this.stats.correctAnswers / this.stats.totalQuestions) * 100) : 0}%</div>
                <div class="stat-label">דיוק כולל</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  renderSubjectsGrid() {
    if (this.subjects.length === 0) {
      return '<p class="empty-state">טרם הוספו מקצועות</p>';
    }
    
    return this.subjects.map(subject => {
      const stats = this.stats.subjectStats[subject.id];
      const accuracy = stats && stats.total > 0 
        ? Math.round((stats.correct / stats.total) * 100) 
        : 0;
      
      return `
        <div class="exam-subject-card" style="border-color: ${subject.color};" 
             onclick="examPractice.startPractice(${subject.id}); document.getElementById('exam-practice-menu-modal').remove();">
          <div class="subject-color-indicator" style="background: ${subject.color};"></div>
          <div class="subject-name">${subject.name}</div>
          ${stats ? `
            <div class="subject-stats-mini">
              <span>${stats.total} שאלות</span>
              <span>•</span>
              <span>${accuracy}% דיוק</span>
            </div>
          ` : '<div class="subject-stats-mini">לא תורגל עדיין</div>'}
        </div>
      `;
    }).join('');
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

console.log('✅ exam-practice.js: Loaded');
