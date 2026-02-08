// Charts and Statistics Manager
let completionChart = null;
let subjectChart = null;

function initializeCharts() {
  console.log('📊 initializeCharts: Initializing charts...');
  
  const completionCtx = document.getElementById('completion-chart');
  const subjectCtx = document.getElementById('subject-chart');
  
  if (!completionCtx || !subjectCtx) {
    console.warn('⚠️ initializeCharts: Chart elements not found', {
      completionCtx: !!completionCtx,
      subjectCtx: !!subjectCtx
    });
    return;
  }
  
  console.log('📊 initializeCharts: Chart elements found');
  
  // *** FIX: Destroy existing charts before creating new ones ***
  if (completionChart) {
    console.log('📊 initializeCharts: Destroying existing completion chart...');
    completionChart.destroy();
    completionChart = null;
  }
  
  if (subjectChart) {
    console.log('📊 initializeCharts: Destroying existing subject chart...');
    subjectChart.destroy();
    subjectChart = null;
  }
  
  // גרף השלמה
  console.log('📊 initializeCharts: Creating completion chart...');
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
  console.log('✅ initializeCharts: Completion chart created');
  
  // גרף מקצועות
  console.log('📊 initializeCharts: Creating subject chart...');
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
  console.log('✅ initializeCharts: Subject chart created');
  console.log('✅ initializeCharts: Charts initialization complete');
}

function updateCharts() {
  console.log('📊 updateCharts: Updating charts...');
  
  if (!completionChart || !subjectChart) {
    console.warn('⚠️ updateCharts: Charts not initialized, initializing now...');
    initializeCharts();
    if (!completionChart || !subjectChart) {
      console.error('❌ updateCharts: Failed to initialize charts');
      return;
    }
  }
  
  console.log('📊 updateCharts: Calculating completion statistics...');
  // עדכון גרף השלמה
  const completed = homework.filter(h => h.completed).length;
  const pending = homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) > 2).length;
  const urgent = homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) <= 2 && getDaysUntilDue(h.dueDate) >= 0).length;
  const overdue = homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) < 0).length;
  
  console.log('📊 updateCharts: Stats:', {completed, pending, urgent, overdue});
  
  completionChart.data.datasets[0].data = [completed, pending, urgent, overdue];
  completionChart.update();
  console.log('✅ updateCharts: Completion chart updated');
  
  // עדכון גרף מקצועות
  console.log('📊 updateCharts: Calculating subject statistics...');
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
  
  console.log('📊 updateCharts: Subject stats:', sortedSubjects);
  
  subjectChart.data.labels = sortedSubjects.map(s => s.name);
  subjectChart.data.datasets[0].data = sortedSubjects.map(s => s.count);
  subjectChart.data.datasets[0].backgroundColor = sortedSubjects.map(s => s.color + '80'); // 50% opacity
  subjectChart.data.datasets[0].borderColor = sortedSubjects.map(s => s.color);
  subjectChart.update();
  console.log('✅ updateCharts: Subject chart updated');
  console.log('✅ updateCharts: Charts update complete');
}

// עדכון צבעי גרפים במצב לילה
function updateChartColors() {
  console.log('🎨 updateChartColors: Updating chart colors for dark mode...');
  
  if (!completionChart || !subjectChart) {
    console.warn('⚠️ updateChartColors: Charts not initialized');
    return;
  }
  
  const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary');
  const secondaryColor = getComputedStyle(document.body).getPropertyValue('--text-secondary');
  const borderColor = getComputedStyle(document.body).getPropertyValue('--border-color');
  
  console.log('🎨 updateChartColors: Colors:', {textColor, secondaryColor, borderColor});
  
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
  console.log('✅ updateChartColors: Chart colors updated');
}

// *** FIX: Better initialization timing ***
window.addEventListener('DOMContentLoaded', () => {
  console.log('📊 charts.js: DOMContentLoaded event - waiting for data to load...');
  
  // Wait for app.js to load data first, then initialize charts
  const checkDataLoaded = setInterval(() => {
    if (typeof homework !== 'undefined' && typeof subjects !== 'undefined') {
      console.log('📊 charts.js: Data loaded, initializing charts...');
      clearInterval(checkDataLoaded);
      initializeCharts();
      updateCharts();
    }
  }, 100);
  
  // Safety timeout - initialize after 2 seconds even if data isn't detected
  setTimeout(() => {
    clearInterval(checkDataLoaded);
    if (!completionChart && !subjectChart) {
      console.log('📊 charts.js: Timeout reached, forcing chart initialization...');
      initializeCharts();
    }
  }, 2000);
});
