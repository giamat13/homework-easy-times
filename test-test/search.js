// Smart Search Manager - חיפוש חכם במשימות
class SearchManager {
  constructor() {
    this.searchHistory = [];
    console.log('🔍 SearchManager: Initialized');
  }

  openSearchPanel() {
    const modal = document.createElement('div');
    modal.className = 'modal search-modal';
    modal.id = 'search-modal';
    
    modal.innerHTML = `
      <div class="modal-content search-content">
        <div class="modal-header">
          <h2>🔍 חיפוש חכם</h2>
          <button class="close-modal-btn" onclick="searchManager.closeSearchPanel()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        
        <div class="modal-body search-body">
          <div class="search-input-container">
            <input type="text" class="input search-input" id="smart-search-input" 
                   placeholder="חפש משימות, מקצועות, תגיות..." 
                   oninput="searchManager.performSearch(this.value)">
            <span class="search-icon">🔍</span>
          </div>

          <div class="search-filters">
            <button class="search-filter-btn active" data-filter="all" onclick="searchManager.setSearchFilter('all')">הכל</button>
            <button class="search-filter-btn" data-filter="homework" onclick="searchManager.setSearchFilter('homework')">משימות</button>
            <button class="search-filter-btn" data-filter="subjects" onclick="searchManager.setSearchFilter('subjects')">מקצועות</button>
            <button class="search-filter-btn" data-filter="tags" onclick="searchManager.setSearchFilter('tags')">תגיות</button>
          </div>

          <div class="search-results" id="search-results">
            <p class="search-placeholder">הקלד כדי לחפש...</p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('smart-search-input').focus();
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeSearchPanel();
    });
  }

  closeSearchPanel() {
    const modal = document.getElementById('search-modal');
    if (modal) modal.remove();
  }

  performSearch(query) {
    if (!query || query.length < 2) {
      document.getElementById('search-results').innerHTML = '<p class="search-placeholder">הקלד לפחות 2 תווים...</p>';
      return;
    }

    const results = this.searchAll(query);
    this.displayResults(results, query);
    this.addToHistory(query);
  }

  searchAll(query) {
    query = query.toLowerCase();
    
    const homeworkResults = homework.filter(h => 
      h.title.toLowerCase().includes(query) ||
      (h.description && h.description.toLowerCase().includes(query)) ||
      (h.tags && h.tags.some(tag => tag.toLowerCase().includes(query)))
    ).map(h => ({ type: 'homework', data: h }));

    const subjectResults = subjects.filter(s =>
      s.name.toLowerCase().includes(query)
    ).map(s => ({ type: 'subject', data: s }));

    const tagResults = availableTags.filter(t =>
      t.toLowerCase().includes(query)
    ).map(t => ({ type: 'tag', data: t }));

    return [...homeworkResults, ...subjectResults, ...tagResults];
  }

  displayResults(results, query) {
    const container = document.getElementById('search-results');
    
    if (results.length === 0) {
      container.innerHTML = `<p class="search-no-results">😔 לא נמצאו תוצאות עבור "${query}"</p>`;
      return;
    }

    container.innerHTML = `
      <div class="search-results-list">
        <p class="search-count">${results.length} תוצאות נמצאו</p>
        ${results.map(result => this.renderResult(result, query)).join('')}
      </div>
    `;
  }

  renderResult(result, query) {
    const highlight = (text) => {
      if (!text) return '';
      const regex = new RegExp(`(${query})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    };

    if (result.type === 'homework') {
      const hw = result.data;
      const subject = subjects.find(s => s.id == hw.subject);
      return `
        <div class="search-result-item" onclick="searchManager.selectHomework(${hw.id})">
          <div class="result-icon">📝</div>
          <div class="result-content">
            <h4>${highlight(hw.title)}</h4>
            <p>${hw.description ? highlight(hw.description.substring(0, 100)) : ''}</p>
            <div class="result-meta">
              ${subject ? `<span class="badge" style="background: ${subject.color}">${subject.name}</span>` : ''}
              <span>${new Date(hw.dueDate).toLocaleDateString('he-IL')}</span>
            </div>
          </div>
        </div>
      `;
    } else if (result.type === 'subject') {
      const s = result.data;
      const hwCount = homework.filter(h => h.subject == s.id).length;
      return `
        <div class="search-result-item" onclick="searchManager.selectSubject(${s.id})">
          <div class="result-icon">📚</div>
          <div class="result-content">
            <h4>${highlight(s.name)}</h4>
            <p>${hwCount} משימות</p>
            <span class="subject-color-preview" style="background: ${s.color}"></span>
          </div>
        </div>
      `;
    } else if (result.type === 'tag') {
      const tag = result.data;
      const hwCount = homework.filter(h => h.tags && h.tags.includes(tag)).length;
      return `
        <div class="search-result-item" onclick="searchManager.selectTag('${tag}')">
          <div class="result-icon">🏷️</div>
          <div class="result-content">
            <h4>${highlight(tag)}</h4>
            <p>${hwCount} משימות</p>
          </div>
        </div>
      `;
    }
  }

  selectHomework(id) {
    this.closeSearchPanel();
    const element = document.querySelector(`[data-homework-id="${id}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-flash');
      setTimeout(() => element.classList.remove('highlight-flash'), 2000);
    }
  }

  selectSubject(id) {
    this.closeSearchPanel();
    setFilter('subject', id);
  }

  selectTag(tag) {
    this.closeSearchPanel();
    toggleTagFilter(tag);
  }

  setSearchFilter(filter) {
    document.querySelectorAll('.search-filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.filter === filter) btn.classList.add('active');
    });
  }

  addToHistory(query) {
    if (!this.searchHistory.includes(query)) {
      this.searchHistory.unshift(query);
      if (this.searchHistory.length > 10) this.searchHistory.pop();
    }
  }
}

console.log('🔍 Creating search manager...');
const searchManager = new SearchManager();
console.log('✅ Search manager created');
