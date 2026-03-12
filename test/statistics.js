// Unified Statistics & Analytics Manager - מערכת סטטיסטיקה ואנליטיקה משולבת
// ================================================================================
// 📊 משלב את הסטטיסטיקות הבסיסיות עם האנליטיקה המתקדמת למודול אחד מקיף

class UnifiedStatisticsManager {
  constructor() {
    this.charts = {};
    this.analyticsData = {
      daily: [],
      weekly: [],
      monthly: [],
      subjects: {},
      productivity: [],
      completionRates: [],
      trends: {}
    };
    
    console.log('📊 UnifiedStatisticsManager: Initialized');
  }

  // ==================== איסוף נתונים ====================

  async collectAllData() {
    console.log('📊 collectAllData: Collecting all statistics...');
    
    try {
      // טעינת נתונים
      const homework = await storage.get('homework-list') || [];
      const subjects = await storage.get('homework-subjects') || [];
      const sessions = await storage.get('study-sessions-today') || { sessions: [] };
      
      console.log('📊 collectAllData: Data loaded', {
        homework: homework.length,
        subjects: subjects.length,
        sessions: sessions.sessions.length
      });

      // ניתוחים שונים
      this.analyzeBasicStats(homework);
      this.analyzeDailyData(homework);
      this.analyzeWeeklyData(homework);
      this.analyzeMonthlyData(homework);
      this.analyzeSubjectData(homework, subjects);
      this.analyzeProductivity(homework, sessions.sessions);
      this.analyzeCompletionRates(homework);
      this.analyzeTrends(homework);
      
      console.log('✅ collectAllData: All data collected successfully');
      return {
        homework,
        subjects,
        sessions
      };
    } catch (error) {
      console.error('❌ collectAllData: Error collecting data:', error);
      return null;
    }
  }

  // ניתוח סטטיסטיקות בסיסיות
  analyzeBasicStats(homework) {
    console.log('📊 analyzeBasicStats: Analyzing basic stats...');
    
    const total = homework.length;
    const completed = homework.filter(h => h.completed).length;
    const pending = homework.filter(h => !h.completed).length;
    const urgent = homework.filter(h => !h.completed && this.getDaysUntilDue(h.dueDate) <= 2).length;
    const overdue = homework.filter(h => !h.completed && this.getDaysUntilDue(h.dueDate) < 0).length;
    
    this.analyticsData.basic = {
      total,
      completed,
      pending,
      urgent,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
    
    console.log('✅ analyzeBasicStats: Basic stats analyzed:', this.analyticsData.basic);
  }

  // ניתוח יומי
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
    console.log('✅ analyzeDailyData: Daily data analyzed');
  }

