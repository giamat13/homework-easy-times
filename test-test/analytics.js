// Advanced Analytics Dashboard - דשבורד אנליטיקה מתקדם
class AnalyticsManager {
  constructor() {
    this.charts = {};
    console.log('📊 AnalyticsManager: Initialized');
  }

  // חישוב אנליטיקה מתקדמת
  calculateAdvancedAnalytics(homework, subjects) {
    console.log('📊 AnalyticsManager: Calculating advanced analytics...');

    const analytics = {
      // נתונים בסיסיים
      totalTasks: homework.length,
      completedTasks: homework.filter(h => h.completed).length,
      pendingTasks: homework.filter(h => !h.completed).length,
      overdueTasks: homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) < 0).length,
      urgentTasks: homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) <= 2 && getDaysUntilDue(h.dueDate) >= 0).length,

      // מגמות זמן
      weeklyTrend: this.calculateWeeklyTrend(homework),
      monthlyTrend: this.calculateMonthlyTrend(homework),
      completionByDay: this.calculateCompletionByDay(homework),

      // נתוני מקצועות
      subjectDistribution: this.calculateSubjectDistribution(homework, subjects),
      subjectCompletion: this.calculateSubjectCompletion(homework, subjects),
      
      // יעילות
      averageCompletionTime: this.calculateAverageCompletionTime(homework),
      completionRate: homework.length > 0 ? (homework.filter(h => h.completed).length / homework.length) * 100 : 0,
      onTimeRate: this.calculateOnTimeRate(homework),

      // דחיפות
      urgencyDistribution: this.calculateUrgencyDistribution(homework),
      
      // תגיות
      popularTags: this.calculatePopularTags(homework),

      // תחזיות
      predictions: this.calculatePredictions(homework)
    };

    console.log('✅ AnalyticsManager: Analytics calculated:', analytics);
    return analytics;
  }

  // מגמה שבועית
  calculateWeeklyTrend(homework) {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const completed = homework.filter(h => {
        if (!h.completed) return false;
        const completionDate = h.completionDate || h.dueDate;
        return completionDate === dateStr;
      }).length;

      const added = homework.filter(h => {
        const addedDate = h.addedDate || h.dueDate;
        return addedDate === dateStr;
      }).length;

      last7Days.push({
        date: dateStr,
        dayName: date.toLocaleDateString('he-IL', { weekday: 'short' }),
        completed,
        added
      });
    }

    return last7Days;
  }

  // מגמה חודשית
  calculateMonthlyTrend(homework) {
    const monthlyData = {};
    
    homework.forEach(h => {
      const dueDate = new Date(h.dueDate);
      const monthKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          total: 0,
          completed: 0,
          overdue: 0
        };
      }
      
      monthlyData[monthKey].total++;
      if (h.completed) monthlyData[monthKey].completed++;
      if (!h.completed && getDaysUntilDue(h.dueDate) < 0) monthlyData[monthKey].overdue++;
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // 6 חודשים אחרונים
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('he-IL', { month: 'short', year: 'numeric' }),
        ...data,
        completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0
      }));
  }

  // השלמות לפי יום בשבוע
  calculateCompletionByDay(homework) {
    const dayStats = {
      0: { name: 'ראשון', completed: 0, total: 0 },
      1: { name: 'שני', completed: 0, total: 0 },
      2: { name: 'שלישי', completed: 0, total: 0 },
      3: { name: 'רביעי', completed: 0, total: 0 },
      4: { name: 'חמישי', completed: 0, total: 0 },
      5: { name: 'שישי', completed: 0, total: 0 },
      6: { name: 'שבת', completed: 0, total: 0 }
    };

    homework.forEach(h => {
      const dueDay = new Date(h.dueDate).getDay();
      dayStats[dueDay].total++;
      if (h.completed) dayStats[dueDay].completed++;
    });

    return Object.values(dayStats).map(day => ({
      ...day,
      completionRate: day.total > 0 ? (day.completed / day.total) * 100 : 0
    }));
  }

  // חלוקת מקצועות
  calculateSubjectDistribution(homework, subjects) {
    const distribution = {};
    
    subjects.forEach(s => {
      const subjectTasks = homework.filter(h => h.subject == s.id);
      if (subjectTasks.length > 0) {
        distribution[s.id] = {
          name: s.name,
          color: s.color,
          count: subjectTasks.length,
          percentage: (subjectTasks.length / homework.length) * 100
        };
      }
    });

    return Object.values(distribution)
      .sort((a, b) => b.count - a.count);
  }

  // השלמה לפי מקצוע
  calculateSubjectCompletion(homework, subjects) {
    const completion = {};
    
    subjects.forEach(s => {
      const subjectTasks = homework.filter(h => h.subject == s.id);
      const completed = subjectTasks.filter(h => h.completed).length;
      
      if (subjectTasks.length > 0) {
        completion[s.id] = {
          name: s.name,
          color: s.color,
          total: subjectTasks.length,
          completed,
          completionRate: (completed / subjectTasks.length) * 100
        };
      }
    });

    return Object.values(completion)
      .sort((a, b) => b.completionRate - a.completionRate);
  }

  // זמן השלמה ממוצע
  calculateAverageCompletionTime(homework) {
    const completedTasks = homework.filter(h => h.completed && h.completionDate);
    
    if (completedTasks.length === 0) return 0;

    const totalDays = completedTasks.reduce((sum, h) => {
      const created = new Date(h.createdDate || h.dueDate);
      const completed = new Date(h.completionDate);
      const days = Math.floor((completed - created) / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, days);
    }, 0);

    return totalDays / completedTasks.length;
  }

  // אחוז ביצוע בזמן
  calculateOnTimeRate(homework) {
    const completedTasks = homework.filter(h => h.completed);
    if (completedTasks.length === 0) return 100;

    const onTime = completedTasks.filter(h => {
      const completionDate = new Date(h.completionDate || h.dueDate);
      const dueDate = new Date(h.dueDate);
      return completionDate <= dueDate;
    }).length;

    return (onTime / completedTasks.length) * 100;
  }

  // חלוקת דחיפות
  calculateUrgencyDistribution(homework) {
    const pending = homework.filter(h => !h.completed);
    
    return {
      safe: pending.filter(h => getDaysUntilDue(h.dueDate) > 7).length,
      approaching: pending.filter(h => {
        const days = getDaysUntilDue(h.dueDate);
        return days >= 3 && days <= 7;
      }).length,
      urgent: pending.filter(h => {
        const days = getDaysUntilDue(h.dueDate);
        return days >= 0 && days <= 2;
      }).length,
      overdue: pending.filter(h => getDaysUntilDue(h.dueDate) < 0).length
    };
  }

  // תגיות פופולריות
  calculatePopularTags(homework) {
    const tagCounts = {};
    
    homework.forEach(h => {
      if (h.tags) {
        h.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // תחזיות
  calculatePredictions(homework) {
    const pending = homework.filter(h => !h.completed);
    const last30Days = homework.filter(h => {
      const dueDate = new Date(h.dueDate);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return dueDate >= thirtyDaysAgo;
    });

    const avgTasksPerWeek = (last30Days.length / 30) * 7;
    const completionRate = this.calculateOnTimeRate(homework);

    return {
      estimatedTasksNextWeek: Math.round(avgTasksPerWeek),
      estimatedCompletionRate: completionRate,
      riskLevel: pending.filter(h => getDaysUntilDue(h.dueDate) <= 2).length > 5 ? 'high' : 
                 pending.filter(h => getDaysUntilDue(h.dueDate) <= 7).length > 3 ? 'medium' : 'low'
    };
  }

  // רינדור דשבורד אנליטיקה
  renderAnalyticsDashboard(homework, subjects) {
    console.log('🎨 AnalyticsManager: Rendering analytics dashboard...');
    
    const analytics = this.calculateAdvancedAnalytics(homework, subjects);

    let html = `
      <div class="analytics-dashboard">
        <h2>📊 דשבורד אנליטיקה מתקדם</h2>

        <!-- תחזיות -->
        <div class="analytics-section predictions">
          <h3>🔮 תחזיות</h3>
          <div class="prediction-cards">
            <div class="prediction-card">
              <div class="prediction-icon">📈</div>
              <div class="prediction-value">${analytics.predictions.estimatedTasksNextWeek}</div>
              <div class="prediction-label">משימות צפויות בשבוע הבא</div>
            </div>
            <div class="prediction-card">
              <div class="prediction-icon">✅</div>
              <div class="prediction-value">${Math.round(analytics.predictions.estimatedCompletionRate)}%</div>
              <div class="prediction-label">אחוז השלמה צפוי</div>
            </div>
            <div class="prediction-card risk-${analytics.predictions.riskLevel}">
              <div class="prediction-icon">${analytics.predictions.riskLevel === 'high' ? '🔴' : analytics.predictions.riskLevel === 'medium' ? '🟡' : '🟢'}</div>
              <div class="prediction-value">${analytics.predictions.riskLevel === 'high' ? 'גבוה' : analytics.predictions.riskLevel === 'medium' ? 'בינוני' : 'נמוך'}</div>
              <div class="prediction-label">רמת סיכון</div>
            </div>
          </div>
        </div>

        <!-- יעילות -->
        <div class="analytics-section efficiency">
          <h3>⚡ יעילות</h3>
          <div class="efficiency-metrics">
            <div class="metric-item">
              <div class="metric-label">אחוז השלמה כללי</div>
              <div class="metric-bar">
                <div class="metric-fill" style="width: ${analytics.completionRate}%; background: #10b981;"></div>
              </div>
              <div class="metric-value">${Math.round(analytics.completionRate)}%</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">אחוז ביצוע בזמן</div>
              <div class="metric-bar">
                <div class="metric-fill" style="width: ${analytics.onTimeRate}%; background: #3b82f6;"></div>
              </div>
              <div class="metric-value">${Math.round(analytics.onTimeRate)}%</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">זמן השלמה ממוצע</div>
              <div class="metric-value-large">${analytics.averageCompletionTime.toFixed(1)} ימים</div>
            </div>
          </div>
        </div>

        <!-- גרפים -->
        <div class="analytics-charts">
          <div class="chart-container">
            <h3>📈 מגמה שבועית</h3>
            <canvas id="weekly-trend-chart"></canvas>
          </div>
          <div class="chart-container">
            <h3>📊 השלמה לפי יום בשבוע</h3>
            <canvas id="day-completion-chart"></canvas>
          </div>
          <div class="chart-container">
            <h3>🎯 חלוקת דחיפות</h3>
            <canvas id="urgency-distribution-chart"></canvas>
          </div>
          <div class="chart-container">
            <h3>📚 השלמה לפי מקצוע</h3>
            <canvas id="subject-completion-chart"></canvas>
          </div>
        </div>

        <!-- תגיות פופולריות -->
        ${analytics.popularTags.length > 0 ? `
          <div class="analytics-section tags">
            <h3>🏷️ תגיות פופולריות</h3>
            <div class="popular-tags">
              ${analytics.popularTags.map(tag => `
                <div class="popular-tag">
                  <span class="tag-name">${tag.tag}</span>
                  <span class="tag-count">${tag.count}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- מגמה חודשית -->
        ${analytics.monthlyTrend.length > 0 ? `
          <div class="analytics-section monthly">
            <h3>📅 מגמה חודשית</h3>
            <div class="monthly-table">
              <table>
                <thead>
                  <tr>
                    <th>חודש</th>
                    <th>סה"כ</th>
                    <th>הושלמו</th>
                    <th>באיחור</th>
                    <th>אחוז השלמה</th>
                  </tr>
                </thead>
                <tbody>
                  ${analytics.monthlyTrend.map(month => `
                    <tr>
                      <td>${month.month}</td>
                      <td>${month.total}</td>
                      <td class="success">${month.completed}</td>
                      <td class="danger">${month.overdue}</td>
                      <td>
                        <div class="mini-bar">
                          <div class="mini-bar-fill" style="width: ${month.completionRate}%; background: #10b981;"></div>
                        </div>
                        ${Math.round(month.completionRate)}%
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    return html;
  }

  // יצירת גרפים
  createAnalyticsCharts(homework, subjects) {
    console.log('📊 AnalyticsManager: Creating analytics charts...');
    
    const analytics = this.calculateAdvancedAnalytics(homework, subjects);

    // ניקוי גרפים קיימים
    Object.values(this.charts).forEach(chart => {
      if (chart) chart.destroy();
    });
    this.charts = {};

    // גרף מגמה שבועית
    const weeklyCtx = document.getElementById('weekly-trend-chart');
    if (weeklyCtx) {
      this.charts.weeklyTrend = new Chart(weeklyCtx, {
        type: 'line',
        data: {
          labels: analytics.weeklyTrend.map(d => d.dayName),
          datasets: [
            {
              label: 'הושלמו',
              data: analytics.weeklyTrend.map(d => d.completed),
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'נוספו',
              data: analytics.weeklyTrend.map(d => d.added),
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
          plugins: {
            legend: {
              labels: {
                color: getComputedStyle(document.body).getPropertyValue('--text-primary')
              }
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
    }

    // גרף השלמה לפי יום
    const dayCtx = document.getElementById('day-completion-chart');
    if (dayCtx) {
      this.charts.dayCompletion = new Chart(dayCtx, {
        type: 'bar',
        data: {
          labels: analytics.completionByDay.map(d => d.name),
          datasets: [{
            label: 'אחוז השלמה',
            data: analytics.completionByDay.map(d => d.completionRate),
            backgroundColor: analytics.completionByDay.map(d => 
              d.completionRate >= 75 ? '#10b981' :
              d.completionRate >= 50 ? '#f59e0b' : '#ef4444'
            ),
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: (value) => value + '%',
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
    }

    // גרף חלוקת דחיפות
    const urgencyCtx = document.getElementById('urgency-distribution-chart');
    if (urgencyCtx) {
      this.charts.urgency = new Chart(urgencyCtx, {
        type: 'doughnut',
        data: {
          labels: ['בטוח (7+ ימים)', 'מתקרב (3-7 ימים)', 'דחוף (0-2 ימים)', 'באיחור'],
          datasets: [{
            data: [
              analytics.urgencyDistribution.safe,
              analytics.urgencyDistribution.approaching,
              analytics.urgencyDistribution.urgent,
              analytics.urgencyDistribution.overdue
            ],
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
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
            }
          }
        }
      });
    }

    // גרף השלמה לפי מקצוע
    const subjectCompCtx = document.getElementById('subject-completion-chart');
    if (subjectCompCtx) {
      this.charts.subjectCompletion = new Chart(subjectCompCtx, {
        type: 'horizontalBar',
        data: {
          labels: analytics.subjectCompletion.map(s => s.name),
          datasets: [{
            label: 'אחוז השלמה',
            data: analytics.subjectCompletion.map(s => s.completionRate),
            backgroundColor: analytics.subjectCompletion.map(s => s.color + '80'),
            borderColor: analytics.subjectCompletion.map(s => s.color),
            borderWidth: 2
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: (value) => value + '%',
                color: getComputedStyle(document.body).getPropertyValue('--text-secondary')
              },
              grid: {
                color: getComputedStyle(document.body).getPropertyValue('--border-color')
              }
            },
            y: {
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
    }

    console.log('✅ AnalyticsManager: Charts created');
  }

  // עדכון צבעי גרפים
  updateChartColors() {
    console.log('🎨 AnalyticsManager: Updating chart colors...');
    
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary');
    const secondaryColor = getComputedStyle(document.body).getPropertyValue('--text-secondary');
    const borderColor = getComputedStyle(document.body).getPropertyValue('--border-color');

    Object.values(this.charts).forEach(chart => {
      if (!chart) return;

      if (chart.options.plugins.legend) {
        chart.options.plugins.legend.labels.color = textColor;
      }
      
      if (chart.options.scales) {
        if (chart.options.scales.x) {
          chart.options.scales.x.ticks.color = secondaryColor;
          if (chart.options.scales.x.grid) {
            chart.options.scales.x.grid.color = borderColor;
          }
        }
        if (chart.options.scales.y) {
          chart.options.scales.y.ticks.color = secondaryColor;
          if (chart.options.scales.y.grid) {
            chart.options.scales.y.grid.color = borderColor;
          }
        }
      }

      chart.update();
    });

    console.log('✅ AnalyticsManager: Chart colors updated');
  }
}

// יצירת אובייקט גלובלי
console.log('📊 Creating global analytics manager...');
const analyticsManager = new AnalyticsManager();
console.log('✅ Global analytics manager created');
