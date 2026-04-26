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
            initAdminDashboard();

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

    const adminDesignList = document.getElementById('adminDesignList');
    const addNewBtn = document.getElementById('addNewBtn');
    const designFormContainer = document.getElementById('designFormContainer');
    const designForm = document.getElementById('designForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const formTitle = document.getElementById('formTitle');
    const imageHelp = document.getElementById('imageHelp');

    let isEditing = false;

    // ================= LOAD DESIGNS =================
    async function loadDesigns() {
        const res = await fetch('/api/designs', {
            credentials: 'include'
        });

        const data = await res.json();

        adminDesignList.innerHTML = '';

        if (data.length === 0) {
            adminDesignList.innerHTML = '<p>No designs yet</p>';
            return;
        }

        data.forEach(item => {

            const isPdf = item.image_url.toLowerCase().endsWith('.pdf');

            const media = isPdf
                ? `<div style="width:50px;height:50px;background:#eee;display:flex;align-items:center;justify-content:center;">PDF</div>`
                : `<img src="${item.image_url}" style="width:50px;height:50px;object-fit:cover;">`;

            const div = document.createElement('div');
            div.className = 'admin-item';

            div.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;">
                    ${media}
                    <strong>${item.title}</strong>
                </div>
                <div>
                    <button class="edit-btn" data-id="${item.id}">Edit</button>
                    <button class="delete-btn" data-id="${item.id}">Delete</button>
                </div>
            `;

            adminDesignList.appendChild(div);
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = () => handleEdit(btn.dataset.id);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = () => handleDelete(btn.dataset.id);
        });
    }

    loadDesigns();

    // ================= ADD BUTTON =================
    addNewBtn.onclick = () => {
        isEditing = false;

        designForm.reset();
        document.getElementById('designId').value = '';

        formTitle.textContent = "Add New Design";
        imageHelp.textContent = "Required";

        designFormContainer.style.display = "block";
    };

    // ================= CANCEL =================
    cancelBtn.onclick = () => {
        designFormContainer.style.display = "none";
    };

    // ================= SUBMIT =================
    // ✅ FIXED ONLY THIS PART
    designForm.onsubmit = async (e) => {
        e.preventDefault();

        const id = document.getElementById('designId').value;

        // ✅ Proper file handling
        const fileInput = document.getElementById('image');
        const file = fileInput.files[0];

        if (!isEditing && !file) {
            alert("Image required");
            return;
        }

        // ✅ Manual FormData
        const formData = new FormData();
        formData.append('title', document.getElementById('title').value);
        formData.append('description', document.getElementById('description').value);
        formData.append('category', document.getElementById('category').value);

        if (file) {
            formData.append('image', file);
        }

        const url = isEditing ? `/api/designs/${id}` : `/api/designs`;
        const method = isEditing ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            credentials: 'include',
            body: formData
        });

        if (res.ok) {
            designFormContainer.style.display = "none";
            designForm.reset();
            loadDesigns();
        } else {
            alert("Operation failed");
        }
    };

    // ================= EDIT =================
    async function handleEdit(id) {
        const res = await fetch(`/api/designs/${id}`, {
            credentials: 'include'
        });

        const data = await res.json();

        isEditing = true;

        document.getElementById('designId').value = data.id;
        document.getElementById('title').value = data.title;
        document.getElementById('description').value = data.description;
        document.getElementById('category').value = data.category || '';

        formTitle.textContent = "Edit Design";
        imageHelp.textContent = "Leave empty to keep existing file";

        designFormContainer.style.display = "block";
    }

    // ================= DELETE =================
    async function handleDelete(id) {
        if (!confirm("Are you sure?")) return;

        const res = await fetch(`/api/designs/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (res.ok) {
            loadDesigns();
        } else {
            alert("Delete failed");
        }
    }
}
