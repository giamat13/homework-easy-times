// Authentication Manager with Guest Mode Support
// ===============================================

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.auth = null;
    this.db = null;
    this.authStateListener = null;
    this.isGuestMode = false;
    
    console.log('🔐 AuthManager: Initialized with Guest Mode support');
  }

  // ==================== אתחול ====================
  
  async initialize() {
    console.log('🔐 AuthManager: Starting initialization...');
    
    try {
      // אתחול Firebase
      const firebase = initializeFirebase();
      this.auth = firebase.auth;
      this.db = firebase.db;
      
      // בדיקה אם יש משתמש אורח קיים
      if (isGuestMode()) {
        console.log('👤 AuthManager: Found existing guest session');
        await this.continueAsGuest();
      } else {
        // האזנה לשינויים בסטטוס האימות (משתמשים רגילים)
        this.setupAuthStateListener();
      }
      
      console.log('✅ AuthManager: Initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ AuthManager: Initialization failed:', error);
      this.showError('שגיאה באתחול מערכת האימות');
      return false;
    }
  }

  setupAuthStateListener() {
    console.log('👂 AuthManager: Setting up auth state listener...');
    
    this.authStateListener = this.auth.onAuthStateChanged(async (user) => {
      console.log('🔐 Auth state changed:', user ? user.email : 'null');
      
      if (user) {
        // משתמש מחובר (לא אורח)
        this.isGuestMode = false;
        this.currentUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          emailVerified: user.emailVerified,
          photoURL: user.photoURL,
          createdAt: user.metadata.creationTime,
          lastLogin: user.metadata.lastSignInTime,
          isGuest: false
        };
        
        console.log('✅ User logged in:', this.currentUser.email);
        
        // טעינת נתוני המשתמש מ-Firestore
        await this.loadUserData();
        
        // הסתרת מסך התחברות והצגת האפליקציה
        this.hideAuthUI();
        this.showApp();
        
        // עדכון UI
        this.updateUserUI();
        
        // אירוע custom
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: this.currentUser }));
        
      } else {
        // משתמש מנותק
        console.log('⏸️ User logged out');
        this.currentUser = null;
        
        // הצגת מסך התחברות (אם לא במצב אורח)
        if (!this.isGuestMode) {
          this.showAuthUI();
          this.hideApp();
        }
        
        // אירוע custom
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
      }
    });
  }

  // ==================== מצב אורח ====================
  
  async continueAsGuest() {
    console.log('👤 continueAsGuest: Entering guest mode...');
    
    this.isGuestMode = true;
    const guestUID = getGuestUID();
    
    this.currentUser = {
      uid: guestUID,
      displayName: 'אורח',
      email: null,
      emailVerified: false,
      photoURL: null,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isGuest: true
    };
    
    console.log('✅ Guest session started:', guestUID);
    
    // טעינת נתוני אורח מ-localStorage
    await this.loadGuestData();
    
    // הסתרת מסך התחברות והצגת האפליקציה
    this.hideAuthUI();
    this.showApp();
    
    // עדכון UI
    this.updateUserUI();
    
    // אירוע custom
    window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: this.currentUser }));
  }

  async loadGuestData() {
    console.log('📥 loadGuestData: Loading guest data from localStorage...');
    
    try {
      // טעינת נתונים מ-localStorage עם prefix של אורח
      const guestPrefix = GUEST_MODE.localStoragePrefix;
      
      // טעינת מקצועות
      const subjectsData = localStorage.getItem(guestPrefix + 'homework-subjects');
      if (subjectsData) {
        subjects = JSON.parse(subjectsData);
        console.log('✅ Loaded subjects:', subjects.length);
      }
      
      // טעינת משימות
      const homeworkData = localStorage.getItem(guestPrefix + 'homework-list');
      if (homeworkData) {
        homework = JSON.parse(homeworkData);
        console.log('✅ Loaded homework:', homework.length);
      }
      
      // עדכון UI
      if (typeof render === 'function') {
        render();
      }
      
      console.log('✅ Guest data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading guest data:', error);
    }
  }

  async saveGuestData() {
    console.log('💾 saveGuestData: Saving guest data to localStorage...');
    
    try {
      const guestPrefix = GUEST_MODE.localStoragePrefix;
      
      // שמירת מקצועות
      localStorage.setItem(guestPrefix + 'homework-subjects', JSON.stringify(subjects));
      
      // שמירת משימות
      localStorage.setItem(guestPrefix + 'homework-list', JSON.stringify(homework));
      
      console.log('✅ Guest data saved successfully');
    } catch (error) {
      console.error('❌ Error saving guest data:', error);
    }
  }

  async convertGuestToUser(email, password, displayName) {
    console.log('🔄 convertGuestToUser: Converting guest to registered user...');
    
    if (!this.isGuestMode) {
      console.warn('⚠️ Not in guest mode, cannot convert');
      return false;
    }
    
    try {
      // שמירת נתוני האורח
      const guestData = {
        subjects: subjects.slice(),
        homework: homework.slice()
      };
      
      // יצירת משתמש חדש
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // עדכון שם תצוגה
      if (displayName) {
        await user.updateProfile({ displayName });
      }
      
      // העברת הנתונים ל-Firestore
      await this.createUserDocument(user.uid, {
        email: user.email,
        displayName: displayName || user.email.split('@')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        emailVerified: false,
        convertedFromGuest: true
      });
      
      // שמירת נתוני האורח ל-Firestore
      const batch = this.db.batch();
      
      // שמירת מקצועות
      guestData.subjects.forEach(subject => {
        const docRef = this.db.collection('subjects').doc(user.uid).collection('items').doc(subject.id.toString());
        batch.set(docRef, subject);
      });
      
      // שמירת משימות
      guestData.homework.forEach(hw => {
        const docRef = this.db.collection('homework').doc(user.uid).collection('items').doc(hw.id.toString());
        batch.set(docRef, hw);
      });
      
      await batch.commit();
      
      // מחיקת נתוני אורח
      clearGuestData();
      this.isGuestMode = false;
      
      // שליחת אימות אימייל
      await user.sendEmailVerification();
      
      this.showSuccess('החשבון נוצר בהצלחה! הנתונים שלך הועברו. נשלח אימייל אימות.');
      console.log('✅ Guest converted to user successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Error converting guest to user:', error);
      this.handleAuthError(error);
      return false;
    }
  }

  // ==================== רישום ====================
  
  async signup(email, password, displayName) {
    console.log('📝 Signup: Attempting signup for', email);
    
    try {
      // וולידציה
      if (!this.validateEmail(email)) {
        throw new Error('כתובת אימייל לא תקינה');
      }
      
      if (password.length < 6) {
        throw new Error('הסיסמה חייבת להכיל לפחות 6 תווים');
      }
      
      // יצירת משתמש
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      console.log('✅ Signup: User created:', user.uid);
      
      // עדכון שם תצוגה
      if (displayName) {
        await user.updateProfile({ displayName });
        console.log('✅ Signup: Display name updated');
      }
      
      // שליחת אימות אימייל
      await this.sendVerificationEmail();
      
      // יצירת מסמך משתמש ב-Firestore
      await this.createUserDocument(user.uid, {
        email: user.email,
        displayName: displayName || user.email.split('@')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        emailVerified: false
      });
      
      this.showSuccess('החשבון נוצר בהצלחה! נשלח אימייל אימות.');
      console.log('✅ Signup: Complete');
      
      return user;
    } catch (error) {
      console.error('❌ Signup error:', error);
      this.handleAuthError(error);
      throw error;
    }
  }

  // ==================== התחברות ====================
  
  async login(email, password) {
    console.log('🔑 Login: Attempting login for', email);
    
    try {
      // וולידציה
      if (!this.validateEmail(email)) {
        throw new Error('כתובת אימייל לא תקינה');
      }
      
      if (!password) {
        throw new Error('נא להזין סיסמה');
      }
      
      // התחברות
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      console.log('✅ Login: Success for', user.email);
      
      // עדכון זמן התחברות אחרון
      await this.updateUserDocument(user.uid, {
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      this.showSuccess(`ברוך הבא, ${user.displayName || user.email}!`);
      
      return user;
    } catch (error) {
      console.error('❌ Login error:', error);
      this.handleAuthError(error);
      throw error;
    }
  }

  // ==================== התנתקות ====================
  
  async logout() {
    console.log('👋 Logout: Logging out user...');
    
    try {
      if (this.isGuestMode) {
        // התנתקות אורח
        console.log('👋 Logging out guest...');
        this.isGuestMode = false;
        this.currentUser = null;
        
        // הצגת מסך התחברות
        this.showAuthUI();
        this.hideApp();
        
        this.showSuccess('התנתקת בהצלחה');
      } else {
        // התנתקות משתמש רגיל
        await this.auth.signOut();
        console.log('✅ Logout: Success');
        this.showSuccess('התנתקת בהצלחה');
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      this.showError('שגיאה בהתנתקות');
      throw error;
    }
  }

  // ==================== Google Sign-In ====================
  
  async loginWithGoogle() {
    console.log('🔑 Google Login: Attempting...');
    
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await this.auth.signInWithPopup(provider);
      const user = result.user;
      
      console.log('✅ Google Login: Success');
      
      // בדיקה אם זה משתמש חדש - צור מסמך
      if (result.additionalUserInfo.isNewUser) {
        await this.createUserDocument(user.uid, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          emailVerified: user.emailVerified,
          provider: 'google'
        });
      }
      
      return user;
    } catch (error) {
      console.error('❌ Google Login error:', error);
      this.handleAuthError(error);
      throw error;
    }
  }

  // ==================== שכחתי סיסמה ====================
  
  async resetPassword(email) {
    console.log('🔐 Password Reset: Sending email to', email);
    
    try {
      if (!this.validateEmail(email)) {
        throw new Error('כתובת אימייל לא תקינה');
      }
      
      await this.auth.sendPasswordResetEmail(email);
      
      console.log('✅ Password Reset: Email sent');
      this.showSuccess('נשלח אימייל לאיפוס סיסמה');
      
      return true;
    } catch (error) {
      console.error('❌ Password Reset error:', error);
      this.handleAuthError(error);
      throw error;
    }
  }

  // ==================== אימות אימייל ====================
  
  async sendVerificationEmail() {
    console.log('📧 Verification: Sending email...');
    
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error('אין משתמש מחובר');
      }
      
      await user.sendEmailVerification();
      console.log('✅ Verification: Email sent');
      this.showSuccess('נשלח אימייל אימות');
      
      return true;
    } catch (error) {
      console.error('❌ Verification error:', error);
      this.handleAuthError(error);
      throw error;
    }
  }

  // ==================== Firestore ====================
  
  async createUserDocument(uid, data) {
    console.log('📝 Firestore: Creating user document for', uid);
    
    try {
      await this.db.collection('users').doc(uid).set(data);
      console.log('✅ Firestore: User document created');
    } catch (error) {
      console.error('❌ Firestore: Error creating user document:', error);
    }
  }

  async updateUserDocument(uid, data) {
    console.log('📝 Firestore: Updating user document for', uid);
    
    try {
      await this.db.collection('users').doc(uid).update(data);
      console.log('✅ Firestore: User document updated');
    } catch (error) {
      console.error('❌ Firestore: Error updating user document:', error);
    }
  }

  async loadUserData() {
    console.log('📥 Firestore: Loading user data...');
    
    try {
      const uid = this.currentUser.uid;
      
      // טעינת מקצועות
      const subjectsSnapshot = await this.db
        .collection('subjects')
        .doc(uid)
        .collection('items')
        .get();
      
      if (!subjectsSnapshot.empty) {
        subjects = subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('✅ Loaded subjects:', subjects.length);
      }
      
      // טעינת משימות
      const homeworkSnapshot = await this.db
        .collection('homework')
        .doc(uid)
        .collection('items')
        .get();
      
      if (!homeworkSnapshot.empty) {
        homework = homeworkSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('✅ Loaded homework:', homework.length);
      }
      
      // עדכון UI
      if (typeof render === 'function') {
        render();
      }
      
      console.log('✅ User data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      this.showError('שגיאה בטעינת נתונים');
    }
  }

  async saveUserData() {
    console.log('💾 Firestore: Saving user data...');
    
    // אם במצב אורח - שמור ב-localStorage
    if (this.isGuestMode) {
      return this.saveGuestData();
    }
    
    try {
      const uid = this.currentUser.uid;
      const batch = this.db.batch();
      
      // שמירת מקצועות
      const subjectsRef = this.db.collection('subjects').doc(uid).collection('items');
      subjects.forEach(subject => {
        const docRef = subjectsRef.doc(subject.id.toString());
        batch.set(docRef, subject);
      });
      
      // שמירת משימות
      const homeworkRef = this.db.collection('homework').doc(uid).collection('items');
      homework.forEach(hw => {
        const docRef = homeworkRef.doc(hw.id.toString());
        batch.set(docRef, hw);
      });
      
      await batch.commit();
      console.log('✅ User data saved successfully');
    } catch (error) {
      console.error('❌ Error saving user data:', error);
      this.showError('שגיאה בשמירת נתונים');
    }
  }

  // ==================== UI ====================
  
  showAuthUI() {
    console.log('🎨 UI: Showing auth screen');
    
    let authContainer = document.getElementById('auth-container');
    if (!authContainer) {
      authContainer = document.createElement('div');
      authContainer.id = 'auth-container';
      document.body.appendChild(authContainer);
    }
    
    authContainer.classList.remove('hidden');
    authContainer.innerHTML = this.getAuthHTML();
    
    // הסתרת האפליקציה
    const appContainer = document.querySelector('.container');
    if (appContainer) {
      appContainer.style.display = 'none';
    }
    
    this.attachAuthEventListeners();
  }

  hideAuthUI() {
    console.log('🎨 UI: Hiding auth screen');
    
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
      authContainer.classList.add('hidden');
    }
  }

  showApp() {
    console.log('🎨 UI: Showing app');
    
    const appContainer = document.querySelector('.container');
    if (appContainer) {
      appContainer.style.display = 'block';
    }
  }

  hideApp() {
    console.log('🎨 UI: Hiding app');
    
    const appContainer = document.querySelector('.container');
    if (appContainer) {
      appContainer.style.display = 'none';
    }
  }

  updateUserUI() {
    console.log('🎨 UI: Updating user info');
    
    // עדכון כפתור משתמש בכותרת
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && this.currentUser) {
      let userBtn = document.getElementById('user-menu-btn');
      if (!userBtn) {
        userBtn = document.createElement('button');
        userBtn.id = 'user-menu-btn';
        userBtn.className = 'settings-btn';
        userBtn.title = this.currentUser.isGuest ? 'אורח' : this.currentUser.email;
        userBtn.innerHTML = this.currentUser.isGuest ? '👤' : `
          <svg width="24" height="24" fill="currentColor">
            <circle cx="12" cy="8" r="4"/>
            <path d="M12 14c-5 0-9 2-9 5v2h18v-2c0-3-4-5-9-5z"/>
          </svg>
        `;
        userBtn.onclick = () => this.showUserMenu();
        
        headerActions.insertBefore(userBtn, headerActions.firstChild);
      }
    }
  }

  showUserMenu() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'user-menu-modal';
    
    let menuContent = '';
    
    if (this.isGuestMode) {
      // תפריט אורח
      menuContent = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="width: 80px; height: 80px; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1rem;">
            👤
          </div>
          <h3 style="margin: 0.5rem 0;">אורח</h3>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">הנתונים שלך שמורים מקומית</p>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem;">
          <p style="margin: 0; font-size: 0.875rem; color: #856404;">
            <strong>💡 רוצה לשמור את הנתונים בענן?</strong><br>
            צור חשבון וכל הנתונים שלך יועברו אוטומטית!
          </p>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          <button class="btn btn-primary" onclick="authManager.showConvertGuestModal(); document.getElementById('user-menu-modal').remove();">
            🔒 צור חשבון והעבר נתונים
          </button>
          <button class="btn btn-secondary" onclick="if(confirm('האם אתה בטוח? הנתונים שלך יימחקו!')) { authManager.clearGuestAndLogout(); document.getElementById('user-menu-modal').remove(); }">
            🗑️ מחק נתונים והתנתק
          </button>
          <button class="btn btn-secondary" onclick="authManager.logout(); document.getElementById('user-menu-modal').remove();">
            👋 התנתק (שמור נתונים)
          </button>
        </div>
      `;
    } else {
      // תפריט משתמש רגיל
      menuContent = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
          ${this.currentUser.photoURL 
            ? `<img src="${this.currentUser.photoURL}" alt="Profile" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 1rem;">` 
            : '<div style="width: 80px; height: 80px; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1rem;">' + this.currentUser.displayName.charAt(0).toUpperCase() + '</div>'}
          <h3 style="margin: 0.5rem 0;">${this.currentUser.displayName}</h3>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">${this.currentUser.email}</p>
          ${!this.currentUser.emailVerified ? '<p style="color: #f59e0b; font-size: 0.875rem;">⚠️ אימייל לא מאומת</p>' : ''}
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${!this.currentUser.emailVerified ? `
            <button class="btn btn-secondary" onclick="authManager.sendVerificationEmail()">
              📧 שלח אימייל אימות מחדש
            </button>
          ` : ''}
          <button class="btn btn-secondary" onclick="authManager.showResetPasswordModal()">
            🔐 שנה סיסמה
          </button>
          <button class="btn btn-danger" onclick="authManager.logout(); document.getElementById('user-menu-modal').remove();">
            👋 התנתק
          </button>
        </div>
        
        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); font-size: 0.75rem; color: var(--text-secondary);">
          <p>נוצר: ${new Date(this.currentUser.createdAt).toLocaleDateString('he-IL')}</p>
          <p>התחברות אחרונה: ${new Date(this.currentUser.lastLogin).toLocaleDateString('he-IL')}</p>
        </div>
      `;
    }
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h2>👤 חשבון משתמש</h2>
          <button class="close-modal-btn" onclick="document.getElementById('user-menu-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          ${menuContent}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  showConvertGuestModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'convert-guest-modal';
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 450px;">
        <div class="modal-header">
          <h2>🔒 צור חשבון</h2>
          <button class="close-modal-btn" onclick="document.getElementById('convert-guest-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          <div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem;">
            <p style="margin: 0; font-size: 0.875rem; color: #065f46;">
              <strong>✨ כל הנתונים שלך יישמרו!</strong><br>
              המקצועות והמשימות שיצרת יועברו אוטומטית לחשבון החדש.
            </p>
          </div>
          
          <div class="form-group">
            <label>שם מלא</label>
            <input type="text" class="input" id="convert-name" placeholder="השם שלך">
          </div>
          <div class="form-group">
            <label>אימייל</label>
            <input type="email" class="input" id="convert-email" placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label>סיסמה</label>
            <input type="password" class="input" id="convert-password" placeholder="לפחות 6 תווים">
          </div>
          <div class="form-group">
            <label>אימות סיסמה</label>
            <input type="password" class="input" id="convert-password-confirm" placeholder="הזן סיסמה שוב">
          </div>
          
          <button class="btn btn-primary" id="convert-guest-btn">
            🔒 צור חשבון והעבר נתונים
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const convertBtn = document.getElementById('convert-guest-btn');
    convertBtn.addEventListener('click', async () => {
      const name = document.getElementById('convert-name').value;
      const email = document.getElementById('convert-email').value;
      const password = document.getElementById('convert-password').value;
      const passwordConfirm = document.getElementById('convert-password-confirm').value;
      
      if (password !== passwordConfirm) {
        this.showError('הסיסמאות לא תואמות');
        return;
      }
      
      convertBtn.disabled = true;
      convertBtn.textContent = '⏳ יוצר חשבון...';
      
      const success = await this.convertGuestToUser(email, password, name);
      
      if (success) {
        modal.remove();
      } else {
        convertBtn.disabled = false;
        convertBtn.innerHTML = '🔒 צור חשבון והעבר נתונים';
      }
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  clearGuestAndLogout() {
    clearGuestData();
    this.logout();
  }

  showResetPasswordModal() {
    document.getElementById('user-menu-modal')?.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'reset-password-modal';
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-header">
          <h2>🔐 שנה סיסמה</h2>
          <button class="close-modal-btn" onclick="document.getElementById('reset-password-modal').remove()">
            <svg width="24" height="24"><use href="#x"></use></svg>
          </button>
        </div>
        <div class="modal-body">
          <p style="margin-bottom: 1rem; color: var(--text-secondary);">
            נשלח אליך אימייל עם קישור לאיפוס הסיסמה
          </p>
          <button class="btn btn-primary" onclick="authManager.resetPassword('${this.currentUser.email}'); document.getElementById('reset-password-modal').remove();">
            שלח אימייל איפוס
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  getAuthHTML() {
    return `
      <div class="auth-screen">
        <div class="auth-card">
          <div class="auth-header">
            <svg width="48" height="48" style="color: #3b82f6;">
              <use href="#book-open"></use>
            </svg>
            <h1>ניהול שיעורי בית</h1>
            <p>התחבר כדי לגשת למשימות שלך</p>
          </div>

          <!-- Guest Mode Button -->
          <div style="padding: 1.5rem; text-align: center; border-bottom: 2px solid var(--border-color);">
            <button class="btn btn-primary" onclick="authManager.continueAsGuest(); document.getElementById('auth-container').classList.add('hidden');" style="width: 100%; background: linear-gradient(135deg, #10b981, #059669);">
              👤 המשך כאורח
            </button>
            <p style="margin-top: 0.75rem; font-size: 0.875rem; color: var(--text-secondary);">
              ניתן להתחיל מייד ללא הרשמה. הנתונים יישמרו מקומית.
            </p>
          </div>

          <!-- Login Form -->
          <div id="login-form" class="auth-form">
            <h2>התחברות</h2>
            <div class="form-group">
              <label>אימייל</label>
              <input type="email" class="input" id="login-email" placeholder="your@email.com" autocomplete="email">
            </div>
            <div class="form-group">
              <label>סיסמה</label>
              <input type="password" class="input" id="login-password" placeholder="••••••••" autocomplete="current-password">
            </div>
            <button class="btn btn-primary" id="login-btn">
              🔑 התחבר
            </button>
            <div class="auth-links">
              <a href="#" id="show-signup">אין לך חשבון? הירשם</a>
              <a href="#" id="show-reset">שכחת סיסמה?</a>
            </div>
          </div>

          <!-- Signup Form -->
          <div id="signup-form" class="auth-form hidden">
            <h2>הרשמה</h2>
            <div class="form-group">
              <label>שם מלא</label>
              <input type="text" class="input" id="signup-name" placeholder="השם שלך" autocomplete="name">
            </div>
            <div class="form-group">
              <label>אימייל</label>
              <input type="email" class="input" id="signup-email" placeholder="your@email.com" autocomplete="email">
            </div>
            <div class="form-group">
              <label>סיסמה</label>
              <input type="password" class="input" id="signup-password" placeholder="לפחות 6 תווים" autocomplete="new-password">
            </div>
            <div class="form-group">
              <label>אימות סיסמה</label>
              <input type="password" class="input" id="signup-password-confirm" placeholder="הזן סיסמה שוב" autocomplete="new-password">
            </div>
            <button class="btn btn-primary" id="signup-btn">
              📝 צור חשבון
            </button>
            <div class="auth-links">
              <a href="#" id="show-login">כבר יש לך חשבון? התחבר</a>
            </div>
          </div>

          <!-- Reset Password Form -->
          <div id="reset-form" class="auth-form hidden">
            <h2>איפוס סיסמה</h2>
            <p style="margin-bottom: 1rem; color: var(--text-secondary); font-size: 0.875rem;">
              הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
            </p>
            <div class="form-group">
              <label>אימייל</label>
              <input type="email" class="input" id="reset-email" placeholder="your@email.com" autocomplete="email">
            </div>
            <button class="btn btn-primary" id="reset-btn">
              📧 שלח אימייל
            </button>
            <div class="auth-links">
              <a href="#" id="back-to-login">חזור להתחברות</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachAuthEventListeners() {
    console.log('🎧 AuthManager: Attaching event listeners...');
    
    // Login
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        loginBtn.disabled = true;
        loginBtn.textContent = '⏳ מתחבר...';
        
        try {
          await this.login(email, password);
        } catch (error) {
          loginBtn.disabled = false;
          loginBtn.innerHTML = '🔑 התחבר';
        }
      });
    }
    
    // Signup
    const signupBtn = document.getElementById('signup-btn');
    if (signupBtn) {
      signupBtn.addEventListener('click', async () => {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const passwordConfirm = document.getElementById('signup-password-confirm').value;
        
        if (password !== passwordConfirm) {
          this.showError('הסיסמאות לא תואמות');
          return;
        }
        
        signupBtn.disabled = true;
        signupBtn.textContent = '⏳ יוצר חשבון...';
        
        try {
          await this.signup(email, password, name);
        } catch (error) {
          signupBtn.disabled = false;
          signupBtn.innerHTML = '📝 צור חשבון';
        }
      });
    }
    
    // Reset Password
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        const email = document.getElementById('reset-email').value;
        
        resetBtn.disabled = true;
        resetBtn.textContent = '⏳ שולח...';
        
        try {
          await this.resetPassword(email);
          resetBtn.textContent = '✅ נשלח!';
          setTimeout(() => {
            document.getElementById('back-to-login').click();
          }, 2000);
        } catch (error) {
          resetBtn.disabled = false;
          resetBtn.innerHTML = '📧 שלח אימייל';
        }
      });
    }
    
    // Form Switching
    document.getElementById('show-signup')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').classList.add('hidden');
      document.getElementById('signup-form').classList.remove('hidden');
    });
    
    document.getElementById('show-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('signup-form').classList.add('hidden');
      document.getElementById('login-form').classList.remove('hidden');
    });
    
    document.getElementById('show-reset')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').classList.add('hidden');
      document.getElementById('reset-form').classList.remove('hidden');
    });
    
    document.getElementById('back-to-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('reset-form').classList.add('hidden');
      document.getElementById('login-form').classList.remove('hidden');
    });
    
    // Enter key support
    ['login-email', 'login-password', 'signup-email', 'signup-password', 'signup-password-confirm', 'reset-email'].forEach(id => {
      document.getElementById(id)?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          if (id.startsWith('login')) loginBtn?.click();
          else if (id.startsWith('signup')) signupBtn?.click();
          else if (id.startsWith('reset')) resetBtn?.click();
        }
      });
    });
  }

  // ==================== Utilities ====================
  
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  handleAuthError(error) {
    console.error('🔥 Auth Error:', error.code, error.message);
    
    const errorMessages = {
      'auth/email-already-in-use': 'האימייל כבר קיים במערכת',
      'auth/invalid-email': 'כתובת אימייל לא תקינה',
      'auth/operation-not-allowed': 'פעולה זו לא מורשית',
      'auth/weak-password': 'הסיסמה חלשה מדי',
      'auth/user-disabled': 'המשתמש חסום',
      'auth/user-not-found': 'המשתמש לא קיים',
      'auth/wrong-password': 'סיסמה שגויה',
      'auth/too-many-requests': 'יותר מדי ניסיונות. נסה שוב מאוחר יותר',
      'auth/network-request-failed': 'שגיאת רשת. בדוק את החיבור לאינטרנט'
    };
    
    const message = errorMessages[error.code] || error.message;
    this.showError(message);
  }

  showSuccess(message) {
    if (typeof notifications !== 'undefined' && notifications.showInAppNotification) {
      notifications.showInAppNotification(message, 'success');
    } else {
      alert(message);
    }
  }

  showError(message) {
    if (typeof notifications !== 'undefined' && notifications.showInAppNotification) {
      notifications.showInAppNotification(message, 'error');
    } else {
      alert(message);
    }
  }
}

// יצירת אובייקט גלובלי
console.log('🔐 Creating global auth manager...');
const authManager = new AuthManager();
console.log('✅ Global auth manager created with Guest Mode');

// אתחול אוטומטי
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🔐 auth.js: Initializing...');
  await authManager.initialize();
  console.log('✅ auth.js: Initialized');
});
