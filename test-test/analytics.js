// Advanced Analytics Dashboard - דשבורד אנליטיקה מתקדם
class AnalyticsManager {
  constructor() {
    this.charts = {};
    this.analyticsData = {
      daily: [],
      weekly: [],
      monthly: [],
      subjects: {},
      productivity: [],
      completionRates: []
    };
    
    console.log('📊 AnalyticsManager: Initialized');
  }

  // ==================== איסוף נתונים ====================

  async collectData() {
    console.log('📊 collectData: Collecting analytics data...');
    
    try {
      // טעינת נתונים
      const homework = await storage.get('homework-list') || [];
      const subjects = await storage.get('homework-subjects') || [];
      const sessions = await storage.get('study-sessions-today') || { sessions: [] };
      
      console.log('📊 collectData: Data loaded', {
        homework: homework.length,
        subjects: subjects.length,
        sessions: sessions.sessions.length
      });

      // ניתוח יומי
      this.analyzeDailyData(homework);
      
      // ניתוח שבועי
      this.analyzeWeeklyData(homework);
      
      // ניתוח חודשי
      this.analyzeMonthlyData(homework);
      
      // ניתוח לפי מקצועות
      this.analyzeSubjectData(homework, subjects);
      
      // ניתוח פרודוקטיביות
      this.analyzeProductivity(homework, sessions.sessions);
      
      // ניתוח שיעור השלמה
      this.analyzeCompletionRates(homework);
      
      console.log('✅ collectData: Data collection complete');
    } catch (error) {
      console.error('❌ collectData: Error collecting data:', error);
    }
  }

  analyzeDailyData(homework) {
    console.log('📅 analyzeDailyData: Analyzing daily data...');
    
    const last30Days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayHomework = homework.filter(hw => hw.dueDate === dateStr);
      const completed = dayHomework.filter(hw => hw.completed).length;
      const pending = dayHomework.length - completed;
      
      last30Days.push({
        date: dateStr,
        total: dayHomework.length,
        completed,
        pending,
        completionRate: dayHomework.length > 0 ? (completed / dayHomework.length * 100) : 0
      });
    }
    