  // ניתוח שבועי
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
    console.log('✅ analyzeWeeklyData: Weekly data analyzed');
  }

  // ניתוח חודשי
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
    console.log('✅ analyzeMonthlyData: Monthly data analyzed');
  }

  // ניתוח לפי מקצועות
  analyzeSubjectData(homework, subjects) {
    console.log('📚 analyzeSubjectData: Analyzing subject data...');
    
    const subjectStats = {};
    
    subjects.forEach(subject => {
      const subjectHomework = homework.filter(hw => hw.subject == subject.id);
      const completed = subjectHomework.filter(hw => hw.completed).length;
      const overdue = subjectHomework.filter(hw => 
        !hw.completed && this.getDaysUntilDue(hw.dueDate) < 0
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
    console.log('✅ analyzeSubjectData: Subject data analyzed');
  }

  // ניתוח פרודוקטיביות
  analyzeProductivity(homework, sessions) {
    console.log('⏰ analyzeProductivity: Analyzing productivity...');
    
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
    console.log('✅ analyzeProductivity: Productivity analyzed');
  }

  // ניתוח שיעור השלמה
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
    
    console.log('✅ analyzeCompletionRates: Completion rates analyzed');
  }

  // ניתוח מגמות
  analyzeTrends(homework) {
    console.log('📈 analyzeTrends: Analyzing trends...');
    
    const last7Days = this.analyticsData.daily.slice(-7);
    const prev7Days = this.analyticsData.daily.slice(-14, -7);
    
    const currentWeekTotal = last7Days.reduce((sum, day) => sum + day.total, 0);
    const prevWeekTotal = prev7Days.reduce((sum, day) => sum + day.total, 0);
    
    const currentWeekCompleted = last7Days.reduce((sum, day) => sum + day.completed, 0);
    const prevWeekCompleted = prev7Days.reduce((sum, day) => sum + day.completed, 0);
    
    this.analyticsData.trends = {
      tasksChange: prevWeekTotal > 0 ? 
        Math.round(((currentWeekTotal - prevWeekTotal) / prevWeekTotal) * 100) : 0,
      completionChange: prevWeekCompleted > 0 ? 
        Math.round(((currentWeekCompleted - prevWeekCompleted) / prevWeekCompleted) * 100) : 0,
      trend: currentWeekTotal > prevWeekTotal ? 'up' : currentWeekTotal < prevWeekTotal ? 'down' : 'stable'
    };
    
    console.log('✅ analyzeTrends: Trends analyzed:', this.analyticsData.trends);
  }

  // ==================== גרפים ====================

  createCompletionChart() {
    console.log('📊 createCompletionChart: Creating completion doughnut chart...');
    
    const canvas = document.getElementById('completion-chart');
    if (!canvas) {
      console.warn('⚠️ createCompletionChart: Canvas not found');
      return;
    }

    if (this.charts.completion) {
      this.charts.completion.destroy();
    }

    const stats = this.analyticsData.basic;
    
    this.charts.completion = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['הושלמו', 'ממתינים', 'דחוף', 'באיחור'],
        datasets: [{
          data: [stats.completed, stats.pending - stats.urgent - stats.overdue, stats.urgent, stats.overdue],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#dc2626'],
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
              font: { family: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif', size: 12 },
              color: getComputedStyle(document.body).getPropertyValue('--text-primary')
            }
          },
          title: {
            display: true,
            text: 'סטטוס משימות',
            font: { size: 16, weight: 'bold' },
            color: getComputedStyle(document.body).getPropertyValue('--text-primary')
          }
        }
      }
    });

    console.log('✅ createCompletionChart: Chart created');
  }

  createSubjectChart() {
    console.log('📊 createSubjectChart: Creating subject bar chart...');
    
    const canvas = document.getElementById('subject-chart');
    if (!canvas) {
      console.warn('⚠️ createSubjectChart: Canvas not found');
      return;
    }

    if (this.charts.subject) {
      this.charts.subject.destroy();
    }

    const subjects = Object.values(this.analyticsData.subjects)
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);
    
    const labels = subjects.map(s => s.name);
    const data = subjects.map(s => s.total);
    const colors = subjects.map(s => s.color + '80');
    const borderColors = subjects.map(s => s.color);

    this.charts.subject = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'משימות לפי מקצוע',
          data,
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
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
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'משימות לפי מקצוע',
            font: { size: 16, weight: 'bold' },
            color: getComputedStyle(document.body).getPropertyValue('--text-primary')
          }
        }
      }
    });

    console.log('✅ createSubjectChart: Chart created');
  }

  createDailyTrendChart() {
    console.log('📊 createDailyTrendChart: Creating daily trend chart...');
    
    const canvas = document.getElementById('daily-trend-chart');
    if (!canvas) return;

    if (this.charts.dailyTrend) {
      this.charts.dailyTrend.destroy();
    }

    const labels = this.analyticsData.daily.map(d => 
      new Date(d.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
    );
    const completed = this.analyticsData.daily.map(d => d.completed);
    const pending = this.analyticsData.daily.map(d => d.pending);

    this.charts.dailyTrend = new Chart(canvas, {
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
            text: 'מגמה יומית - 30 ימים',
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
            grid: { display: false }
          }
        }
      }
    });

    console.log('✅ createDailyTrendChart: Chart created');
  }

  createProductivityChart() {
    console.log('📊 createProductivityChart: Creating productivity chart...');
    
    const canvas = document.getElementById('productivity-chart');
    if (!canvas) return;

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
          legend: { display: false },
          title: {
            display: true,
            text: 'פרודוקטיביות לפי שעות',
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
            grid: { display: false }
          }
        }
      }
    });

    console.log('✅ createProductivityChart: Chart created');
  }

  // ==================== רינדור ממשק ====================

  async renderUnifiedDashboard() {
    console.log('🎨 renderUnifiedDashboard: Rendering unified dashboard...');
    
    const panel = document.getElementById('statistics-panel');
    if (!panel) {
      console.warn('⚠️ renderUnifiedDashboard: Panel not found');
      return;
    }

    // איסוף נתונים
    await this.collectAllData();
    
    const stats = this.analyticsData.basic;
    const trends = this.analyticsData.trends;
    const subjects = Object.values(this.analyticsData.subjects);
    const topSubject = subjects.sort((a, b) => b.total - a.total)[0];
    const mostProductiveHour = this.getMostProductiveHour();

    panel.innerHTML = `
      <h2>📊 סטטיסטיקות ואנליטיקה</h2>
      
      <!-- Summary Cards -->
      <div class="analytics-summary">
        <div class="analytics-summary-card">
          <div class="summary-icon">📝</div>
          <div class="summary-value">${stats.total}</div>
          <div class="summary-label">סה"כ משימות</div>
          ${trends.tasksChange !== 0 ? `
            <div class="summary-trend ${trends.tasksChange > 0 ? 'up' : 'down'}">
              ${trends.tasksChange > 0 ? '↑' : '↓'} ${Math.abs(trends.tasksChange)}% השבוע
            </div>
          ` : ''}
        </div>
        
        <div class="analytics-summary-card">
          <div class="summary-icon">✅</div>
          <div class="summary-value">${stats.completionRate}%</div>
          <div class="summary-label">שיעור השלמה</div>
          ${trends.completionChange !== 0 ? `
            <div class="summary-trend ${trends.completionChange > 0 ? 'up' : 'down'}">
              ${trends.completionChange > 0 ? '↑' : '↓'} ${Math.abs(trends.completionChange)}% השבוע
            </div>
          ` : ''}
        </div>
        
        <div class="analytics-summary-card">
          <div class="summary-icon">📚</div>
          <div class="summary-value">${topSubject ? topSubject.name : '-'}</div>
          <div class="summary-label">מקצוע מוביל</div>
          ${topSubject ? `<div class="summary-detail">${topSubject.total} משימות</div>` : ''}
        </div>
        
        <div class="analytics-summary-card">
          <div class="summary-icon">🌟</div>
          <div class="summary-value">${mostProductiveHour}:00</div>
          <div class="summary-label">שעה פרודוקטיבית</div>
        </div>
      </div>

      <!-- Main Charts Grid -->
      <div class="charts-grid">
        <div class="chart-wrapper">
          <canvas id="completion-chart"></canvas>
        </div>
        <div class="chart-wrapper">
          <canvas id="subject-chart"></canvas>
        </div>
      </div>

      <!-- Advanced Charts -->
      <div class="advanced-charts">
        <div class="chart-wrapper-large">
          <canvas id="daily-trend-chart"></canvas>
        </div>
        <div class="chart-wrapper">
          <canvas id="productivity-chart"></canvas>
        </div>
      </div>

      <!-- Insights Section -->
      <div class="analytics-insights">
        <h3>💡 תובנות</h3>
        ${this.generateInsights()}
      </div>

    `;

    // יצירת גרפים
    setTimeout(() => {
      this.createCompletionChart();
      this.createSubjectChart();
      this.createDailyTrendChart();
      this.createProductivityChart();
    }, 100);

    console.log('✅ renderUnifiedDashboard: Dashboard rendered');
  }

  // ==================== עזרים ====================

  getDaysUntilDue(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + 'T00:00:00');
    return Math.round((due - today) / (1000 * 60 * 60 * 24));
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

  getMostProductiveHour() {
    if (!this.analyticsData.productivity || this.analyticsData.productivity.length === 0) return 0;
    
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
    const stats = this.analyticsData.basic;
    const subjects = Object.values(this.analyticsData.subjects);
    const trends = this.analyticsData.trends;
    
    // תובנה על ביצועים
    if (stats.completionRate >= 80) {
      insights.push(`
        <div class="insight-item success">
          <span class="insight-icon">🎉</span>
          <span>ביצועים מעולים! שיעור השלמה של ${stats.completionRate}%</span>
        </div>
      `);
    } else if (stats.completionRate < 50) {
      insights.push(`
        <div class="insight-item warning">
          <span class="insight-icon">⚠️</span>
          <span>שיעור השלמה נמוך (${stats.completionRate}%) - כדאי להתמקד בסיום משימות</span>
        </div>
      `);
    }
    
    // תובנה על משימות דחופות
    if (stats.urgent > 0) {
      insights.push(`
        <div class="insight-item warning">
          <span class="insight-icon">🔥</span>
          <span>יש ${stats.urgent} משימות דחופות הדורשות תשומת לב מיידית</span>
        </div>
      `);
    }
    
    // תובנה על איחורים
    if (stats.overdue > 0) {
      insights.push(`
        <div class="insight-item danger">
          <span class="insight-icon">⚠️</span>
          <span>${stats.overdue} משימות באיחור - כדאי לטפל בהן בהקדם</span>
        </div>
      `);
    }
    
    // תובנה על מקצוע
    if (subjects.length > 0) {
      const maxSubject = subjects.reduce((max, s) => s.total > max.total ? s : max);
      if (maxSubject.total > 0) {
        insights.push(`
          <div class="insight-item info">
            <span class="insight-icon">📚</span>
            <span>המקצוע עם הכי הרבה משימות הוא <strong>${maxSubject.name}</strong> (${maxSubject.total} משימות)</span>
          </div>
        `);
      }
    }
    
    // תובנה על מגמה
    if (trends.trend === 'up') {
      insights.push(`
        <div class="insight-item info">
          <span class="insight-icon">📈</span>
          <span>מגמת עלייה במספר המשימות - ${Math.abs(trends.tasksChange)}% יותר מהשבוע שעבר</span>
        </div>
      `);
    } else if (trends.trend === 'down') {
      insights.push(`
        <div class="insight-item success">
          <span class="insight-icon">📉</span>
          <span>מגמת ירידה במספר המשימות - ${Math.abs(trends.tasksChange)}% פחות מהשבוע שעבר</span>
        </div>
      `);
    }
    
    // תובנה על פרודוקטיביות
    const mostProductiveHour = this.getMostProductiveHour();
    if (mostProductiveHour > 0) {
      insights.push(`
        <div class="insight-item info">
          <span class="insight-icon">⏰</span>
          <span>השעה הכי פרודוקטיבית שלך היא <strong>${mostProductiveHour}:00</strong></span>
        </div>
      `);
    }
    
    // תובנה על גמיפיקציה
    if (typeof gamification !== 'undefined' && gamification.userStats) {
      const streak = gamification.userStats.streak;
      if (streak > 0) {
        insights.push(`
          <div class="insight-item success">
            <span class="insight-icon">🔥</span>
            <span>אתה ב-streak של <strong>${streak} ימים</strong>! המשך כך!</span>
          </div>
        `);
      }
    }
    
    return insights.length > 0 ? insights.join('') : '<div class="insight-item info"><span class="insight-icon">💡</span><span>המשך לעקוב אחר ההתקדמות שלך לקבלת תובנות נוספות</span></div>';
  }

  // עדכון צבעי גרפים במצב לילה
  updateChartColors() {
    console.log('🎨 updateChartColors: Updating chart colors for dark mode...');
    
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary');
    const secondaryColor = getComputedStyle(document.body).getPropertyValue('--text-secondary');
    const borderColor = getComputedStyle(document.body).getPropertyValue('--border-color');
    
    Object.values(this.charts).forEach(chart => {
      if (!chart) return;
      
      // עדכון צבעי טקסט
      if (chart.options.plugins.legend) {
        chart.options.plugins.legend.labels.color = textColor;
      }
      if (chart.options.plugins.title) {
        chart.options.plugins.title.color = textColor;
      }
      
      // עדכון צבעי צירים
      if (chart.options.scales) {
        if (chart.options.scales.y) {
          chart.options.scales.y.ticks.color = secondaryColor;
          chart.options.scales.y.grid.color = borderColor;
        }
        if (chart.options.scales.x) {
          chart.options.scales.x.ticks.color = secondaryColor;
        }
      }
      
      chart.update();
    });
    
    console.log('✅ updateChartColors: Chart colors updated');
  }

  // ייצוא דוח סטטיסטיקות
  async exportStatisticsReport() {
    console.log('📊 exportStatisticsReport: Exporting statistics report...');
    
    try {
      notifications.showInAppNotification('מכין דוח סטטיסטיקות...', 'info');
      
      await this.collectAllData();

      const stats = this.analyticsData.basic;
      const subjects = Object.values(this.analyticsData.subjects);
      const trends = this.analyticsData.trends;
      
      // יצירת תוכן HTML
      const reportContent = document.createElement('div');
      reportContent.style.fontFamily = 'Arial, sans-serif';
      reportContent.style.direction = 'rtl';
      reportContent.style.padding = '20px';
      reportContent.style.backgroundColor = 'white';
      reportContent.style.color = '#000';
      
      reportContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6;">📊 דוח סטטיסטיקות ואנליטיקה</h1>
          <p style="color: #6b7280;">
            <strong>תאריך:</strong> ${new Date().toLocaleDateString('he-IL', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">סטטיסטיקות כלליות</h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${stats.total}</div>
              <div style="color: #6b7280;">סך הכל משימות</div>
            </div>
            <div style="background: #dcfce7; padding: 15px; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #16a34a;">${stats.completed}</div>
              <div style="color: #6b7280;">הושלמו (${stats.completionRate}%)</div>
            </div>
            <div style="background: #fed7aa; padding: 15px; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #ea580c;">${stats.pending}</div>
              <div style="color: #6b7280;">ממתינים</div>
            </div>
            <div style="background: #fecaca; padding: 15px; border-radius: 8px;">
              <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${stats.urgent}</div>
              <div style="color: #6b7280;">דחופים</div>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">מגמות</h2>
          <div style="padding: 15px; background: #f9fafb; border-radius: 8px;">
            <p><strong>שינוי במספר המשימות:</strong> ${trends.tasksChange > 0 ? '+' : ''}${trends.tasksChange}% מהשבוע שעבר</p>
            <p><strong>שינוי בשיעור השלמה:</strong> ${trends.completionChange > 0 ? '+' : ''}${trends.completionChange}% מהשבוע שעבר</p>
            <p><strong>מגמה כללית:</strong> ${trends.trend === 'up' ? '📈 עלייה' : trends.trend === 'down' ? '📉 ירידה' : '➡️ יציבות'}</p>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">ביצועים לפי מקצוע</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #3b82f6; color: white;">
                <th style="padding: 12px; text-align: right; border: 1px solid #2563eb;">מקצוע</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #2563eb;">סה"כ</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #2563eb;">הושלמו</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #2563eb;">שיעור השלמה</th>
                <th style="padding: 12px; text-align: center; border: 1px solid #2563eb;">ממוצע ימים</th>
              </tr>
            </thead>
            <tbody>
              ${subjects.map((subject, index) => `
                <tr style="background: ${index % 2 === 0 ? '#f9fafb' : 'white'};">
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">
                    <span style="display: inline-block; width: 12px; height: 12px; background: ${subject.color}; border-radius: 50%; margin-left: 8px;"></span>
                    ${subject.name}
                  </td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${subject.total}</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${subject.completed}</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${Math.round(subject.completionRate)}%</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${subject.avgTimeToComplete}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <p>מערכת ניהול שיעורי בית - דוח סטטיסטיקות</p>
          <p>© ${new Date().getFullYear()} - נוצר ב-${new Date().toLocaleString('he-IL')}</p>
        </div>
      `;
      
      // הגדרות PDF
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `statistics-report-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      reportContent.style.position = 'absolute';
      reportContent.style.top = '0';
      reportContent.style.left = '-9999px';
      reportContent.style.width = '794px';
      reportContent.style.zIndex = '-1';
      document.body.appendChild(reportContent);
      await new Promise(r => setTimeout(r, 300));

      try {
        await html2pdf().set(opt).from(reportContent).save();
      } finally {
        document.body.removeChild(reportContent);
      }
      
      notifications.showInAppNotification('📊 דוח סטטיסטיקות נוצר בהצלחה!', 'success');
      console.log('✅ exportStatisticsReport: Report exported successfully');
      
    } catch (error) {
      console.error('❌ exportStatisticsReport: Error:', error);
      notifications.showInAppNotification('שגיאה ביצירת הדוח', 'error');
    }
  }
}

// יצירת אובייקט גלובלי
console.log('📊 Creating global unified statistics manager...');
const statistics = new UnifiedStatisticsManager();
console.log('✅ Global unified statistics manager created');

// אתחול
window.addEventListener('DOMContentLoaded', async () => {
  console.log('📊 statistics.js: Initializing...');
  
  // ממתין לאתחול Auth לפני טעינת סטטיסטיקות
  const panel = document.getElementById('statistics-panel');
  if (panel) {
    try {
      await statistics.renderUnifiedDashboard();
    } catch (e) {
      console.warn('📊 statistics.js: Will retry after auth is ready');
    }
  }
  
  console.log('✅ statistics.js: Initialized');
});

// עדכון אוטומטי
setInterval(async () => {
  const panel = document.getElementById('statistics-panel');
  if (panel && panel.offsetParent !== null) {
    await statistics.collectAllData();
    Object.values(statistics.charts).forEach(chart => {
      if (chart) chart.update();
    });
  }
}, 60000); // עדכון כל דקה