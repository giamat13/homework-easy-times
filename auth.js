// Authentication Manager with Guest Mode Support + Google Sign-In
// =================================================================

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.auth = null;
    this.db = null;
    this.authStateListener = null;
    this.isGuestMode = false;
    this.autoSyncEnabled = true; // סנכרון אוטומטי
    
    console.log('🔐 AuthManager: Initialized with Guest Mode + Google Sign-In support');
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
      
      // שליחת אימות אימייל מיד
      await user.sendEmailVerification({
        url: window.location.href,
        handleCodeInApp: false
      });
      console.log('📧 Verification email sent to:', user.email);
      
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
      
      this.showSuccess('החשבון נוצר בהצלחה! הנתונים שלך הועברו. בדוק את האימייל לאימות החשבון.');
      console.log('✅ Guest converted to user successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Error converting guest to user:', error);
      this.handleAuthError(error);
      return false;
    }
  }

  // ==================== פעולות אימות ====================
  
  async signup(email, password, displayName) {
    console.log('📝 signup: Creating new user account...');
    
    if (!this.validateEmail(email)) {
      this.showError('כתובת אימייל לא תקינה');
      return false;
    }
    
    if (password.length < 6) {
      this.showError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return false;
    }
    
    try {
      // יצירת משתמש חדש
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      console.log('✅ User created:', user.uid);
      
      // עדכון שם תצוגה
      if (displayName) {
        await user.updateProfile({ displayName });
      }
      
      // שליחת אימות אימייל מיד
      await user.sendEmailVerification({
        url: window.location.href,
        handleCodeInApp: false
      });
      console.log('📧 Verification email sent to:', user.email);
      
      // יצירת מסמך משתמש ב-Firestore
      await this.createUserDocument(user.uid, {
        email: user.email,
        displayName: displayName || user.email.split('@')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        emailVerified: false
      });
      
      this.showSuccess('החשבון נוצר בהצלחה! בדוק את האימייל שלך לאימות החשבון.');
      
      return true;
    } catch (error) {
      console.error('❌ Signup error:', error);
      this.handleAuthError(error);
      return false;
    }
  }

  async login(email, password) {
    console.log('🔑 login: Authenticating user...');
    
    if (!this.validateEmail(email)) {
      this.showError('כתובת אימייל לא תקינה');
      return false;
    }
    
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      console.log('✅ Login successful:', user.email);
      this.showSuccess('התחברת בהצלחה!');
      
      return true;
    } catch (error) {
      console.error('❌ Login error:', error);
      this.handleAuthError(error);
      return false;
    }
  }

  async signInWithGoogle() {
    console.log('🔵 signInWithGoogle: Starting Google authentication...');
    
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // התחברות עם Google
      const result = await this.auth.signInWithPopup(provider);
      const user = result.user;
      
      console.log('✅ Google sign-in successful:', user.email);
      
      // בדיקה אם זה משתמש חדש
      const additionalUserInfo = result.additionalUserInfo;
      if (additionalUserInfo && additionalUserInfo.isNewUser) {
        console.log('🆕 New Google user, creating Firestore document...');
        
        // יצירת מסמך משתמש ב-Firestore
        await this.createUserDocument(user.uid, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          emailVerified: user.emailVerified,
          provider: 'google.com'
        });
      } else {
        console.log('👤 Existing Google user logged in');
      }
      
      // אם יש נתוני אורח, שאל אם להעביר
      if (isGuestMode()) {
        await this.migrateGuestDataToUser(user.uid);
      }
      
      this.showSuccess('התחברת בהצלחה עם Google!');
      return true;
      
    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        this.showError('ההתחברות בוטלה');
      } else if (error.code === 'auth/popup-blocked') {
        this.showError('החלון הקופץ נחסם. אנא אפשר חלונות קופצים.');
      } else {
        this.handleAuthError(error);
      }
      
      return false;
    }
  }

  async linkPasswordProvider(email, password) {
    console.log('🔗 linkPasswordProvider: Linking password to existing account...');
    
    if (!this.currentUser || this.currentUser.isGuest) {
      this.showError('חייב להיות מחובר עם Google כדי להוסיף סיסמה');
      return false;
    }
    
    try {
      const user = this.auth.currentUser;
      
      // בדיקה אם כבר יש סיסמה
      const providers = user.providerData.map(p => p.providerId);
      if (providers.includes('password')) {
        this.showError('כבר יש לחשבון זה סיסמה. אם שכחת אותה, השתמש באיפוס סיסמה.');
        return false;
      }
      
      // יצירת Credential
      const credential = firebase.auth.EmailAuthProvider.credential(email, password);
      
      // קישור הסיסמה לחשבון
      await user.linkWithCredential(credential);
      
      console.log('✅ Password linked successfully');
      this.showSuccess('סיסמה נוספה בהצלחה! כעת אפשר להתחבר גם עם אימייל וסיסמה.');
      
      return true;
    } catch (error) {
      console.error('❌ Error linking password:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        this.showError('האימייל כבר קיים עם סיסמה אחרת');
      } else if (error.code === 'auth/weak-password') {
        this.showError('הסיסמה חלשה מדי. השתמש בלפחות 6 תווים.');
      } else {
        this.handleAuthError(error);
      }
      
      return false;
    }
  }

  async logout() {
    console.log('👋 logout: Signing out...');
    
    try {
      if (this.isGuestMode) {
        // אורח - פשוט ננקה את המשתנים
        this.currentUser = null;
        this.isGuestMode = false;
        clearGuestData();
        
        this.showAuthUI();
        this.hideApp();
        
        this.showSuccess('התנתקת בהצלחה');
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
      } else {
        // משתמש רגיל - התנתקות מ-Firebase
        await this.auth.signOut();
        this.showSuccess('התנתקת בהצלחה');
      }
      
      console.log('✅ Logout successful');
      return true;
    } catch (error) {
      console.error('❌ Logout error:', error);
      this.showError('שגיאה בהתנתקות');
      return false;
    }
  }

  async resetPassword(email) {
    console.log('🔄 resetPassword: Sending password reset email...');
    
    if (!this.validateEmail(email)) {
      this.showError('כתובת אימייל לא תקינה');
      return false;
    }
    
    try {
      await this.auth.sendPasswordResetEmail(email, {
        url: window.location.href,
        handleCodeInApp: false
      });
      
      console.log('✅ Password reset email sent');
      this.showSuccess('נשלח אימייל לאיפוס הסיסמה. בדוק את תיבת הדואר שלך.');
      
      return true;
    } catch (error) {
      console.error('❌ Password reset error:', error);
      this.handleAuthError(error);
      return false;
    }
  }

  async resendVerificationEmail() {
    console.log('📧 resendVerificationEmail: Sending verification email...');
    
    try {
      const user = this.auth.currentUser;
      
      if (!user) {
        this.showError('לא נמצא משתמש מחובר');
        return false;
      }
      
      if (user.emailVerified) {
        this.showSuccess('האימייל כבר מאומת!');
        return true;
      }
      
      await user.sendEmailVerification({
        url: window.location.href,
        handleCodeInApp: false
      });
      
      console.log('✅ Verification email sent');
      this.showSuccess('אימייל אימות נשלח מחדש. בדוק את תיבת הדואר.');
      
      return true;
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      
      if (error.code === 'auth/too-many-requests') {
        this.showError('נשלחו יותר מדי אימיילים. נסה שוב מאוחר יותר.');
      } else {
        this.handleAuthError(error);
      }
      
      return false;
    }
  }

  // ==================== ניהול נתונים ====================
  
  async createUserDocument(uid, data) {
    console.log('📝 createUserDocument: Creating user document in Firestore...');
    
    try {
      await this.db.collection('users').doc(uid).set(data, { merge: true });
      console.log('✅ User document created/updated');
      return true;
    } catch (error) {
      console.error('❌ Error creating user document:', error);
      return false;
    }
  }

  async loadUserData() {
    console.log('📥 loadUserData: Loading user data from Firestore...');
    
    if (!this.currentUser || this.currentUser.isGuest) {
      console.log('⚠️ Not a registered user, skipping Firestore load');
      return;
    }
    
    try {
      const uid = this.currentUser.uid;
      
      // טעינת מקצועות
      const subjectsSnapshot = await this.db.collection('subjects')
        .doc(uid)
        .collection('items')
        .get();
      
      subjects = [];
      subjectsSnapshot.forEach(doc => {
        subjects.push({ id: doc.id, ...doc.data() });
      });
      
      console.log('✅ Loaded subjects:', subjects.length);
      
      // טעינת משימות
      const homeworkSnapshot = await this.db.collection('homework')
        .doc(uid)
        .collection('items')
        .get();
      
      homework = [];
      homeworkSnapshot.forEach(doc => {
        homework.push({ id: doc.id, ...doc.data() });
      });
      
      console.log('✅ Loaded homework:', homework.length);
      
      // עדכון UI
      if (typeof render === 'function') {
        render();
      }
      
      console.log('✅ User data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      this.showError('שגיאה בטעינת הנתונים');
    }
  }

  async syncData() {
    console.log('🔄 syncData: Syncing data to Firestore...');
    
    if (!this.currentUser || this.currentUser.isGuest) {
      // אורח - שמירה ל-localStorage
      await this.saveGuestData();
      return;
    }
    
    if (!this.autoSyncEnabled) {
      console.log('⏸️ Auto-sync disabled, skipping');
      return;
    }
    
    try {
      const uid = this.currentUser.uid;
      const batch = this.db.batch();
      
      // סנכרון מקצועות
      subjects.forEach(subject => {
        const docRef = this.db.collection('subjects').doc(uid).collection('items').doc(subject.id.toString());
        batch.set(docRef, subject, { merge: true });
      });
      
      // סנכרון משימות
      homework.forEach(hw => {
        const docRef = this.db.collection('homework').doc(uid).collection('items').doc(hw.id.toString());
        batch.set(docRef, hw, { merge: true });
      });
      
      await batch.commit();
      console.log('✅ Data synced successfully');
      
    } catch (error) {
      console.error('❌ Sync error:', error);
      // לא מציגים שגיאה למשתמש כי זה סנכרון רקע
    }
  }

  async migrateGuestDataToUser(uid) {
    console.log('🔄 migrateGuestDataToUser: Migrating guest data to user account...');
    
    try {
      // שמירת נתוני האורח
      const guestData = {
        subjects: subjects.slice(),
        homework: homework.slice()
      };
      
      if (guestData.subjects.length === 0 && guestData.homework.length === 0) {
        console.log('⏭️ No guest data to migrate');
        clearGuestData();
        return;
      }
      
      // העברת הנתונים ל-Firestore
      const batch = this.db.batch();
      
      // שמירת מקצועות
      guestData.subjects.forEach(subject => {
        const docRef = this.db.collection('subjects').doc(uid).collection('items').doc(subject.id.toString());
        batch.set(docRef, subject);
      });
      
      // שמירת משימות
      guestData.homework.forEach(hw => {
        const docRef = this.db.collection('homework').doc(uid).collection('items').doc(hw.id.toString());
        batch.set(docRef, hw);
      });
      
      await batch.commit();
      
      // מחיקת נתוני אורח
      clearGuestData();
      
      this.showSuccess('הנתונים מהמצב אורח הועברו בהצלחה!');
      console.log('✅ Guest data migrated successfully');
      
    } catch (error) {
      console.error('❌ Error migrating guest data:', error);
      this.showError('שגיאה בהעברת הנתונים');
    }
  }

  // ==================== UI Management ====================
  
  showAuthUI() {
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
      authContainer.classList.remove('hidden');
      authContainer.style.display = 'flex';
      console.log('👁️ Auth UI shown');
    }
  }

  hideAuthUI() {
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
      authContainer.classList.add('hidden');
      authContainer.style.display = 'none';
      console.log('🙈 Auth UI hidden');
    }
  }

  showApp() {
    const appContainer = document.getElementById('app');
    if (appContainer) {
      appContainer.classList.remove('hidden');
      appContainer.style.display = 'block';
      console.log('👁️ App shown');
    }
  }

  hideApp() {
    const appContainer = document.getElementById('app');
    if (appContainer) {
      appContainer.classList.add('hidden');
      appContainer.style.display = 'none';
      console.log('🙈 App hidden');
    }
  }

  updateUserUI() {
    console.log('🎨 updateUserUI: Updating user interface...');
    
    // עדכון תפריט משתמש
    const userMenuName = document.getElementById('user-menu-name');
    const userMenuEmail = document.getElementById('user-menu-email');
    const userMenuAvatar = document.getElementById('user-menu-avatar');
    
    if (userMenuName) {
      userMenuName.textContent = this.currentUser.displayName || 'משתמש';
    }
    
    if (userMenuEmail) {
      userMenuEmail.textContent = this.currentUser.email || 'אורח';
      
      // הצגת סטטוס אימות
      if (!this.currentUser.isGuest && !this.currentUser.emailVerified) {
        userMenuEmail.innerHTML = `
          ${this.currentUser.email}
          <span style="color: #f59e0b; font-size: 0.75rem; display: block;">
            ⚠️ אימייל לא מאומת
            <a href="#" onclick="authManager.resendVerificationEmail(); return false;" 
               style="color: #3b82f6; text-decoration: underline;">
              שלח שוב
            </a>
          </span>
        `;
      }
    }
    
    if (userMenuAvatar) {
      if (this.currentUser.photoURL) {
        userMenuAvatar.innerHTML = `<img src="${this.currentUser.photoURL}" alt="avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      } else {
        const initial = this.currentUser.displayName ? this.currentUser.displayName[0].toUpperCase() : '?';
        userMenuAvatar.textContent = initial;
      }
    }
    
    // הצגת כפתור העברה לחשבון אם אורח
    const convertBtn = document.getElementById('convert-guest-btn');
    if (convertBtn) {
      convertBtn.style.display = this.currentUser.isGuest ? 'block' : 'none';
    }
    
    // הצגת כפתור הוספת סיסמה אם Google
    const linkPasswordBtn = document.getElementById('link-password-btn');
    if (linkPasswordBtn) {
      const user = this.auth.currentUser;
      if (user && !this.currentUser.isGuest) {
        const providers = user.providerData.map(p => p.providerId);
        const hasGoogle = providers.includes('google.com');
        const hasPassword = providers.includes('password');
        linkPasswordBtn.style.display = (hasGoogle && !hasPassword) ? 'block' : 'none';
      } else {
        linkPasswordBtn.style.display = 'none';
      }
    }
    
    console.log('✅ User UI updated');
  }

  createAuthUI() {
    console.log('🎨 createAuthUI: Creating authentication interface...');
    
    return `
      <!-- Authentication Container -->
      <div id="auth-container" class="auth-container">
        <div class="auth-box">
          <div class="auth-header">
            <h1>📚 ניהול שיעורי בית</h1>
            <p>ארגן את המטלות שלך בקלות</p>
          </div>

          <!-- Guest Mode Button -->
          <div style="margin-bottom: 1.5rem; padding: 1rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1)); border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.2);">
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
            
            <!-- Google Sign-In Button -->
            <button class="btn" id="google-signin-btn" style="width: 100%; background: white; color: #1f2937; border: 1px solid #e5e7eb; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              המשך עם Google
            </button>
            
            <div style="text-align: center; margin: 1rem 0; color: var(--text-secondary); font-size: 0.875rem;">
              או
            </div>
            
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
            
            <!-- Google Sign-In Button -->
            <button class="btn" id="google-signin-btn-signup" style="width: 100%; background: white; color: #1f2937; border: 1px solid #e5e7eb; margin-bottom: 1rem; display: flex; align-items: center; justify-center: center; gap: 0.5rem;">
              <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              הירשם עם Google
            </button>
            
            <div style="text-align: center; margin: 1rem 0; color: var(--text-secondary); font-size: 0.875rem;">
              או
            </div>
            
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
    
    // Google Sign-In (Login)
    const googleSignInBtn = document.getElementById('google-signin-btn');
    if (googleSignInBtn) {
      googleSignInBtn.addEventListener('click', async () => {
        googleSignInBtn.disabled = true;
        googleSignInBtn.innerHTML = `
          <svg style="width: 20px; height: 20px; animation: spin 1s linear infinite;" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"/>
          </svg>
          מתחבר...
        `;
        
        try {
          await this.signInWithGoogle();
        } catch (error) {
          googleSignInBtn.disabled = false;
          googleSignInBtn.innerHTML = `
            <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            המשך עם Google
          `;
        }
      });
    }
    
    // Google Sign-In (Signup)
    const googleSignInBtnSignup = document.getElementById('google-signin-btn-signup');
    if (googleSignInBtnSignup) {
      googleSignInBtnSignup.addEventListener('click', async () => {
        googleSignInBtnSignup.disabled = true;
        googleSignInBtnSignup.innerHTML = `
          <svg style="width: 20px; height: 20px; animation: spin 1s linear infinite;" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"/>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"/>
          </svg>
          מתחבר...
        `;
        
        try {
          await this.signInWithGoogle();
        } catch (error) {
          googleSignInBtnSignup.disabled = false;
          googleSignInBtnSignup.innerHTML = `
            <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            הירשם עם Google
          `;
        }
      });
    }
    
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
      'auth/network-request-failed': 'שגיאת רשת. בדוק את החיבור לאינטרנט',
      'auth/popup-closed-by-user': 'החלון נסגר',
      'auth/cancelled-popup-request': 'הבקשה בוטלה'
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
console.log('✅ Global auth manager created with Guest Mode + Google Sign-In');

// אתחול אוטומטי
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🔐 auth.js: Initializing...');
  await authManager.initialize();
  console.log('✅ auth.js: Initialized');
});

// ========================================
// Auto-Sync Integration
// ========================================
// קריאה ל-syncData אחרי כל שינוי בנתונים
// הוסף את זה אחרי כל פעולת עריכה/הוספה/מחיקה:

// דוגמה לשימוש:
// אחרי addHomework():
//   authManager.syncData();
// אחרי updateHomework():
//   authManager.syncData();
// אחרי deleteHomework():
//   authManager.syncData();
