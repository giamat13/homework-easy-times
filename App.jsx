const { useState, useEffect } = React;
const { Plus, Trash2, Calendar, BookOpen, CheckCircle, Circle, AlertCircle } = lucide;

function HomeworkManager() {
  const [subjects, setSubjects] = useState([]);
  const [homework, setHomework] = useState([]);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', color: '#3b82f6' });
  const [newHomework, setNewHomework] = useState({
    subject: '',
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    completed: false
  });

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const subjectsData = localStorage.getItem('homework-subjects');
      if (subjectsData) {
        setSubjects(JSON.parse(subjectsData));
      }
      const homeworkData = localStorage.getItem('homework-list');
      if (homeworkData) {
        setHomework(JSON.parse(homeworkData));
      }
    } catch (error) {
      console.log('מערכת חדשה');
    }
  };

  const saveData = () => {
    try {
      localStorage.setItem('homework-subjects', JSON.stringify(subjects));
      localStorage.setItem('homework-list', JSON.stringify(homework));
    } catch (error) {
      console.error('שגיאה בשמירה:', error);
    }
  };

  useEffect(() => {
    if (subjects.length > 0 || homework.length > 0) {
      saveData();
    }
  }, [subjects, homework]);

  const addSubject = () => {
    if (!newSubject.name.trim()) return;
    setSubjects([...subjects, { id: Date.now(), ...newSubject }]);
    setNewSubject({ name: '', color: '#3b82f6' });
    setShowAddSubject(false);
  };

  const deleteSubject = (id) => {
    setSubjects(subjects.filter(s => s.id !== id));
    setHomework(homework.filter(h => h.subject !== id));
  };

  const addHomework = () => {
    if (!newHomework.subject || !newHomework.title.trim() || !newHomework.dueDate) return;
    setHomework([...homework, { id: Date.now(), ...newHomework }]);
    setNewHomework({
      subject: '',
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      completed: false
    });
  };

  const toggleComplete = (id) => {
    setHomework(homework.map(h => 
      h.id === id ? { ...h, completed: !h.completed } : h
    ));
  };

  const deleteHomework = (id) => {
    setHomework(homework.filter(h => h.id !== id));
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : '';
  };

  const getSubjectColor = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.color : '#3b82f6';
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate + 'T00:00:00');
    const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const sortedHomework = [...homework].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  const activeHomework = sortedHomework.filter(h => {
    if (!h.completed) return true;
    const daysLeft = getDaysUntilDue(h.dueDate);
    return daysLeft >= 0;
  });

  const archivedHomework = sortedHomework.filter(h => {
    if (!h.completed) return false;
    const daysLeft = getDaysUntilDue(h.dueDate);
    return daysLeft < 0;
  });

  const stats = {
    total: homework.length,
    completed: homework.filter(h => h.completed).length,
    pending: homework.filter(h => !h.completed).length,
    urgent: homework.filter(h => !h.completed && getDaysUntilDue(h.dueDate) <= 2).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">ניהול שיעורי בית</h1>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">סך הכל</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-gray-600">הושלמו</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">ממתינים</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
              <div className="text-sm text-gray-600">דחוף</div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Subjects Panel */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">מקצועות</h2>
            
            {!showAddSubject ? (
              <button
                onClick={() => setShowAddSubject(true)}
                className="w-full bg-blue-500 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 hover:bg-blue-600 transition mb-4"
              >
                <Plus className="w-5 h-5" />
                הוסף מקצוע
              </button>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <input
                  type="text"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  placeholder="שם המקצוע"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
                  onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                />
                <div className="flex gap-2 mb-3">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewSubject({ ...newSubject, color })}
                      className={`w-8 h-8 rounded-full border-2 ${newSubject.color === color ? 'border-gray-800' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addSubject}
                    className="flex-1 bg-green-500 text-white rounded-lg py-2 hover:bg-green-600"
                  >
                    שמור
                  </button>
                  <button
                    onClick={() => setShowAddSubject(false)}
                    className="flex-1 bg-gray-300 text-gray-700 rounded-lg py-2 hover:bg-gray-400"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {subjects.map(subject => (
                <div
                  key={subject.id}
                  className="flex items-center justify-between p-3 rounded-xl border-2 hover:shadow-md transition"
                  style={{ borderColor: subject.color }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    <span className="font-semibold text-gray-800">{subject.name}</span>
                  </div>
                  <button
                    onClick={() => deleteSubject(subject.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {subjects.length === 0 && (
                <p className="text-gray-400 text-center py-8">טרם הוספו מקצועות</p>
              )}
            </div>
          </div>

          {/* Add Homework Panel */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">הוסף שיעורי בית</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">מקצוע</label>
                <select
                  value={newHomework.subject}
                  onChange={(e) => setNewHomework({ ...newHomework, subject: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">בחר מקצוע</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">כותרת</label>
                <input
                  type="text"
                  value={newHomework.title}
                  onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
                  placeholder="למשל: תרגיל 5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">תיאור</label>
                <textarea
                  value={newHomework.description}
                  onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
                  placeholder="פרטים נוספים..."
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">תאריך הגשה</label>
                <input
                  type="date"
                  value={newHomework.dueDate}
                  onChange={(e) => setNewHomework({ ...newHomework, dueDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">עדיפות</label>
                <select
                  value={newHomework.priority}
                  onChange={(e) => setNewHomework({ ...newHomework, priority: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="low">נמוכה</option>
                  <option value="medium">בינונית</option>
                  <option value="high">גבוהה</option>
                </select>
              </div>

              <button
                onClick={addHomework}
                className="w-full bg-blue-500 text-white rounded-xl py-3 font-semibold hover:bg-blue-600 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                הוסף משימה
              </button>
            </div>
          </div>

          {/* Homework List */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">רשימת משימות</h2>
              {archivedHomework.length > 0 && (
                <button
                  onClick={() => setShowArchive(!showArchive)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                >
                  {showArchive ? 'הסתר ארכיון' : `ארכיון (${archivedHomework.length})`}
                </button>
              )}
            </div>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {(showArchive ? archivedHomework : activeHomework).map(hw => {
                const daysLeft = getDaysUntilDue(hw.dueDate);
                const isUrgent = daysLeft <= 2 && !hw.completed;
                const isOverdue = daysLeft < 0 && !hw.completed;

                return (
                  <div
                    key={hw.id}
                    className={`border-2 rounded-xl p-4 transition ${
                      hw.completed ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200 hover:shadow-md'
                    } ${isOverdue ? 'border-red-400' : ''} ${isUrgent && !isOverdue ? 'border-orange-400' : ''}`}
                    style={!hw.completed && !isOverdue && !isUrgent ? { borderColor: getSubjectColor(hw.subject) } : {}}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleComplete(hw.id)}
                        className="mt-1"
                      >
                        {hw.completed ? (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-400" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="px-2 py-1 rounded-md text-xs font-semibold text-white"
                            style={{ backgroundColor: getSubjectColor(hw.subject) }}
                          >
                            {getSubjectName(hw.subject)}
                          </span>
                          {isOverdue && (
                            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-red-500 text-white">
                              איחור!
                            </span>
                          )}
                          {isUrgent && !isOverdue && (
                            <span className="px-2 py-1 rounded-md text-xs font-semibold bg-orange-500 text-white">
                              דחוף
                            </span>
                          )}
                        </div>

                        <h3 className={`font-bold text-gray-800 mb-1 ${hw.completed ? 'line-through text-gray-500' : ''}`}>
                          {hw.title}
                        </h3>
                        
                        {hw.description && (
                          <p className="text-sm text-gray-600 mb-2">{hw.description}</p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(hw.dueDate).toLocaleDateString('he-IL')}
                          </span>
                          {!hw.completed && (
                            <span className={`font-semibold ${
                              isOverdue ? 'text-red-600' : 
                              isUrgent ? 'text-orange-600' : 
                              'text-gray-600'
                            }`}>
                              {isOverdue ? `באיחור של ${Math.abs(daysLeft)} ימים` :
                               daysLeft === 0 ? 'היום!' :
                               daysLeft === 1 ? 'מחר' :
                               daysLeft === 2 ? 'מחרתיים' :
                               `עוד ${daysLeft} ימים`}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => deleteHomework(hw.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {(showArchive ? archivedHomework : activeHomework).length === 0 && (
                <p className="text-gray-400 text-center py-16">
                  {showArchive ? 'אין פריטים בארכיון' : 'אין שיעורי בית להצגה'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
                }
