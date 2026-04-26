// Check Auth on load
document.addEventListener('DOMContentLoaded', async () => {
    const isLoginPath = window.location.pathname.endsWith('login.html');
    const isAdminPath = window.location.pathname.endsWith('admin.html');

    // 🔐 LOGIN PAGE
    if (isLoginPath) {
        await fetch('/api/logout', { method: 'POST' }).catch(() => {});
        document.body.style.display = 'block';
    }

    // 🔐 ADMIN PAGE
    else if (isAdminPath) {
        try {
            const res = await fetch('/api/auth/status');

            if (!res.ok) throw new Error();

            const data = await res.json();

            if (data.loggedIn) {
                document.body.style.display = 'block';

                // ✅ FIX: Initialize dashboard here
                initAdminDashboard();

            } else {
                window.location.href = '/login.html';
            }

        } catch (err) {
            window.location.href = '/login.html';
        }
    }

    // 🔐 LOGIN FORM
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = loginForm.username.value;
            const password = loginForm.password.value;
            const errDiv = document.getElementById('loginError');

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (res.ok) {
                    // ✅ FIX: ensure redirect always happens
                    window.location.href = '/admin.html';
                } else {
                    const data = await res.json();
                    errDiv.textContent = data.error || 'Login failed';
                    errDiv.style.display = 'block';
                }

            } catch (err) {
                errDiv.textContent = 'Server error';
                errDiv.style.display = 'block';
            }
        });
    }

    // 🔐 LOGOUT
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login.html';
        });
    }
});


// ==============================
// ADMIN DASHBOARD LOGIC
// ==============================

function initAdminDashboard() {

    const adminDesignList = document.getElementById('adminDesignList');
    const addNewBtn = document.getElementById('addNewBtn');
    const designFormContainer = document.getElementById('designFormContainer');
    const designForm = document.getElementById('designForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const formTitle = document.getElementById('formTitle');
    const imageHelp = document.getElementById('imageHelp');

    let isEditing = false;

    // Fetch designs
    const fetchAdminDesigns = async () => {
        try {
            const res = await fetch('/api/designs');
            const data = await res.json();

            adminDesignList.innerHTML = '';

            if (data.length === 0) {
                adminDesignList.innerHTML = '<p>No designs yet. Add some!</p>';
                return;
            }

            data.forEach(item => {
                const isPdf = item.image_url.toLowerCase().endsWith('.pdf');

                const mediaHtml = isPdf
                    ? `<div style="width:50px;height:50px;background:#e2e8f0;border-radius:4px;display:flex;align-items:center;justify-content:center;"><span style="font-size:10px;font-weight:bold;">PDF</span></div>`
                    : `<img src="${item.image_url}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;">`;

                const div = document.createElement('div');
                div.className = 'admin-item';

                div.innerHTML = `
                    <div style="display:flex;align-items:center;gap:10px;">
                        ${mediaHtml}
                        <strong>${item.title}</strong>
                    </div>
                    <div>
                        <button class="edit-btn" data-id="${item.id}">Edit</button>
                        <button class="delete-btn" data-id="${item.id}">Delete</button>
                    </div>
                `;

                adminDesignList.appendChild(div);
            });

            document.querySelectorAll('.edit-btn').forEach(btn =>
                btn.addEventListener('click', () => handleEdit(btn.dataset.id))
            );

            document.querySelectorAll('.delete-btn').forEach(btn =>
                btn.addEventListener('click', () => handleDelete(btn.dataset.id))
            );

        } catch {
            adminDesignList.innerHTML = '<p style="color:red">Error loading data</p>';
        }
    };

    fetchAdminDesigns();

    // Add new
    addNewBtn.addEventListener('click', () => {
        isEditing = false;
        formTitle.textContent = 'Add New Design';
        designForm.reset();
        imageHelp.textContent = 'Required';
        designFormContainer.style.display = 'block';
    });

    cancelBtn.addEventListener('click', () => {
        designFormContainer.style.display = 'none';
    });

    // Submit form
    designForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('designId').value;
        const formData = new FormData(designForm);

        if (!isEditing && !formData.get('image')) {
            alert('Image required');
            return;
        }

        const url = isEditing ? `/api/designs/${id}` : '/api/designs';
        const method = isEditing ? 'PUT' : 'POST';

        const res = await fetch(url, { method, body: formData });

        if (res.ok) {
            designFormContainer.style.display = 'none';
            fetchAdminDesigns();
        } else {
            alert('Failed');
        }
    });

    async function handleEdit(id) {
        const res = await fetch(`/api/designs/${id}`);
        const data = await res.json();

        isEditing = true;

        document.getElementById('designId').value = data.id;
        document.getElementById('title').value = data.title;
        document.getElementById('description').value = data.description;

        designFormContainer.style.display = 'block';
    }

    async function handleDelete(id) {
        if (!confirm('Delete?')) return;

        const res = await fetch(`/api/designs/${id}`, { method: 'DELETE' });

        if (res.ok) fetchAdminDesigns();
    }
}
