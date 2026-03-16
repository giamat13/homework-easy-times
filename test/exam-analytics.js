// ============================================================
// 📝 Exam Analytics Module — סטטיסטיקות ואנליטיקה מבחנים
// ============================================================

class ExamAnalytics {
  constructor() {
    this.charts = {};
    console.log('📝 ExamAnalytics: Initialized');
  }

  // ── נתונים ──────────────────────────────────────────────

  async loadData() {
    const exams    = await storage.get('exams-list')       || [];
    const subjects = await storage.get('homework-subjects') || [];
    const settings = await storage.get('homework-settings') || {};
    return { exams, subjects, settings };
  }

  getDaysUntilDue(dateStr) {
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(dateStr + 'T00:00:00');
    return Math.round((due - today) / 86400000);
  }

  // ── ניתוחים ─────────────────────────────────────────────

  analyze(exams, subjects) {
    const total     = exams.length;
    const completed = exams.filter(e => e.completed).length;
    const upcoming  = exams.filter(e => !e.completed && this.getDaysUntilDue(e.date) >= 0).length;
    const overdue   = exams.filter(e => !e.completed && this.getDaysUntilDue(e.date) < 0).length;
    const thisWeek  = exams.filter(e => !e.completed && this.getDaysUntilDue(e.date) >= 0 && this.getDaysUntilDue(e.date) <= 7).length;

    // אחוז נושאים שנלמדו
    let totalTopics = 0, doneTopics = 0;
    exams.forEach(e => {
      (e.topics || []).forEach(t => { totalTopics++; if (t.done) doneTopics++; });
    });
    const topicPct = totalTopics ? Math.round((doneTopics / totalTopics) * 100) : 0;

    // לפי מקצוע
    const bySubject = {};
    exams.forEach(e => {
      const sub = subjects.find(s => s.id == e.subject);
      const key = sub ? sub.name : 'ללא מקצוע';
      const color = sub ? sub.color : '#9ca3af';
      if (!bySubject[key]) bySubject[key] = { name: key, color, total: 0, completed: 0, topics: 0, topicsDone: 0 };
      bySubject[key].total++;
      if (e.completed) bySubject[key].completed++;
      (e.topics || []).forEach(t => { bySubject[key].topics++; if (t.done) bySubject[key].topicsDone++; });
    });

    // לפי חודש (ציר הזמן)
    const byMonth = {};
    exams.forEach(e => {
      const m = e.date ? e.date.slice(0, 7) : null;
      if (!m) return;
      if (!byMonth[m]) byMonth[m] = { label: this.monthLabel(m), total: 0, completed: 0 };
      byMonth[m].total++;
      if (e.completed) byMonth[m].completed++;
    });

    // ציר עומס (כמה מבחנים בכל שבוע קדימה)
    const loadByWeek = {};
    exams.filter(e => !e.completed).forEach(e => {
      const d = this.getDaysUntilDue(e.date);
      if (d < 0 || d > 56) return;
      const week = Math.floor(d / 7);
      const label = week === 0 ? 'השבוע' : `בעוד ${week} שב'`;
      if (!loadByWeek[label]) loadByWeek[label] = { label, count: 0, week };
      loadByWeek[label].count++;
    });

    // מבחן הכי קרוב
    const nextExam = exams
      .filter(e => !e.completed && this.getDaysUntilDue(e.date) >= 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null;

    // ממוצע נושאים למבחן
    const avgTopics = total ? (totalTopics / total).toFixed(1) : 0;

    // streak — מבחנים שכל נושאיהם נלמדו
    const fullyPrepared = exams.filter(e => {
      if (e.completed || (e.topics || []).length === 0) return false;
      return e.topics.every(t => t.done);
    }).length;

    return {
      total, completed, upcoming, overdue, thisWeek,
      totalTopics, doneTopics, topicPct,
      bySubject: Object.values(bySubject),
      byMonth: Object.values(byMonth).sort((a,b) => a.label < b.label ? -1 : 1),
      loadByWeek: Object.values(loadByWeek).sort((a,b) => a.week - b.week),
      nextExam, avgTopics, fullyPrepared,
      completionRate: total ? Math.round((completed / total) * 100) : 0
    };
  }

  monthLabel(ym) {
    const [y, m] = ym.split('-');
    const names = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    return `${names[parseInt(m) - 1]} ${y}`;
  }

  generateInsights(data, subjects) {
    const insights = [];
    const { total, completed, upcoming, overdue, thisWeek, topicPct, nextExam, fullyPrepared, completionRate, bySubject, avgTopics } = data;

    if (total === 0) return '<div class="ea-insight info">📝 עדיין אין מבחנים מוגדרים. הוסף מבחנים כדי לראות תובנות!</div>';

    if (thisWeek > 0) insights.push(`<div class="ea-insight danger">🔥 יש לך <strong>${thisWeek} מבחן${thisWeek > 1 ? 'ים' : ''}</strong> השבוע — התחל ללמוד עכשיו!</div>`);
    if (overdue > 0)  insights.push(`<div class="ea-insight warning">⚠️ <strong>${overdue} מבחן${overdue > 1 ? 'ים' : ''}</strong> עברו מבלי שסומנו כהסתיים — בדוק את הסטטוס.</div>`);

    if (nextExam) {
      const d = this.getDaysUntilDue(nextExam.date);
      const sub = subjects.find(s => s.id == nextExam.subject);
      const pct = (nextExam.topics||[]).length ? Math.round((nextExam.topics.filter(t=>t.done).length / nextExam.topics.length)*100) : null;
      const subName = sub ? sub.name : '';
      if (d === 0) insights.push(`<div class="ea-insight danger">📅 המבחן הקרוב ביותר — <strong>${nextExam.title}${subName ? ' ('+subName+')' : ''}</strong> — <strong>היום!</strong>${pct !== null ? ` כיסית ${pct}% מהחומר.` : ''}</div>`);
      else if (d <= 3) insights.push(`<div class="ea-insight warning">📅 המבחן <strong>${nextExam.title}${subName ? ' ('+subName+')' : ''}</strong> בעוד <strong>${d} ימים</strong>.${pct !== null ? ` כיסית ${pct}% מהחומר.` : ''}</div>`);
      else insights.push(`<div class="ea-insight info">📅 המבחן הקרוב: <strong>${nextExam.title}</strong> — עוד ${d} ימים.${pct !== null ? ` כיסית ${pct}% מהחומר.` : ''}</div>`);
    }

    if (topicPct >= 80) insights.push(`<div class="ea-insight success">✅ כיסית <strong>${topicPct}%</strong> מסך הנושאים — הכנה מצוינת!</div>`);
    else if (topicPct > 0 && topicPct < 40) insights.push(`<div class="ea-insight warning">📖 כיסית רק <strong>${topicPct}%</strong> מהנושאים — יש עוד הרבה לעשות.</div>`);

    if (fullyPrepared > 0) insights.push(`<div class="ea-insight success">🏆 <strong>${fullyPrepared} מבחן${fullyPrepared > 1 ? 'ים' : ''}</strong> מוכנים לחלוטין — כל הנושאים סומנו!</div>`);

    if (completionRate >= 70 && completed > 0) insights.push(`<div class="ea-insight success">🎓 סיימת <strong>${completionRate}%</strong> מהמבחנים שלך — עמל משתלם!</div>`);

    if (bySubject.length > 0) {
      const heaviest = [...bySubject].sort((a,b) => b.total - a.total)[0];
      if (heaviest.total >= 2) insights.push(`<div class="ea-insight info">📚 המקצוע עם הכי הרבה מבחנים: <strong>${heaviest.name}</strong> (${heaviest.total} מבחנים).</div>`);
    }

    if (parseFloat(avgTopics) >= 5) insights.push(`<div class="ea-insight info">🗂 ממוצע <strong>${avgTopics} נושאים</strong> למבחן — תוכנית לימוד מפורטת!</div>`);

    return insights.join('') || '<div class="ea-insight info">💡 המשך להוסיף מבחנים ולסמן נושאים כדי לקבל תובנות מותאמות.</div>';
  }

  // ── רינדור ──────────────────────────────────────────────

  async render() {
    const panel = document.getElementById('exam-analytics-panel');
    if (!panel) return;

    const { exams, subjects, settings } = await this.loadData();

    if (settings.studentMode === false) {
      panel.style.display = 'none';
      return;
    }
    panel.style.display = '';

    if (exams.length === 0) {
      panel.innerHTML = `
        <h2>📝 אנליטיקה — מבחנים</h2>
        <div style="text-align:center;padding:3rem 1rem;color:#9ca3af;">
          <div style="font-size:3rem;margin-bottom:1rem;">📋</div>
          <p style="font-size:1.1rem;">עדיין לא הוספת מבחנים.<br>הוסף מבחן מהמסך הראשי כדי לראות סטטיסטיקות.</p>
        </div>`;
      return;
    }

    const d = this.analyze(exams, subjects);

    panel.innerHTML = `
      <h2>📝 אנליטיקה — מבחנים</h2>

      <!-- KPI Row -->
      <div class="ea-kpi-row">
        ${this.kpi('📝', d.total, 'מבחנים', '#7c3aed')}
        ${this.kpi('🗓️', d.upcoming, 'קרובים', '#3b82f6')}
        ${this.kpi('⚡', d.thisWeek, 'השבוע', d.thisWeek > 0 ? '#f59e0b' : '#10b981')}
        ${this.kpi('✅', d.completed, 'הסתיימו', '#10b981')}
        ${this.kpi('⚠️', d.overdue, 'עברו', d.overdue > 0 ? '#ef4444' : '#6b7280')}
        ${this.kpi('🎓', d.completionRate + '%', 'שיעור סיום', '#8b5cf6')}
      </div>

      <!-- Topic Preparation Bar -->
      <div class="ea-section">
        <h3>📖 הכנה לנושאים</h3>
        <div class="ea-prep-row">
          <div class="ea-prep-labels">
            <span>${d.doneTopics} נושאים נלמדו</span>
            <span style="font-weight:700;color:#7c3aed;">${d.topicPct}%</span>
            <span>${d.totalTopics - d.doneTopics} נשארו</span>
          </div>
          <div class="ea-big-progress">
            <div class="ea-big-progress-fill" style="width:${d.topicPct}%;"></div>
          </div>
          <div class="ea-prep-sub">מתוך ${d.totalTopics} נושאים סה"כ • ממוצע ${d.avgTopics} נושאים למבחן</div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="ea-charts-row">
        <div class="ea-chart-card">
          <h3>🎯 סטטוס מבחנים</h3>
          <div class="ea-chart-wrap"><canvas id="ea-status-chart"></canvas></div>
        </div>
        <div class="ea-chart-card">
          <h3>📚 מבחנים לפי מקצוע</h3>
          <div class="ea-chart-wrap"><canvas id="ea-subject-chart"></canvas></div>
        </div>
        <div class="ea-chart-card">
          <h3>📖 הכנה לפי מקצוע</h3>
          <div class="ea-chart-wrap"><canvas id="ea-prep-chart"></canvas></div>
        </div>
      </div>

      <!-- Timeline / Load -->
      ${d.loadByWeek.length > 0 ? `
      <div class="ea-section">
        <h3>📅 עומס מבחנים קרובים</h3>
        <div class="ea-chart-wrap-wide"><canvas id="ea-load-chart"></canvas></div>
      </div>` : ''}

      ${d.byMonth.length > 0 ? `
      <div class="ea-section">
        <h3>📆 מבחנים לפי חודש</h3>
        <div class="ea-chart-wrap-wide"><canvas id="ea-month-chart"></canvas></div>
      </div>` : ''}

      <!-- Per-exam preparation breakdown -->
      ${d.upcoming > 0 ? `
      <div class="ea-section">
        <h3>🏋️ פירוט הכנה לפי מבחן</h3>
        <div class="ea-exam-breakdown">
          ${exams
            .filter(e => !e.completed && this.getDaysUntilDue(e.date) >= 0)
            .sort((a,b) => new Date(a.date) - new Date(b.date))
            .map(e => this.examBreakdownCard(e, subjects)).join('')}
        </div>
      </div>` : ''}

      <!-- Insights -->
      <div class="ea-section">
        <h3>💡 תובנות חכמות</h3>
        <div class="ea-insights">${this.generateInsights(d, subjects)}</div>
      </div>
    `;

    // יצירת גרפים
    setTimeout(() => {
      this.createStatusChart(d);
      this.createSubjectChart(d);
      this.createPrepChart(d);
      if (d.loadByWeek.length > 0) this.createLoadChart(d);
      if (d.byMonth.length > 0)   this.createMonthChart(d);
    }, 100);
  }

  kpi(icon, value, label, color) {
    return `
      <div class="ea-kpi" style="--kpi-color:${color};">
        <div class="ea-kpi-icon">${icon}</div>
        <div class="ea-kpi-value">${value}</div>
        <div class="ea-kpi-label">${label}</div>
      </div>`;
  }

  examBreakdownCard(exam, subjects) {
    const sub     = subjects.find(s => s.id == exam.subject);
    const total   = (exam.topics || []).length;
    const done    = (exam.topics || []).filter(t => t.done).length;
    const pct     = total ? Math.round((done / total) * 100) : null;
    const days    = this.getDaysUntilDue(exam.date);
    const urgency = days === 0 ? 'danger' : days <= 3 ? 'warning' : 'ok';
    const daysStr = days === 0 ? 'היום!' : days === 1 ? 'מחר' : `${days} ימים`;
    const color   = sub ? sub.color : '#8b5cf6';

    return `
      <div class="ea-breakdown-card ea-bd-${urgency}" style="border-right:4px solid ${color};">
        <div class="ea-bd-header">
          <span class="ea-bd-title">${exam.title}</span>
          ${sub ? `<span class="ea-bd-sub" style="background:${color};">${sub.name}</span>` : ''}
          <span class="ea-bd-days ea-bd-${urgency}">${daysStr}</span>
        </div>
        ${pct !== null ? `
          <div class="ea-bd-progress-row">
            <div class="ea-bd-bar"><div class="ea-bd-fill" style="width:${pct}%;background:${color};"></div></div>
            <span class="ea-bd-pct">${pct}%</span>
          </div>
          <div class="ea-bd-topics">
            ${(exam.topics || []).map(t => `
              <span class="ea-topic-pill ${t.done ? 'done' : ''}">${t.name}</span>
            `).join('')}
          </div>` : '<div style="color:#9ca3af;font-size:0.8rem;margin-top:0.4rem;">לא הוגדרו נושאים</div>'}
      </div>`;
  }

  // ── גרפים ──────────────────────────────────────────────

  destroyChart(id) { if (this.charts[id]) { this.charts[id].destroy(); delete this.charts[id]; } }

  chartDefaults() {
    const isDark = document.body.classList.contains('dark-mode');
    return {
      text: isDark ? '#e5e7eb' : '#374151',
      grid: isDark ? '#374151' : '#e5e7eb',
    };
  }

  createStatusChart(d) {
    this.destroyChart('status');
    const ctx = document.getElementById('ea-status-chart');
    if (!ctx) return;
    const { text } = this.chartDefaults();
    this.charts.status = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['הסתיימו', 'קרובים', 'עברו'],
        datasets: [{
          data: [d.completed, d.upcoming, d.overdue],
          backgroundColor: ['#10b981', '#7c3aed', '#ef4444'],
          borderWidth: 3,
          borderColor: document.body.classList.contains('dark-mode') ? '#1e293b' : '#fff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: text, padding: 12, font: { size: 12 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` } }
        }
      }
    });
  }

  createSubjectChart(d) {
    this.destroyChart('subject');
    const ctx = document.getElementById('ea-subject-chart');
    if (!ctx || d.bySubject.length === 0) return;
    const { text, grid } = this.chartDefaults();
    this.charts.subject = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: d.bySubject.map(s => s.name),
        datasets: [{
          label: 'מבחנים',
          data: d.bySubject.map(s => s.total),
          backgroundColor: d.bySubject.map(s => s.color + 'cc'),
          borderColor: d.bySubject.map(s => s.color),
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: text }, grid: { color: grid } },
          y: { ticks: { color: text, stepSize: 1 }, grid: { color: grid }, beginAtZero: true }
        }
      }
    });
  }

  createPrepChart(d) {
    this.destroyChart('prep');
    const ctx = document.getElementById('ea-prep-chart');
    if (!ctx || d.bySubject.length === 0) return;
    const { text, grid } = this.chartDefaults();
    const prepared = d.bySubject.filter(s => s.topics > 0);
    if (prepared.length === 0) return;
    this.charts.prep = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: prepared.map(s => s.name),
        datasets: [
          { label: 'נלמדו', data: prepared.map(s => s.topicsDone), backgroundColor: '#10b981cc', borderColor: '#10b981', borderWidth: 2, borderRadius: 6 },
          { label: 'נשארו', data: prepared.map(s => s.topics - s.topicsDone), backgroundColor: '#7c3aed33', borderColor: '#7c3aed', borderWidth: 2, borderRadius: 6 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { color: text } } },
        scales: {
          x: { stacked: true, ticks: { color: text }, grid: { color: grid } },
          y: { stacked: true, ticks: { color: text, stepSize: 1 }, grid: { color: grid }, beginAtZero: true }
        }
      }
    });
  }

  createLoadChart(d) {
    this.destroyChart('load');
    const ctx = document.getElementById('ea-load-chart');
    if (!ctx) return;
    const { text, grid } = this.chartDefaults();
    const colors = d.loadByWeek.map(w => w.count >= 3 ? '#ef444488' : w.count >= 2 ? '#f59e0b88' : '#7c3aed88');
    const borders = d.loadByWeek.map(w => w.count >= 3 ? '#ef4444' : w.count >= 2 ? '#f59e0b' : '#7c3aed');
    this.charts.load = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: d.loadByWeek.map(w => w.label),
        datasets: [{ label: 'מבחנים', data: d.loadByWeek.map(w => w.count), backgroundColor: colors, borderColor: borders, borderWidth: 2, borderRadius: 8 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} מבחנים` } } },
        scales: {
          x: { ticks: { color: text }, grid: { color: grid } },
          y: { ticks: { color: text, stepSize: 1 }, grid: { color: grid }, beginAtZero: true }
        }
      }
    });
  }

  createMonthChart(d) {
    this.destroyChart('month');
    const ctx = document.getElementById('ea-month-chart');
    if (!ctx) return;
    const { text, grid } = this.chartDefaults();
    this.charts.month = new Chart(ctx, {
      type: 'line',
      data: {
        labels: d.byMonth.map(m => m.label),
        datasets: [
          { label: 'כל המבחנים', data: d.byMonth.map(m => m.total), borderColor: '#7c3aed', backgroundColor: '#7c3aed22', tension: 0.4, fill: true, pointRadius: 5, pointBackgroundColor: '#7c3aed' },
          { label: 'הסתיימו', data: d.byMonth.map(m => m.completed), borderColor: '#10b981', backgroundColor: 'transparent', tension: 0.4, pointRadius: 5, pointBackgroundColor: '#10b981' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: text } } },
        scales: {
          x: { ticks: { color: text }, grid: { color: grid } },
          y: { ticks: { color: text, stepSize: 1 }, grid: { color: grid }, beginAtZero: true }
        }
      }
    });
  }
}

// ── CSS מוטמע ─────────────────────────────────────────────
(function injectCSS() {
  const style = document.createElement('style');
  style.textContent = `
    #exam-analytics-panel { margin-top: 1.5rem; }
    #exam-analytics-panel h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 1.25rem; color: var(--text-primary); }
    #exam-analytics-panel h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.85rem; color: var(--text-primary); }

    /* KPI */
    .ea-kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
    .ea-kpi { background: var(--bg-secondary); border: 2px solid var(--border-color); border-radius: 0.75rem; padding: 1rem 0.75rem; text-align: center; transition: transform 0.2s; position: relative; overflow: hidden; }
    .ea-kpi::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background: var(--kpi-color); }
    .ea-kpi:hover { transform: translateY(-3px); box-shadow: 0 6px 14px rgba(0,0,0,0.1); }
    .ea-kpi-icon { font-size: 1.5rem; margin-bottom: 0.3rem; }
    .ea-kpi-value { font-size: 1.6rem; font-weight: 800; color: var(--kpi-color); line-height: 1; }
    .ea-kpi-label { font-size: 0.72rem; color: var(--text-secondary); margin-top: 0.25rem; font-weight: 600; }

    /* Sections */
    .ea-section { background: var(--bg-secondary); border: 2px solid var(--border-color); border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.25rem; }

    /* Prep bar */
    .ea-prep-labels { display:flex; justify-content:space-between; font-size:0.82rem; color:var(--text-secondary); margin-bottom:0.5rem; }
    .ea-big-progress { height: 18px; background: var(--border-color); border-radius: 999px; overflow: hidden; }
    .ea-big-progress-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #a78bfa); border-radius: 999px; transition: width 0.6s ease; }
    .ea-prep-sub { font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.5rem; text-align: center; }

    /* Charts grid */
    .ea-charts-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.25rem; }
    .ea-chart-card { background: var(--bg-secondary); border: 2px solid var(--border-color); border-radius: 0.75rem; padding: 1.25rem; }
    .ea-chart-wrap { max-height: 220px; }
    .ea-chart-wrap-wide { height: 180px; }

    /* Exam breakdown */
    .ea-exam-breakdown { display: flex; flex-direction: column; gap: 0.75rem; }
    .ea-breakdown-card { background: var(--bg-secondary); border: 2px solid var(--border-color); border-radius: 0.625rem; padding: 0.9rem 1rem; }
    .ea-bd-ok  { border-color: var(--border-color) !important; }
    .ea-bd-warning { background: #fffbeb !important; border-color: #fde68a !important; }
    .ea-bd-danger  { background: #fef2f2 !important; border-color: #fecaca !important; }
    body.dark-mode .ea-bd-warning { background: #1c1a00 !important; border-color: #854d0e !important; }
    body.dark-mode .ea-bd-danger  { background: #1a0000 !important; border-color: #7f1d1d !important; }

    .ea-bd-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
    .ea-bd-title  { font-weight: 700; font-size: 0.95rem; flex: 1; color: var(--text-primary); }
    .ea-bd-sub    { padding: 0.2rem 0.5rem; border-radius: 0.3rem; font-size: 0.72rem; font-weight: 600; color: #fff; }
    .ea-bd-days   { font-size: 0.78rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 0.3rem; }
    .ea-bd-days.ea-bd-danger  { background:#fee2e2; color:#dc2626; }
    .ea-bd-days.ea-bd-warning { background:#fef3c7; color:#d97706; }
    .ea-bd-days.ea-bd-ok      { background:#ede9fe; color:#7c3aed; }

    .ea-bd-progress-row { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem; }
    .ea-bd-bar  { flex: 1; height: 8px; background: var(--border-color); border-radius: 999px; overflow: hidden; }
    .ea-bd-fill { height: 100%; border-radius: 999px; transition: width 0.4s; }
    .ea-bd-pct  { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); min-width: 2.5rem; text-align: left; }

    .ea-bd-topics { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .ea-topic-pill { padding: 0.2rem 0.5rem; border-radius: 0.375rem; font-size: 0.72rem; background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb; }
    .ea-topic-pill.done { background: #dcfce7; color: #15803d; border-color: #bbf7d0; text-decoration: line-through; opacity: 0.75; }
    body.dark-mode .ea-topic-pill { background: #374151; color: #9ca3af; border-color: #4b5563; }
    body.dark-mode .ea-topic-pill.done { background: #052e16; color: #4ade80; border-color: #166534; }

    /* Insights */
    .ea-insights { display: flex; flex-direction: column; gap: 0.5rem; }
    .ea-insight { padding: 0.7rem 1rem; border-radius: 0.5rem; font-size: 0.88rem; display: flex; align-items: flex-start; gap: 0.5rem; }
    .ea-insight.success { background:#dcfce7; color:#166534; border-right: 4px solid #22c55e; }
    .ea-insight.info    { background:#eff6ff; color:#1e40af; border-right: 4px solid #3b82f6; }
    .ea-insight.warning { background:#fffbeb; color:#92400e; border-right: 4px solid #f59e0b; }
    .ea-insight.danger  { background:#fef2f2; color:#991b1b; border-right: 4px solid #ef4444; }
    body.dark-mode .ea-insight.success { background:#052e16; color:#86efac; }
    body.dark-mode .ea-insight.info    { background:#1e3a5f; color:#93c5fd; }
    body.dark-mode .ea-insight.warning { background:#1c1a00; color:#fcd34d; }
    body.dark-mode .ea-insight.danger  { background:#1a0000; color:#fca5a5; }

    @media (max-width: 600px) {
      .ea-kpi-row { grid-template-columns: repeat(3, 1fr); }
      .ea-charts-row { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
})();

// ── Global instance ─────────────────────────────────────
const examAnalytics = new ExamAnalytics();
console.log('📝 ExamAnalytics: Module loaded');
