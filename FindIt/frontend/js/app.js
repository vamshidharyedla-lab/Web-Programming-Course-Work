// Main app controller — handles navigation and rendering each pages

const App = {
  currentPage: 'feed',
  currentFilter: { type: 'all', category: 'all', search: '' },
  cachedItems: [],

  // Run on page load
  async init() {
    this.bindNavLinks();
    this.updateNavUser();
    this.navigate('feed');
  },

  // Attach click handlers to all nav links
  bindNavLinks() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(el.dataset.nav);
      });
    });
  },

  // Switch to a different page
  navigate(page) {
    const user = Store.getCurrentUser();

    // Redirect to login if the page requires being logged in
    if ((page === 'profile' || page === 'report') && !user) {
      this.navigate('auth');
      return;
    }

    this.currentPage = page;

    // Hide all pages, show the one we want
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === page);
    });

    const target = document.getElementById(`page-${page}`);
    if (target) target.classList.add('active');

    // Render the correct page content
    if (page === 'feed')    this.renderFeed();
    if (page === 'matches') this.renderMatches();
    if (page === 'report')  this.renderReport();
    if (page === 'profile') this.renderProfile();
    if (page === 'auth')    this.renderAuth();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Show or hide login/logout buttons depending on whether user is logged in
  updateNavUser() {
    const user = Store.getCurrentUser();
    const authBtn   = document.getElementById('nav-auth-btn');
    const userBtn   = document.getElementById('nav-user-btn');
    const logoutBtn = document.getElementById('nav-logout-btn');

    if (user) {
      if (authBtn)   authBtn.style.display = 'none';
      if (userBtn)   { userBtn.style.display = 'flex'; userBtn.textContent = user.avatar || user.name[0]; }
      if (logoutBtn) logoutBtn.style.display = '';
    } else {
      if (authBtn)   authBtn.style.display = '';
      if (userBtn)   userBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
    }
  },

  // Update the stat numbers at the top of the feed page
  async updateStats() {
    try {
      const items = await Store.getItems();
      const lostCount    = items.filter(i => i.type === 'lost').length;
      const foundCount   = items.filter(i => i.type === 'found').length;
      const matchesCount = Matcher.findMatches(items).length;

      const el = id => document.getElementById(id);
      if (el('stat-lost'))    el('stat-lost').textContent    = lostCount;
      if (el('stat-found'))   el('stat-found').textContent   = foundCount;
      if (el('stat-matches')) el('stat-matches').textContent = matchesCount;
    } catch (err) {
      console.error('Could not update stats:', err.message);
    }
  },

  // Render the main feed of items
  async renderFeed() {
    const container = document.getElementById('feed-grid');
    if (!container) return;

    container.innerHTML = '<div class="empty-state"><div class="icon">⏳</div><h3>Loading items...</h3></div>';

    try {
      const items = await Store.getItems(this.currentFilter);
      this.cachedItems = items;

      const countEl = document.getElementById('feed-count');
      if (countEl) countEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;

      if (items.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="icon">🔍</div>
            <h3>No items found</h3>
            <p>Try changing your filters or <a href="#" onclick="App.navigate('report')" style="color:var(--accent)">report an item</a></p>
          </div>`;
        return;
      }

      container.innerHTML = items.map((item, i) => this.buildItemCard(item, i)).join('');
      this.updateStats();
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">⚠️</div>
          <h3>Failed to load items</h3>
          <p>${err.message}</p>
        </div>`;
    }
  },

  // Build the HTML for a single item card
  buildItemCard(item, delay = 0) {
    const daysAgo = Math.floor((Date.now() - new Date(item.createdAt)) / 86400000);
    const timeText = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;
    const matches = Matcher.findMatchesForItem(item, this.cachedItems || []);
    const topMatch = matches[0];

    return `
      <div class="item-card" onclick="App.openItem('${item._id}')" style="animation-delay:${delay * 0.05}s">
        <div class="item-card-image">
          <span>${item.emoji || '📦'}</span>
          <span class="item-type-badge badge-${item.type}">${item.type}</span>
          ${topMatch ? `<span class="item-match-score">🔗 ${topMatch.score}%</span>` : ''}
        </div>
        <div class="item-card-body">
          <div class="item-card-title">${item.title}</div>
          <div class="item-card-desc">${item.description}</div>
          <div class="item-card-meta">
            <span class="location">📍 ${item.location}</span>
            <span>${timeText}</span>
          </div>
        </div>
        <div class="item-card-footer">
          <button class="btn btn-ghost btn-sm" style="flex:1"
            onclick="event.stopPropagation(); App.openItem('${item._id}')">
            View Details
          </button>
          ${topMatch ? `
            <button class="btn btn-primary btn-sm"
              onclick="event.stopPropagation(); App.navigate('matches')">
              Matches
            </button>` : ''}
        </div>
      </div>`;
  },

  // Open the detail modal for a specific item
  async openItem(id) {
    try {
      const item = await Store.getItemById(id);
      if (!item) { Toast.show('Item not found', 'error'); return; }

      const user = Store.getCurrentUser();
      const matches = Matcher.findMatchesForItem(item, this.cachedItems || []);
      const isOwner = user && String(user.id) === String(item.userId);
      const daysAgo = Math.floor((Date.now() - new Date(item.createdAt)) / 86400000);

      const body = document.getElementById('item-detail-body');
      body.innerHTML = `
        <div style="text-align:center;padding:2rem 0;background:var(--surface2);margin:-1.5rem -1.5rem 1.5rem;border-radius:0">
          <div style="font-size:4rem;margin-bottom:0.5rem">${item.emoji || '📦'}</div>
          <span class="item-type-badge badge-${item.type}" style="position:static;display:inline-block">${item.type}</span>
        </div>

        <h2 style="font-family:'Syne',sans-serif;font-size:1.375rem;font-weight:700;margin-bottom:0.75rem">${item.title}</h2>
        <p style="color:var(--text-muted);line-height:1.7;margin-bottom:1.5rem">${item.description}</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.5rem">
          <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:0.75rem">
            <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.25rem">Location</div>
            <div style="font-size:0.9rem;font-weight:500">📍 ${item.location}</div>
          </div>
          <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:0.75rem">
            <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.25rem">Date</div>
            <div style="font-size:0.9rem;font-weight:500">📅 ${item.date}</div>
          </div>
          <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:0.75rem">
            <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.25rem">Category</div>
            <div style="font-size:0.9rem;font-weight:500">🏷️ ${item.category}</div>
          </div>
          <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:0.75rem">
            <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.25rem">Reported</div>
            <div style="font-size:0.9rem;font-weight:500">⏰ ${daysAgo === 0 ? 'Today' : daysAgo + 'd ago'}</div>
          </div>
        </div>

        ${matches.length > 0 ? `
          <div style="background:rgba(45,106,79,0.08);border:1px solid rgba(45,106,79,0.2);border-radius:var(--radius-sm);padding:1rem;margin-bottom:1.5rem">
            <div style="font-weight:600;margin-bottom:0.5rem">🔗 ${matches.length} possible match${matches.length > 1 ? 'es' : ''} found</div>
            ${matches.slice(0, 2).map(m => {
              const other = item.type === 'lost' ? m.foundItem : m.lostItem;
              return `<div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface);border-radius:6px;padding:0.5rem 0.75rem;margin-top:0.5rem;cursor:pointer"
                onclick="App.closeModal('item-detail-modal');App.openItem('${other._id || other.id}')">
                <span style="font-size:0.875rem">${other.emoji || '📦'} ${other.title}</span>
                <span style="font-size:0.75rem;background:var(--accent);color:white;padding:0.15rem 0.5rem;border-radius:100px">${m.score}%</span>
              </div>`;
            }).join('')}
          </div>` : ''}

        <div style="background:var(--surface2);border-radius:var(--radius-sm);padding:1rem;margin-bottom:1.5rem">
          <div style="font-size:0.75rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.5rem">Contact</div>
          <div style="font-weight:500">${item.contactName}</div>
          <div style="font-size:0.875rem;color:var(--accent)">${item.contactEmail}</div>
        </div>

        <div style="display:flex;gap:0.5rem">
          ${user && !isOwner ? `
            <a href="mailto:${item.contactEmail}?subject=About: ${encodeURIComponent(item.title)}"
              class="btn btn-primary" style="flex:1;justify-content:center">
              ✉️ Contact Reporter
            </a>` : ''}
          ${isOwner ? `
            <button class="btn btn-danger btn-sm" onclick="App.deleteItem('${item._id}')">Delete</button>
            <button class="btn btn-success btn-sm" onclick="App.markResolved('${item._id}')">✓ Resolved</button>` : ''}
          ${!user ? `
            <button class="btn btn-primary" style="flex:1"
              onclick="App.closeModal('item-detail-modal');App.navigate('auth')">
              Login to Contact
            </button>` : ''}
        </div>
      `;

      this.openModal('item-detail-modal');
    } catch (err) {
      Toast.show('Could not load item details', 'error');
    }
  },

  openModal(id) {
    document.getElementById(id).classList.add('open');
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('open');
  },

  // Render the matches page
  async renderMatches() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    container.innerHTML = '<div class="empty-state"><div class="icon">⏳</div><h3>Finding matches...</h3></div>';

    try {
      const items = await Store.getItems();
      this.cachedItems = items;
      const matches = Matcher.findMatches(items, 25);

      const countEl = document.getElementById('matches-count');
      if (countEl) countEl.textContent = `${matches.length} pair${matches.length !== 1 ? 's' : ''}`;

      if (matches.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="icon">🔗</div>
            <h3>No matches yet</h3>
            <p>Post more lost and found items to start seeing matches</p>
          </div>`;
        return;
      }

      container.innerHTML = matches.map(m => this.buildMatchCard(m)).join('');
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">⚠️</div>
          <h3>Failed to load matches</h3>
          <p>${err.message}</p>
        </div>`;
    }
  },

  // Build the HTML for a match card (shows a lost item and a found item side by side)
  buildMatchCard(m) {
    const lost  = m.lostItem;
    const found = m.foundItem;
    const bd    = m.breakdown;

    const bars = [
      { label: 'Category', val: bd.category },
      { label: 'Keywords', val: bd.keywords },
      { label: 'Location', val: bd.location },
      { label: 'Color',    val: bd.color },
      { label: 'Date',     val: bd.date }
    ];

    return `
      <div class="match-card">
        <div class="match-item" onclick="App.openItem('${lost._id || lost.id}')" style="cursor:pointer">
          <div class="match-item-type" style="color:var(--lost)">Lost</div>
          <div class="match-item-name">${lost.emoji || '📦'} ${lost.title}</div>
          <div class="match-item-loc">📍 ${lost.location}</div>
          <div style="font-size:0.75rem;color:var(--text-dim);margin-top:0.25rem">${lost.date}</div>
        </div>

        <div class="match-center">
          <div class="match-score-circle" style="--score:${m.score * 3.6}">
            <span class="match-score-inner">${m.score}%</span>
          </div>
          <div class="match-label">Match</div>
          <div style="margin-top:0.75rem;width:100%">
            ${bars.map(b => `
              <div style="margin-bottom:0.3rem">
                <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--text-dim);margin-bottom:2px">
                  <span>${b.label}</span><span>${Math.round(b.val * 100)}%</span>
                </div>
                <div style="height:3px;background:var(--surface2);border-radius:2px">
                  <div style="height:100%;width:${b.val * 100}%;background:var(--accent);border-radius:2px;transition:width 0.5s"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <div class="match-item" onclick="App.openItem('${found._id || found.id}')" style="cursor:pointer">
          <div class="match-item-type" style="color:var(--found)">Found</div>
          <div class="match-item-name">${found.emoji || '📦'} ${found.title}</div>
          <div class="match-item-loc">📍 ${found.location}</div>
          <div style="font-size:0.75rem;color:var(--text-dim);margin-top:0.25rem">${found.date}</div>
        </div>
      </div>`;
  },

  // Set up the report form with the user's info pre-filled
  renderReport() {
    const user = Store.getCurrentUser();
    if (!user) { this.navigate('auth'); return; }

    const nameEl  = document.getElementById('report-user-name');
    const dateEl  = document.getElementById('report-date');
    const cnEl    = document.getElementById('report-contact-name');
    const ceEl    = document.getElementById('report-contact-email');

    if (nameEl) nameEl.textContent = user.name;
    if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
    if (cnEl)   cnEl.value = user.name;
    if (ceEl)   ceEl.value = user.email;

    // Default to "lost" type if nothing is selected
    const activeType = document.querySelector('.type-btn.active-lost, .type-btn.active-found');
    if (!activeType) {
      const lostBtn = document.querySelector('.type-btn[data-type="lost"]');
      if (lostBtn) lostBtn.classList.add('active-lost');
    }
  },

  // Switch between "I Lost Something" and "I Found Something"
  setReportType(type) {
    document.querySelectorAll('.type-btn').forEach(b => {
      b.classList.remove('active-lost', 'active-found');
    });
    const btn = document.querySelector(`.type-btn[data-type="${type}"]`);
    if (btn) btn.classList.add(`active-${type}`);
  },

  // Submit the report form
  async submitReport() {
    const typeBtn = document.querySelector('.type-btn.active-lost, .type-btn.active-found');
    const type = typeBtn ? typeBtn.dataset.type : null;

    const title    = document.getElementById('report-title').value.trim();
    const category = document.getElementById('report-category').value;
    const desc     = document.getElementById('report-desc').value.trim();
    const location = document.getElementById('report-location').value.trim();
    const date     = document.getElementById('report-date').value;
    const color    = document.getElementById('report-color').value;
    const name     = document.getElementById('report-contact-name').value.trim();
    const email    = document.getElementById('report-contact-email').value.trim();

    if (!type || !title || !category || !desc || !location || !date || !name || !email) {
      Toast.show('Please fill in all required fields', 'error');
      return;
    }

    // Map categories to emojis
    const categoryEmojis = {
      electronics: '💻', documents: '🪪', accessories: '👜',
      clothing: '👕', keys: '🔑', bags: '🎒', other: '📦'
    };

    const item = {
      type, title, category,
      description: desc, location, date, color,
      keywords: [...title.toLowerCase().split(/\s+/), category, color].filter(Boolean),
      emoji: categoryEmojis[category] || '📦',
      contactName: name,
      contactEmail: email
    };

    try {
      const created = await Store.addItem(item);
      Toast.show(`Item reported! ${type === 'lost' ? '🔍' : '✅'}`, 'success');

      // Check if there are any instant matches and alert the user
      const allItems = await Store.getItems();
      this.cachedItems = allItems;
      const matches = Matcher.findMatchesForItem(created, allItems);
      if (matches.length > 0) {
        setTimeout(() => {
          Toast.show(`🔗 ${matches.length} possible match${matches.length > 1 ? 'es' : ''} found — check Matches tab`, 'info');
        }, 1500);
      }

      // Clear the form
      ['report-title', 'report-desc', 'report-location', 'report-color'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const catEl = document.getElementById('report-category');
      if (catEl) catEl.value = '';

      this.updateStats();
      this.navigate('feed');
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  // Render the profile page with the user's posted items
  async renderProfile() {
    const user = Store.getCurrentUser();
    if (!user) { this.navigate('auth'); return; }

    const avatarEl = document.getElementById('profile-avatar');
    const nameEl   = document.getElementById('profile-name');
    const emailEl  = document.getElementById('profile-email');

    if (avatarEl) avatarEl.textContent = user.name[0].toUpperCase();
    if (nameEl)   nameEl.textContent   = user.name;
    if (emailEl)  emailEl.textContent  = user.email;

    try {
      const items   = await Store.getItems();
      const myItems = items.filter(i => String(i.userId) === String(user.id));

      const lostEl  = document.getElementById('profile-stat-lost');
      const foundEl = document.getElementById('profile-stat-found');
      const totalEl = document.getElementById('profile-stat-total');

      if (lostEl)  lostEl.textContent  = myItems.filter(i => i.type === 'lost').length;
      if (foundEl) foundEl.textContent = myItems.filter(i => i.type === 'found').length;
      if (totalEl) totalEl.textContent = myItems.length;

      this.renderProfileItems('all', myItems);
    } catch (err) {
      Toast.show('Could not load profile', 'error');
    }
  },

  // Show the user's items filtered by tab (all / lost / found)
  async renderProfileItems(tab, itemsOverride) {
    document.querySelectorAll('#page-profile .tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });

    const user = Store.getCurrentUser();
    let items = itemsOverride;
    if (!items) {
      const all = await Store.getItems();
      items = all.filter(i => String(i.userId) === String(user.id));
    }

    const filtered = tab === 'all'   ? items :
                     tab === 'lost'  ? items.filter(i => i.type === 'lost') :
                                       items.filter(i => i.type === 'found');

    const container = document.getElementById('profile-items');
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📭</div>
          <h3>No items yet</h3>
          <p>You haven't reported any ${tab === 'all' ? '' : tab} items yet.</p>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="items-grid">${filtered.map((item, i) => this.buildItemCard(item, i)).join('')}</div>`;
  },

  // If user is already logged in, redirect away from auth page
  renderAuth() {
    const user = Store.getCurrentUser();
    if (user) this.navigate('profile');
  },

  // Switch between login and signup tabs
  switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    const loginForm  = document.getElementById('auth-login-form');
    const signupForm = document.getElementById('auth-signup-form');
    if (loginForm)  loginForm.style.display  = tab === 'login'  ? 'block' : 'none';
    if (signupForm) signupForm.style.display = tab === 'signup' ? 'block' : 'none';
  },

  async login() {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value;
    if (!email || !pass) { Toast.show('Please fill in all fields', 'error'); return; }

    try {
      const user = await Store.login(email, pass);
      this.updateNavUser();
      Toast.show(`Welcome back, ${user.name}!`, 'success');
      this.navigate('feed');
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async signup() {
    const name  = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const pass  = document.getElementById('signup-password').value;
    const dept  = document.getElementById('signup-dept').value;

    if (!name || !email || !pass || !dept) { Toast.show('Please fill in all fields', 'error'); return; }
    if (pass.length < 6) { Toast.show('Password must be at least 6 characters', 'error'); return; }

    try {
      const user = await Store.signup(name, email, pass, dept);
      this.updateNavUser();
      Toast.show(`Account created! Welcome, ${name}!`, 'success');
      this.navigate('feed');
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async demoLogin() {
    try {
      const user = await Store.demoLogin();
      this.updateNavUser();
      Toast.show('Welcome, Demo User!', 'success');
      this.navigate('feed');
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  logout() {
    Store.logout();
    this.updateNavUser();
    Toast.show('Logged out', 'info');
    this.navigate('feed');
  },

  async deleteItem(id) {
    if (!confirm('Delete this item?')) return;
    try {
      await Store.deleteItem(id);
      this.closeModal('item-detail-modal');
      Toast.show('Item deleted', 'info');
      this.renderFeed();
      this.updateStats();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  async markResolved(id) {
    try {
      await Store.updateItem(id, { status: 'resolved' });
      this.closeModal('item-detail-modal');
      Toast.show('Marked as resolved!', 'success');
      this.renderFeed();
      this.updateStats();
    } catch (err) {
      Toast.show(err.message, 'error');
    }
  },

  // Update a filter and reload the feed
  setFilter(key, value) {
    this.currentFilter[key] = value;

    if (key === 'type') {
      document.querySelectorAll('.filter-chip[data-filter-type]').forEach(c => {
        c.classList.toggle('active', c.dataset.filterType === value);
        c.classList.remove('lost-chip', 'found-chip');
        if (c.dataset.filterType === 'lost')  c.classList.add('lost-chip');
        if (c.dataset.filterType === 'found') c.classList.add('found-chip');
      });
    }

    this.renderFeed();
  }
};

// Small toast notification system
const Toast = {
  show(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3500);
  }
};

// Start the app when the page finishes loading
document.addEventListener('DOMContentLoaded', () => App.init());
