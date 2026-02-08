// Charts and Statistics Manager
let completionChart = null;
let subjectChart = null;

function initializeCharts() {
  const completionCtx = document.getElementById('completion-chart');
  const subjectCtx = document.getElementById('subject-chart');
  
  if (!completionCtx || !subjectCtx) return;
  
  // גרף השלמה
  completionChart = new Chart(completionCtx, {
    type: 'doughnut',
    data: {
      labels: ['הושלמו', 'ממתינים', 'דחוף', 'באיחור'],
      datasets: [{
        data: [0, 0, 0, 0],
        backgroundColor: [
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#dc2626'
        ],
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
            font: {
              family: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
              size: 12
            },
            color: getComputedStyle(document.body).getPropertyValue('--text-primary')
          }
        },
        title: {
          display: true,
          text: 'סטטוס משימות',
          font: {
            size: 16,
            weight: 'bold'
          },
          color: getComputedStyle(document.body).getPropertyValue('--text-primary')
        }
      }
    }
  });
  
  // גרף מקצועות
  subjectChart = new Chart(subjectCtx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'משימות לפי מקצוע',
        data: [],
        backgroundColor: [],
        borderColor: [],
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
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'משימות לפי מקצוע',
          font: {
            size: 16,
            weight: 'bold'
          },
          color: getComputedStyle(document.body).getPropertyValue('--text-primary')
        }
      }
    }
  });
}

function updateCharts() {
  if (!completionChart || !subjectChart) {
    initializeCharts();
    if (!completionChart || !subjectChart) return;
  }
  
  // עדכון גרף השלמה
  const completed = homework.filter(h => h.completed).length;
  const pending = homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) > 2).length;
  const urgent = homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) <= 2 && getDaysUntilDue(h.dueDate) >= 0).length;
  const overdue = homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) < 0).length;
  
  completionChart.data.datasets[0].data = [completed, pending, urgent, overdue];
  completionChart.update();
  
  // עדכון גרף מקצועות
  const subjectStats = {};
  subjects.forEach(s => {
    subjectStats[s.id] = {
      name: s.name,
      color: s.color,
      count: 0
    };
  });
  
  homework.forEach(hw => {
    if (subjectStats[hw.subject]) {
      subjectStats[hw.subject].count++;
    }
  });
  
  const sortedSubjects = Object.values(subjectStats)
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count);
  
  subjectChart.data.labels = sortedSubjects.map(s => s.name);
  subjectChart.data.datasets[0].data = sortedSubjects.map(s => s.count);
  subjectChart.data.datasets[0].backgroundColor = sortedSubjects.map(s => s.color + '80'); // 50% opacity
  subjectChart.data.datasets[0].borderColor = sortedSubjects.map(s => s.color);
  subjectChart.update();
}

// עדכון צבעי גרפים במצב לילה
function updateChartColors() {
  if (!completionChart || !subjectChart) return;
  
  const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary');
  const secondaryColor = getComputedStyle(document.body).getPropertyValue('--text-secondary');
  const borderColor = getComputedStyle(document.body).getPropertyValue('--border-color');
  
  // עדכון גרף השלמה
  completionChart.options.plugins.legend.labels.color = textColor;
  completionChart.options.plugins.title.color = textColor;
  
  // עדכון גרף מקצועות
  subjectChart.options.plugins.title.color = textColor;
  subjectChart.options.scales.y.ticks.color = secondaryColor;
  subjectChart.options.scales.x.ticks.color = secondaryColor;
  subjectChart.options.scales.y.grid.color = borderColor;
  
  completionChart.update();
  subjectChart.update();
}

// אתחול גרפים עם הדף
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(initializeCharts, 500);
});

// עדכון גרפים כשמשנים מצב לילה
const originalToggleDarkMode = window.toggleDarkMode || function() {};
window.toggleDarkMode = function() {
  originalToggleDarkMode();
  setTimeout(updateChartColors, 100);
};
