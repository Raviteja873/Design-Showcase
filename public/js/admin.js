```javascript name=public/js/admin.js url=https://github.com/Raviteja873/Design-Showcase/blob/main/public/js/admin.js
document.addEventListener('DOMContentLoaded', async () => {

    const isLogin = window.location.pathname.endsWith('login.html');
    const isAdmin = window.location.pathname.endsWith('admin.html');

    // ================= LOGIN PAGE =================
    if (isLogin) {
        document.body.style.display = 'block';

        const form = document.getElementById('loginForm');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const username = form.username.value;
                const password = form.password.value;

                try {
                    const res = await fetch('/api/login', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });

                    if (res.ok) {
                        window.location.href = '/admin.html';
                    } else {
                        alert('Invalid credentials');
                    }

                } catch {
                    alert('Server error');
                }
            });
        }
    }

    // ================= ADMIN PAGE =================
    if (isAdmin) {
        try {
            const res = await fetch('/api/auth/status', {
                credentials: 'include'
            });

            if (!res.ok) throw new Error();

            document.body.style.display = 'block';

            // Ensure initAdminDashboard runs only once across page lifecycle
            if (!window.__adminDashboardInitialized) {
                window.__adminDashboardInitialized = true;
                initAdminDashboard();
            }

        } catch {
            window.location.href = '/login.html';
        }
    }

    // ================= LOGOUT =================
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });

            window.location.href = '/login.html';
        });
    }
});


// ================= DASHBOARD =================

function initAdminDashboard() {
    // Guard against double initialization if called directly
    if (initAdminDashboard._initialized) return;
    initAdminDashboard._initialized = true;

    const adminDesignList = document.getElementById('adminDesignList');
    const addNewBtn = document.getElementById('addNewBtn');
    const designFormContainer = document.getElementById('designFormContainer');
    const designForm = document.getElementById('designForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const formTitle = document.getElementById('formTitle');
    const imageHelp = document.getElementById('imageHelp');

    let isEditing = false;

    // Small helper to avoid XSS when injecting text
    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ===== Event delegation for dynamic Edit/Delete buttons =====
    function attachListDelegation() {
        if (!adminDesignList) return;
        if (adminDesignList.__delegationAttached) return;

        adminDesignList.addEventListener('click', (e) => {
            const target = e.target;
            if (!target) return;

            if (target.matches('.edit-btn')) {
                const id = target.dataset.id;
                if (id) handleEdit(id);
            } else if (target.matches('.delete-btn')) {
                const id = target.dataset.id;
                if (id) handleDelete(id);
            }
        });

        adminDesignList.__delegationAttached = true;
    }

    // ================= LOAD DESIGNS =================
    async function loadDesigns() {
        try {
            const res = await fetch('/api/designs', {
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Failed to fetch designs');

            const data = await res.json();

            if (!adminDesignList) return;

            adminDesignList.innerHTML = '';

            if (!Array.isArray(data) || data.length === 0) {
                adminDesignList.innerHTML = '<p>No designs yet</p>';
                return;
            }

            data.forEach(item => {

                const imageUrl = item.image_url || '';
                const isPdf = String(imageUrl).toLowerCase().endsWith('.pdf');

                const media = isPdf
                    ? `<div style="width:50px;height:50px;background:#eee;display:flex;align-items:center;justify-content:center;">PDF</div>`
                    : `<img src="${escapeHtml(imageUrl)}" style="width:50px;height:50px;object-fit:cover;">`;

                const div = document.createElement('div');
                div.className = 'admin-item';

                div.innerHTML = `
                    <div style="display:flex;align-items:center;gap:10px;">
                        ${media}
                        <strong>${escapeHtml(item.title)}</strong>
                    </div>
                    <div>
                        <button class="edit-btn" data-id="${item.id}">Edit</button>
                        <button class="delete-btn" data-id="${item.id}">Delete</button>
                    </div>
                `;

                adminDesignList.appendChild(div);
            });
        } catch (err) {
            console.error('loadDesigns error:', err);
            if (adminDesignList) adminDesignList.innerHTML = '<p>Unable to load designs</p>';
        }
    }

    // ===== Add New button =====
    if (addNewBtn) {
        addNewBtn.addEventListener('click', () => {
            isEditing = false;
            if (designForm) designForm.reset();
            const designIdEl = document.getElementById('designId');
            if (designIdEl) designIdEl.value = '';

            if (formTitle) formTitle.textContent = 'Add New Design';
            if (imageHelp) imageHelp.textContent = 'Required';

            if (designFormContainer) designFormContainer.style.display = 'block';
        });
    }

    // ===== Cancel button =====
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (designFormContainer) designFormContainer.style.display = 'none';
        });
    }

    // ===== Submit handler with robust FormData and file handling =====
    if (designForm) {
        designForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const idEl = document.getElementById('designId');
            const id = idEl ? idEl.value : '';

            const titleEl = document.getElementById('title');
            const descriptionEl = document.getElementById('description');
            const categoryEl = document.getElementById('category');
            const fileInput = document.getElementById('image');

            const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;

            if (!isEditing && !file) {
                alert('Image required');
                return;
            }

            const formData = new FormData();
            formData.append('title', titleEl ? titleEl.value : '');
            formData.append('description', descriptionEl ? descriptionEl.value : '');
            formData.append('category', categoryEl ? categoryEl.value : '');

            if (file) {
                formData.append('image', file);
            }

            const url = isEditing ? `/api/designs/${encodeURIComponent(id)}` : '/api/designs';
            const method = isEditing ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method,
                    credentials: 'include',
                    body: formData
                });

                if (res.ok) {
                    if (designFormContainer) designFormContainer.style.display = 'none';
                    designForm.reset();
                    await loadDesigns();
                } else {
                    let msg = 'Operation failed';
                    try {
                        msg = await res.text();
                    } catch (err) { /* ignore */ }
                    alert(msg || 'Operation failed');
                }
            } catch (err) {
                console.error('submit error:', err);
                alert('Network error');
            }
        });
    }

    // ===== Edit handler =====
    async function handleEdit(id) {
        try {
            const res = await fetch(`/api/designs/${encodeURIComponent(id)}`, {
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Failed to fetch design');

            const data = await res.json();

            isEditing = true;

            const designIdEl = document.getElementById('designId');
            const titleEl = document.getElementById('title');
            const descriptionEl = document.getElementById('description');
            const categoryEl = document.getElementById('category');

            if (designIdEl) designIdEl.value = data.id || '';
            if (titleEl) titleEl.value = data.title || '';
            if (descriptionEl) descriptionEl.value = data.description || '';
            if (categoryEl) categoryEl.value = data.category || '';

            if (formTitle) formTitle.textContent = 'Edit Design';
            if (imageHelp) imageHelp.textContent = 'Leave empty to keep existing file';

            if (designFormContainer) designFormContainer.style.display = 'block';
        } catch (err) {
            console.error('handleEdit error:', err);
            alert('Failed to load design for edit');
        }
    }

    // ===== Delete handler =====
    async function handleDelete(id) {
        if (!confirm('Are you sure?')) return;

        try {
            const res = await fetch(`/api/designs/${encodeURIComponent(id)}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                await loadDesigns();
            } else {
                alert('Delete failed');
            }
        } catch (err) {
            console.error('handleDelete error:', err);
            alert('Network error during delete');
        }
    }

    // Initialize delegation and load designs
    attachListDelegation();
    loadDesigns();
}
```