    this.analyticsData.daily = last30Days;
    console.log('✅ analyzeDailyData: Analysis complete');
  }

  analyzeWeeklyData(homework) {
    console.log('📅 analyzeWeeklyData: Analyzing weekly data...');
    
    const last12Weeks = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekHomework = homework.filter(hw => {
        const dueDate = new Date(hw.dueDate + 'T00:00:00');
        return dueDate >= weekStart && dueDate <= weekEnd;
      });
      
      const completed = weekHomework.filter(hw => hw.completed).length;
      
      last12Weeks.push({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        total: weekHomework.length,
        completed,
        pending: weekHomework.length - completed,
        completionRate: weekHomework.length > 0 ? (completed / weekHomework.length * 100) : 0
      });
    }
    
    this.analyticsData.weekly = last12Weeks;
    console.log('✅ analyzeWeeklyData: Analysis complete');
  }

  analyzeMonthlyData(homework) {
    console.log('📅 analyzeMonthlyData: Analyzing monthly data...');
    
    const last12Months = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      const monthHomework = homework.filter(hw => {
        const dueDate = new Date(hw.dueDate + 'T00:00:00');
        return dueDate >= monthStart && dueDate <= monthEnd;
      });
      
      const completed = monthHomework.filter(hw => hw.completed).length;
      
      last12Months.push({
        month: monthStart.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }),
        total: monthHomework.length,
        completed,
        pending: monthHomework.length - completed,
        completionRate: monthHomework.length > 0 ? (completed / monthHomework.length * 100) : 0
      });
    }
    
    this.analyticsData.monthly = last12Months;
    console.log('✅ analyzeMonthlyData: Analysis complete');
  }

  analyzeSubjectData(homework, subjects) {
    console.log('📚 analyzeSubjectData: Analyzing subject data...');
    
    const subjectStats = {};
    
    subjects.forEach(subject => {
      const subjectHomework = homework.filter(hw => hw.subject == subject.id);
      const completed = subjectHomework.filter(hw => hw.completed).length;
      const overdue = subjectHomework.filter(hw => 
        !hw.completed && new Date(hw.dueDate + 'T00:00:00') < new Date()
      ).length;
      
      subjectStats[subject.id] = {
        name: subject.name,
        color: subject.color,
        total: subjectHomework.length,
        completed,
        pending: subjectHomework.length - completed,
        overdue,
        completionRate: subjectHomework.length > 0 ? (completed / subjectHomework.length * 100) : 0,
        avgTimeToComplete: this.calculateAvgTimeToComplete(subjectHomework)
      };
    });
    
    this.analyticsData.subjects = subjectStats;
    console.log('✅ analyzeSubjectData: Analysis complete');
  }

  analyzeProductivity(homework, sessions) {
    console.log('⏰ analyzeProductivity: Analyzing productivity...');
    
    const productivityData = [];
    const hoursOfDay = Array(24).fill(0).map((_, i) => ({ hour: i, tasks: 0, studyTime: 0 }));
    
    // ניתוח לפי שעות ביום
    homework.forEach(hw => {
      if (hw.completed && hw.completedAt) {
        const hour = new Date(hw.completedAt).getHours();
        hoursOfDay[hour].tasks++;
      }
    });
    
    sessions.forEach(session => {
      if (session.timestamp) {
        const hour = new Date(session.timestamp).getHours();
        hoursOfDay[hour].studyTime += session.duration || 0;
      }
    });
    
    this.analyticsData.productivity = hoursOfDay;
    console.log('✅ analyzeProductivity: Analysis complete');
  }

  analyzeCompletionRates(homework) {
    console.log('📈 analyzeCompletionRates: Analyzing completion rates...');
    
    const priorities = {
      low: { total: 0, completed: 0 },
      medium: { total: 0, completed: 0 },
      high: { total: 0, completed: 0 }
    };
    
    homework.forEach(hw => {
      const priority = hw.priority || 'medium';
      priorities[priority].total++;
      if (hw.completed) {
        priorities[priority].completed++;
      }
    });
    
    this.analyticsData.completionRates = Object.keys(priorities).map(p => ({
      priority: p,
      total: priorities[p].total,
      completed: priorities[p].completed,
      rate: priorities[p].total > 0 ? (priorities[p].completed / priorities[p].total * 100) : 0
    }));
    
    console.log('✅ analyzeCompletionRates: Analysis complete');
  }

  calculateAvgTimeToComplete(tasks) {
    if (tasks.length === 0) return 0;
    
    let totalTime = 0;
    let count = 0;
    
    tasks.forEach(task => {
      if (task.completed && task.createdAt && task.completedAt) {
        const created = new Date(task.createdAt);
        const completed = new Date(task.completedAt);
        const days = Math.floor((completed - created) / (1000 * 60 * 60 * 24));
        totalTime += days;
        count++;
      }
    });
    
    return count > 0 ? Math.round(totalTime / count) : 0;
  }

  // ==================== גרפים ====================

  createDailyChart() {
    console.log('📊 createDailyChart: Creating daily chart...');
    
    const canvas = document.getElementById('analytics-daily-chart');
    if (!canvas) {
      console.warn('⚠️ createDailyChart: Canvas not found');
      return;
    }

    if (this.charts.daily) {
      this.charts.daily.destroy();
    }

    const labels = this.analyticsData.daily.map(d => 
      new Date(d.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
    );
    const completed = this.analyticsData.daily.map(d => d.completed);
    const pending = this.analyticsData.daily.map(d => d.pending);

    this.charts.daily = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'הושלמו',
            data: completed,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'ממתינים',
            data: pending,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: getComputedStyle(document.body).getPropertyValue('--text-primary')
            }
          },
          title: {
            display: true,
            text: 'פעילות ב-30 הימים האחרונים',
            color: getComputedStyle(document.body).getPropertyValue('--text-primary'),
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
            },
            grid: {
              color: getComputedStyle(document.body).getPropertyValue('--border-color')
            }
          },
          x: {
            ticks: {
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
            },
            grid: {
              display: false
            }
          }
        }
      }
    });

    console.log('✅ createDailyChart: Chart created');
  }

  createSubjectChart() {
    console.log('📊 createSubjectChart: Creating subject chart...');
    
    const canvas = document.getElementById('analytics-subject-chart');
    if (!canvas) {
      console.warn('⚠️ createSubjectChart: Canvas not found');
      return;
    }

    if (this.charts.subject) {
      this.charts.subject.destroy();
    }

    const subjects = Object.values(this.analyticsData.subjects);
    const labels = subjects.map(s => s.name);
    const data = subjects.map(s => s.total);
    const colors = subjects.map(s => s.color);

    this.charts.subject = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: getComputedStyle(document.body).getPropertyValue('--text-primary')
            }
          },
          title: {
            display: true,
            text: 'התפלגות משימות לפי מקצועות',
            color: getComputedStyle(document.body).getPropertyValue('--text-primary'),
            font: { size: 16, weight: 'bold' }
          }
        }
      }
    });

    console.log('✅ createSubjectChart: Chart created');
  }

  createProductivityChart() {
    console.log('📊 createProductivityChart: Creating productivity chart...');
    
    const canvas = document.getElementById('analytics-productivity-chart');
    if (!canvas) {
      console.warn('⚠️ createProductivityChart: Canvas not found');
      return;
    }

    if (this.charts.productivity) {
      this.charts.productivity.destroy();
    }

    const labels = this.analyticsData.productivity.map(h => `${h.hour}:00`);
    const tasks = this.analyticsData.productivity.map(h => h.tasks);

    this.charts.productivity = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'משימות שהושלמו',
          data: tasks,
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'פרודוקטיביות לפי שעות ביום',
            color: getComputedStyle(document.body).getPropertyValue('--text-primary'),
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
            },
            grid: {
              color: getComputedStyle(document.body).getPropertyValue('--border-color')
            }
          },
          x: {
            ticks: {
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
            },
            grid: {
              display: false
            }
          }
        }
      }
    });

    console.log('✅ createProductivityChart: Chart created');
  }

  createCompletionRateChart() {
    console.log('📊 createCompletionRateChart: Creating completion rate chart...');
    
    const canvas = document.getElementById('analytics-completion-chart');
    if (!canvas) {
      console.warn('⚠️ createCompletionRateChart: Canvas not found');
      return;
    }

    if (this.charts.completion) {
      this.charts.completion.destroy();
    }

    const labels = this.analyticsData.completionRates.map(r => {
      const names = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה' };
      return names[r.priority];
    });
    const rates = this.analyticsData.completionRates.map(r => r.rate);

    this.charts.completion = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'שיעור השלמה (%)',
          data: rates,
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderColor: ['#059669', '#d97706', '#dc2626'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'שיעור השלמה לפי עדיפות',
            color: getComputedStyle(document.body).getPropertyValue('--text-primary'),
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: value => value + '%',
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
            },
            grid: {
              color: getComputedStyle(document.body).getPropertyValue('--border-color')
            }
          },
          x: {
            ticks: {
              color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
            },
            grid: {
              display: false
            }
          }
        }
      }
    });

    console.log('✅ createCompletionRateChart: Chart created');
  }

  // ==================== רינדור ====================

  async renderAnalyticsDashboard() {
    console.log('🎨 renderAnalyticsDashboard: Rendering dashboard...');
    
    const panel = document.getElementById('analytics-panel');
    if (!panel) {
      console.warn('⚠️ renderAnalyticsDashboard: Panel not found');
      return;
    }

    await this.collectData();

    // סטטיסטיקות מרכזיות
    const totalTasks = await this.getTotalTasks();
    const completionRate = await this.getOverallCompletionRate();
    const avgTimeToComplete = await this.getAvgTimeToComplete();
    const mostProductiveHour = this.getMostProductiveHour();

    panel.innerHTML = `
      <h2>📊 דשבורד אנליטיקה מתקדם</h2>
      
      <div class="analytics-summary">
        <div class="analytics-summary-card">
          <div class="summary-icon">📝</div>
          <div class="summary-value">${totalTasks}</div>
          <div class="summary-label">סה"כ משימות</div>
        </div>
        <div class="analytics-summary-card">
          <div class="summary-icon">✅</div>
          <div class="summary-value">${completionRate}%</div>
          <div class="summary-label">שיעור השלמה</div>
        </div>
        <div class="analytics-summary-card">
          <div class="summary-icon">⏱️</div>
          <div class="summary-value">${avgTimeToComplete}</div>
          <div class="summary-label">ממוצע ימים להשלמה</div>
        </div>
        <div class="analytics-summary-card">
          <div class="summary-icon">🌟</div>
          <div class="summary-value">${mostProductiveHour}:00</div>
          <div class="summary-label">שעה הכי פרודוקטיבית</div>
        </div>
      </div>

      <div class="analytics-charts-grid">
        <div class="analytics-chart-wrapper">
          <canvas id="analytics-daily-chart"></canvas>
        </div>
        <div class="analytics-chart-wrapper">
          <canvas id="analytics-subject-chart"></canvas>
        </div>
        <div class="analytics-chart-wrapper">
          <canvas id="analytics-productivity-chart"></canvas>
        </div>
        <div class="analytics-chart-wrapper">
          <canvas id="analytics-completion-chart"></canvas>
        </div>
      </div>

      <div class="analytics-insights">
        <h3>💡 תובנות</h3>
        ${this.generateInsights()}
      </div>
    `;

    // יצירת גרפים
    setTimeout(() => {
      this.createDailyChart();
      this.createSubjectChart();
      this.createProductivityChart();
      this.createCompletionRateChart();
    }, 100);

    console.log('✅ renderAnalyticsDashboard: Dashboard rendered');
  }

  async getTotalTasks() {
    const homework = await storage.get('homework-list') || [];
    return homework.length;
  }

  async getOverallCompletionRate() {
    const homework = await storage.get('homework-list') || [];
    if (homework.length === 0) return 0;
    const completed = homework.filter(hw => hw.completed).length;
    return Math.round((completed / homework.length) * 100);
  }

  async getAvgTimeToComplete() {
    const homework = await storage.get('homework-list') || [];
    return this.calculateAvgTimeToComplete(homework);
  }

  getMostProductiveHour() {
    if (this.analyticsData.productivity.length === 0) return 0;
    
    let maxTasks = 0;
    let maxHour = 0;
    
    this.analyticsData.productivity.forEach(h => {
      if (h.tasks > maxTasks) {
        maxTasks = h.tasks;
        maxHour = h.hour;
      }
    });
    
    return maxHour;
  }

  generateInsights() {
    const insights = [];
    
    // תובנה על מקצוע עם הכי הרבה משימות
    const subjects = Object.values(this.analyticsData.subjects);
    if (subjects.length > 0) {
      const maxSubject = subjects.reduce((max, s) => s.total > max.total ? s : max);
      insights.push(`
        <div class="insight-item">
          <span class="insight-icon">📚</span>
          <span>המקצוע עם הכי הרבה משימות הוא <strong>${maxSubject.name}</strong> עם ${maxSubject.total} משימות</span>
        </div>
      `);
    }
    
    // תובנה על רצף
    if (gamification && gamification.userStats) {
      const streak = gamification.userStats.streak;
      if (streak > 0) {
        insights.push(`
          <div class="insight-item">
            <span class="insight-icon">🔥</span>
            <span>אתה ב-streak של <strong>${streak} ימים</strong>! המשך כך!</span>
          </div>
        `);
      }
    }
    
    // תובנה על פרודוקטיביות
    const mostProductiveHour = this.getMostProductiveHour();
    insights.push(`
      <div class="insight-item">
        <span class="insight-icon">⏰</span>
        <span>השעה הכי פרודוקטיבית שלך היא <strong>${mostProductiveHour}:00</strong></span>
      </div>
    `);
    
    return insights.join('');
  }
}

// יצירת אובייקט גלובלי
console.log('📊 Creating global analytics manager...');
const analytics = new AnalyticsManager();
console.log('✅ Global analytics manager created');

// אתחול
window.addEventListener('DOMContentLoaded', async () => {
  console.log('📊 analytics.js: Initializing...');
  
  const panel = document.getElementById('analytics-panel');
  if (panel) {
    await analytics.renderAnalyticsDashboard();
  }
  
  console.log('✅ analytics.js: Initialized');
});
