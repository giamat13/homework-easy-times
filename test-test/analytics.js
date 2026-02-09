// Advanced Analytics Manager - מנהל אנליטיקה מתקדם
class AnalyticsManager {
  constructor() {
    this.charts = {};
    console.log('📊 AnalyticsManager: Initialized');
  }

  // פתיחת דשבורד האנליטיקה
  openDashboard() {
    console.log('📊 openDashboard: Opening analytics dashboard...');
    
    const modal = document.createElement('div');
    modal.className = 'modal analytics-modal';
    modal.id = 'analytics-modal';
    
    const stats = this.calculateDetailedStats();
    const trends = this.calculateTrends();
    const productivity = this.calculateProductivity();
    
    modal.innerHTML = `
      <div class="modal-content analytics-content">
        <div class="modal-header">
          <h2>📊 דשבורד אנליטיקה מתקדם</h2>
          <button class="close-modal-btn" onclick="analytics.closeDashboard()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        
        <div class="modal-body analytics-body">
          <!-- סטטיסטיקות כלליות -->
          <div class="analytics-section">
            <h3>📈 סטטיסטיקות כלליות</h3>
            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-icon">📚</div>
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">סך הכל משימות</div>
              </div>
              <div class="stat-box green">
                <div class="stat-icon">✅</div>
                <div class="stat-value">${stats.completed}</div>
                <div class="stat-label">הושלמו</div>
                <div class="stat-percent">${stats.completionRate}%</div>
              </div>
              <div class="stat-box orange">
                <div class="stat-icon">⏳</div>
                <div class="stat-value">${stats.pending}</div>
                <div class="stat-label">ממתינים</div>
              </div>
              <div class="stat-box red">
                <div class="stat-icon">🔥</div>
                <div class="stat-value">${stats.urgent}</div>
                <div class="stat-label">דחופים</div>
              </div>
              <div class="stat-box purple">
                <div class="stat-icon">📅</div>
                <div class="stat-value">${stats.thisWeek}</div>
                <div class="stat-label">השבוע</div>
              </div>
              <div class="stat-box blue">
                <div class="stat-icon">📆</div>
                <div class="stat-value">${stats.thisMonth}</div>
                <div class="stat-label">החודש</div>
              </div>
            </div>
          </div>

          <!-- מגמות -->
          <div class="analytics-section">
            <h3>📉 מגמות ותובנות</h3>
            <div class="trends-grid">
              <div class="trend-card ${trends.completionTrend > 0 ? 'positive' : 'negative'}">
                <div class="trend-header">
                  <span class="trend-title">שיעור השלמה</span>
                  <span class="trend-arrow">${trends.completionTrend > 0 ? '📈' : '📉'}</span>
                </div>
                <div class="trend-value">${Math.abs(trends.completionTrend)}%</div>
                <div class="trend-label">${trends.completionTrend > 0 ? 'שיפור' : 'ירידה'} לעומת השבוע שעבר</div>
              </div>
              
              <div class="trend-card ${trends.onTimeTrend > 0 ? 'positive' : 'negative'}">
                <div class="trend-header">
                  <span class="trend-title">הגשה בזמן</span>
                  <span class="trend-arrow">${trends.onTimeTrend > 0 ? '📈' : '📉'}</span>
                </div>
                <div class="trend-value">${Math.abs(trends.onTimeTrend)}%</div>
                <div class="trend-label">${trends.onTimeTrend > 0 ? 'שיפור' : 'ירידה'} בהגשות בזמן</div>
              </div>
              
              <div class="trend-card info">
                <div class="trend-header">
                  <span class="trend-title">ממוצע יומי</span>
                  <span class="trend-arrow">📊</span>
                </div>
                <div class="trend-value">${trends.avgPerDay.toFixed(1)}</div>
                <div class="trend-label">משימות ליום</div>
              </div>
            </div>
          </div>

          <!-- פרודוקטיביות -->
          <div class="analytics-section">
            <h3>⚡ פרודוקטיביות</h3>
            <div class="productivity-grid">
              <div class="productivity-card">
                <h4>🏆 היום הכי פרודוקטיבי</h4>
                <div class="productivity-value">${productivity.bestDay}</div>
                <div class="productivity-detail">${productivity.bestDayCount} משימות הושלמו</div>
              </div>
              
              <div class="productivity-card">
                <h4>📚 המקצוע הכי פעיל</h4>
                <div class="productivity-value">${productivity.mostActiveSubject}</div>
                <div class="productivity-detail">${productivity.mostActiveCount} משימות</div>
              </div>
              
              <div class="productivity-card">
                <h4>⏱️ זמן ממוצע להשלמה</h4>
                <div class="productivity-value">${productivity.avgCompletionTime}</div>
                <div class="productivity-detail">ימים בממוצע</div>
              </div>
            </div>
          </div>

          <!-- גרפים -->
          <div class="analytics-section">
            <h3>📊 גרפים מתקדמים</h3>
            <div class="charts-advanced-grid">
              <div class="chart-container">
                <h4>השלמות לפי חודש</h4>
                <canvas id="completion-timeline-chart"></canvas>
              </div>
              
              <div class="chart-container">
                <h4>ביצועים לפי מקצוע</h4>
                <canvas id="subject-performance-chart"></canvas>
              </div>
              
              <div class="chart-container">
                <h4>התפלגות לפי עדיפות</h4>
                <canvas id="priority-distribution-chart"></canvas>
              </div>
              
              <div class="chart-container">
                <h4>משימות לפי יום בשבוע</h4>
                <canvas id="weekday-distribution-chart"></canvas>
              </div>
            </div>
          </div>

          <!-- תובנות מותאמות אישית -->
          <div class="analytics-section">
            <h3>💡 תובנות והמלצות</h3>
            <div class="insights-container">
              ${this.generateInsights(stats, trends, productivity).map(insight => `
                <div class="insight-card ${insight.type}">
                  <div class="insight-icon">${insight.icon}</div>
                  <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.message}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // סגירה בלחיצה על הרקע
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeDashboard();
      }
    });
    
    // יצירת הגרפים המתקדמים
    setTimeout(() => this.renderAdvancedCharts(stats), 100);
    
    console.log('✅ openDashboard: Dashboard opened');
  }

  // סגירת הדשבורד
  closeDashboard() {
    const modal = document.getElementById('analytics-modal');
    if (modal) {
      // הרס גרפים
      Object.values(this.charts).forEach(chart => {
        if (chart) chart.destroy();
      });
      this.charts = {};
      
      modal.remove();
      console.log('✅ closeDashboard: Dashboard closed');
    }
  }

  // חישוב סטטיסטיקות מפורטות
  calculateDetailedStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const stats = {
      total: homework.length,
      completed: homework.filter(h => h.completed).length,
      pending: homework.filter(h => !h.completed).length,
      urgent: homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) <= 2 && getDaysUntilDue(h.dueDate) >= 0).length,
      overdue: homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) < 0).length,
      thisWeek: homework.filter(h => new Date(h.dueDate) >= weekAgo).length,
      thisMonth: homework.filter(h => new Date(h.dueDate) >= monthAgo).length,
      completionRate: homework.length > 0 ? Math.round((homework.filter(h => h.completed).length / homework.length) * 100) : 0
    };
    
    return stats;
  }

  // חישוב מגמות
  calculateTrends() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const thisWeek = homework.filter(h => new Date(h.dueDate) >= weekAgo);
    const lastWeek = homework.filter(h => {
      const date = new Date(h.dueDate);
      return date >= twoWeeksAgo && date < weekAgo;
    });
    
    const thisWeekCompleted = thisWeek.filter(h => h.completed).length;
    const lastWeekCompleted = lastWeek.filter(h => h.completed).length;
    
    const thisWeekOnTime = thisWeek.filter(h => h.completed && getDaysUntilDue(h.dueDate) >= 0).length;
    const lastWeekOnTime = lastWeek.filter(h => h.completed && getDaysUntilDue(h.dueDate) >= 0).length;
    
    const completionTrend = lastWeek.length > 0 
      ? Math.round(((thisWeekCompleted / thisWeek.length) - (lastWeekCompleted / lastWeek.length)) * 100)
      : 0;
    
    const onTimeTrend = lastWeek.length > 0
      ? Math.round(((thisWeekOnTime / thisWeek.length) - (lastWeekOnTime / lastWeek.length)) * 100)
      : 0;
    
    const avgPerDay = homework.length > 0 ? (homework.length / 30) : 0;
    
    return {
      completionTrend,
      onTimeTrend,
      avgPerDay
    };
  }

  // חישוב פרודוקטיביות
  calculateProductivity() {
    // היום הכי פרודוקטיבי
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dayCount = {};
    
    homework.filter(h => h.completed).forEach(h => {
      const day = new Date(h.dueDate).getDay();
      dayCount[day] = (dayCount[day] || 0) + 1;
    });
    
    let bestDay = 'ראשון';
    let bestDayCount = 0;
    Object.entries(dayCount).forEach(([day, count]) => {
      if (count > bestDayCount) {
        bestDayCount = count;
        bestDay = dayNames[day];
      }
    });
    
    // המקצוע הכי פעיל
    const subjectCount = {};
    homework.forEach(h => {
      subjectCount[h.subject] = (subjectCount[h.subject] || 0) + 1;
    });
    
    let mostActiveSubject = 'אין';
    let mostActiveCount = 0;
    Object.entries(subjectCount).forEach(([subjectId, count]) => {
      if (count > mostActiveCount) {
        mostActiveCount = count;
        const subject = subjects.find(s => s.id == subjectId);
        mostActiveSubject = subject ? subject.name : 'לא ידוע';
      }
    });
    
    // זמן ממוצע להשלמה
    const completedHomework = homework.filter(h => h.completed);
    let totalDays = 0;
    completedHomework.forEach(h => {
      const created = new Date(h.id);
      const due = new Date(h.dueDate);
      const days = Math.max(0, Math.floor((due - created) / (1000 * 60 * 60 * 24)));
      totalDays += days;
    });
    
    const avgCompletionTime = completedHomework.length > 0 
      ? (totalDays / completedHomework.length).toFixed(1)
      : 0;
    
    return {
      bestDay,
      bestDayCount,
      mostActiveSubject,
      mostActiveCount,
      avgCompletionTime
    };
  }

  // יצירת תובנות אוטומטיות
  generateInsights(stats, trends, productivity) {
    const insights = [];
    
    if (stats.completionRate >= 80) {
      insights.push({
        type: 'success',
        icon: '🎉',
        title: 'ביצועים מצוינים!',
        message: `אתה משלים ${stats.completionRate}% מהמשימות שלך. המשך כך!`
      });
    } else if (stats.completionRate < 50) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'זקוק לשיפור',
        message: `שיעור ההשלמה שלך הוא ${stats.completionRate}%. נסה לתעדף משימות חשובות.`
      });
    }
    
    if (stats.urgent > 5) {
      insights.push({
        type: 'danger',
        icon: '🔥',
        title: 'משימות דחופות רבות!',
        message: `יש לך ${stats.urgent} משימות דחופות. התמקד בהן תחילה.`
      });
    }
    
    if (trends.completionTrend > 10) {
      insights.push({
        type: 'success',
        icon: '📈',
        title: 'מגמת שיפור חיובית!',
        message: `שיפור של ${trends.completionTrend}% בהשלמות לעומת השבוע שעבר.`
      });
    }
    
    insights.push({
      type: 'info',
      icon: '💡',
      title: 'טיפ לפרודוקטיביות',
      message: `יום ${productivity.bestDay} הוא היום הכי פרודוקטיבי שלך עם ${productivity.bestDayCount} משימות שהושלמו.`
    });
    
    const subjectsWithHomework = [...new Set(homework.map(h => h.subject))];
    if (subjectsWithHomework.length < subjects.length / 2) {
      insights.push({
        type: 'info',
        icon: '⚖️',
        title: 'איזון בין מקצועות',
        message: 'חלק מהמקצועות שלך לא מיוצגים במשימות. וודא שאתה עוקב אחרי כולם.'
      });
    }
    
    return insights;
  }

  // רינדור גרפים מתקדמים
  renderAdvancedCharts(stats) {
    console.log('📊 renderAdvancedCharts: Rendering advanced charts...');
    
    this.renderCompletionTimeline();
    this.renderSubjectPerformance();
    this.renderPriorityDistribution();
    this.renderWeekdayDistribution();
    
    console.log('✅ renderAdvancedCharts: All charts rendered');
  }

  renderCompletionTimeline() {
    const ctx = document.getElementById('completion-timeline-chart');
    if (!ctx) return;
    
    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const now = new Date();
    const labels = [];
    const completedData = [];
    const totalData = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      labels.push(monthNames[monthDate.getMonth()]);
      
      const monthHomework = homework.filter(h => {
        const dueDate = new Date(h.dueDate);
        return dueDate >= monthStart && dueDate <= monthEnd;
      });
      
      totalData.push(monthHomework.length);
      completedData.push(monthHomework.filter(h => h.completed).length);
    }
    
    this.charts.timeline = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'הושלמו',
            data: completedData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'סך הכל',
            data: totalData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }

  renderSubjectPerformance() {
    const ctx = document.getElementById('subject-performance-chart');
    if (!ctx) return;
    
    const subjectStats = {};
    subjects.forEach(s => {
      const subjectHomework = homework.filter(h => h.subject == s.id);
      const completed = subjectHomework.filter(h => h.completed).length;
      const total = subjectHomework.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      if (total > 0) {
        subjectStats[s.name] = { rate, color: s.color, total };
      }
    });
    
    const labels = Object.keys(subjectStats);
    const data = Object.values(subjectStats).map(s => s.rate);
    const colors = Object.values(subjectStats).map(s => s.color);
    
    this.charts.performance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'שיעור השלמה (%)',
          data,
          backgroundColor: colors.map(c => c + '80'),
          borderColor: colors,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: (value) => value + '%' }
          }
        }
      }
    });
  }

  renderPriorityDistribution() {
    const ctx = document.getElementById('priority-distribution-chart');
    if (!ctx) return;
    
    const priorities = {
      high: homework.filter(h => h.priority === 'high').length,
      medium: homework.filter(h => h.priority === 'medium').length,
      low: homework.filter(h => h.priority === 'low').length
    };
    
    this.charts.priority = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['גבוהה', 'בינונית', 'נמוכה'],
        datasets: [{
          data: [priorities.high, priorities.medium, priorities.low],
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  renderWeekdayDistribution() {
    const ctx = document.getElementById('weekday-distribution-chart');
    if (!ctx) return;
    
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    
    homework.forEach(h => {
      const day = new Date(h.dueDate).getDay();
      dayCounts[day]++;
    });
    
    this.charts.weekday = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: dayNames,
        datasets: [{
          label: 'משימות לפי יום',
          data: dayCounts,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#3b82f6',
          borderWidth: 2,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#3b82f6'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          r: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }
}

console.log('📊 Creating global analytics manager...');
const analytics = new AnalyticsManager();
console.log('✅ Global analytics manager created');
