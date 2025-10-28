let subjects = [];
let homework = [];
let showArchive = false;

// --- Load data from localStorage ---
function loadData() {
  subjects = JSON.parse(localStorage.getItem('subjects') || '[]');
  homework = JSON.parse(localStorage.getItem('homework') || '[]');
  render();
}

// --- Save data to localStorage ---
function saveData() {
  localStorage.setItem('subjects', JSON.stringify(subjects));
  localStorage.setItem('homework', JSON.stringify(homework));
}

// --- Main render function ---
function render() {
  renderSubjects();
  renderColorPicker();
  renderHomework();
}

// --- Render subjects list and select ---
function renderSubjects() {
  const list = document.getElementById('subjects-list');
  const select = document.getElementById('hw-subject');
  list.innerHTML = '';
  select.innerHTML = '';

  subjects.forEach(s => {
    const div = document.createElement('div');
    div.className = 'subject';
    div.style.background = s.color;
    div.textContent = s.name;
    list.appendChild(div);

    const opt = document.createElement('option');
    opt.value = s.name;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
}

// --- Render color picker options ---
function renderColorPicker() {
  const picker = document.getElementById('color-picker');
  picker.innerHTML = '';
  const colors = ['#007aff', '#ff3b30', '#4cd964', '#ffcc00', '#8e44ad', '#ff9500'];

  colors.forEach(color => {
    const c = document.createElement('div');
    c.className = 'color-option';
    c.style.background = color;
    c.onclick = () => {
      document.querySelectorAll('.color-option').forEach(el => el.style.border = '2px solid #ddd');
      c.style.border = '2px solid black';
      picker.dataset.selected = color;
    };
    picker.appendChild(c);
  });
}

// --- Add new subject ---
function addSubject() {
  const name = document.getElementById('subject-name').value.trim();
  const color = document.getElementById('color-picker').dataset.selected || '#007aff';
  if (!name) return alert('נא להזין שם מקצוע');

  subjects.push({ name, color });
  document.getElementById('subject-name').value = '';
  document.getElementById('add-subject-form').classList.add('hidden');
  document.getElementById('show-add-subject').classList.remove('hidden');
  saveData();
  render();
}

// --- Render homework list ---
function renderHomework() {
  const list = document.getElementById('homework-list');
  list.innerHTML = '';

  homework
    .filter(h => (showArchive ? true : !h.completed))
    .forEach(h => {
      const card = document.createElement('div');
      card.className = `hw-card priority-${h.priority} ${h.completed ? 'completed' : ''}`;

      const subject = subjects.find(s => s.name === h.subject);
      if (subject) card.style.borderColor = subject.color;

      card.innerHTML = `
        <div class="hw-header">
          <b>${h.title}</b>
          <div>
            <button onclick="toggleComplete('${h.id}')">${h.completed ? '↩️ בטל השלמה' : '✅ סמן הושלם'}</button>
            <button onclick="deleteHomework('${h.id}')">🗑️ מחק</button>
          </div>
        </div>
        <div>📘 מקצוע: ${h.subject}</div>
        <div>🕓 תאריך: ${h.date}</div>
        <div>⚙️ עדיפות: ${h.priority}</div>
        <div>${h.desc}</div>
      `;
      list.appendChild(card);
    });
}

// --- Add new homework ---
function addHomework() {
  const subject = document.getElementById('hw-subject').value;
  const title = document.getElementById('hw-title').value.trim();
  const desc = document.getElementById('hw-desc').value.trim();
  const date = document.getElementById('hw-date').value;
  const priority = document.getElementById('hw-priority').value;

  if (!subject || !title || !date) return alert('נא למלא את כל השדות הדרושים');

  homework.push({
    id: Date.now().toString(),
    subject,
    title,
    desc,
    date,
    priority,
    completed: false
  });

  document.getElementById('hw-title').value = '';
  document.getElementById('hw-desc').value = '';
  document.getElementById('hw-date').value = '';
  document.getElementById('hw-priority').value = 'medium';

  saveData();
  render();
}

// --- Toggle completed homework ---
function toggleComplete(id) {
  const hw = homework.find(h => h.id === id);
  if (hw) {
    hw.completed = !hw.completed;
    saveData();
    render();
  }
}

// --- Delete homework ---
function deleteHomework(id) {
  if (confirm('האם אתה בטוח שברצונך למחוק את המשימה הזו?')) {
    homework = homework.filter(h => h.id !== id);
    saveData();
    render();
  }
}

// --- Event listeners ---
document.getElementById('archive-toggle').addEventListener('click', () => {
  showArchive = !showArchive;
  renderHomework();
});

document.getElementById('show-add-subject').addEventListener('click', () => {
  document.getElementById('add-subject-form').classList.remove('hidden');
  document.getElementById('show-add-subject').classList.add('hidden');
  renderColorPicker();
});

document.getElementById('cancel-subject').addEventListener('click', () => {
  document.getElementById('add-subject-form').classList.add('hidden');
  document.getElementById('show-add-subject').classList.remove('hidden');
});

document.getElementById('save-subject').addEventListener('click', addSubject);
document.getElementById('add-homework').addEventListener('click', addHomework);

// --- Initialize ---
window.addEventListener('DOMContentLoaded', loadData);
