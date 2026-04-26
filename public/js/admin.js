// Check Auth on load
document.addEventListener('DOMContentLoaded', async () => {
    const isLoginPath = window.location.pathname.endsWith('login.html');
    const isAdminPath = window.location.pathname.endsWith('admin.html');

    if (isLoginPath) {
        // Force logout so user has to login every time they hit the login page
        await fetch('/api/logout', { method: 'POST' }).catch(() => {});
        document.body.style.display = 'block'; // Show login immediately
    } else if (isAdminPath) {
        try {
            const res = await fetch('/api/auth/status');
            const data = await res.json();
            
            if (data.loggedIn) {
                document.body.style.display = 'block'; // Show dashboard
            } else {
                window.location.href = '/login.html';
            }
        } catch (err) {
            window.location.href = '/login.html';
        }
    }

    // Login Form logic
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

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login.html';
        });
    }
});

// Admin Dashboard functions
function initAdminDashboard() {
    const adminDesignList = document.getElementById('adminDesignList');
    const addNewBtn = document.getElementById('addNewBtn');
    const designFormContainer = document.getElementById('designFormContainer');
    const designForm = document.getElementById('designForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const formTitle = document.getElementById('formTitle');
    const imageHelp = document.getElementById('imageHelp');
    
    let isEditing = false;

    // Fetch and display designs
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
                    ? `<div style="width: 50px; height: 50px; background: #e2e8f0; border-radius: 4px; display: flex; align-items: center; justify-content: center;"><span style="font-size: 10px; font-weight: bold;">PDF</span></div>`
                    : `<img src="${item.image_url}" alt="" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">`;

                const div = document.createElement('div');
                div.className = 'admin-item';
                div.innerHTML = `
                    <div style="display:flex; align-items:center; gap: var(--space-2);">
                        ${mediaHtml}
                        <div>
                            <strong>${item.title}</strong>
                        </div>
                    </div>
                    <div class="admin-actions">
                        <button class="btn btn-secondary edit-btn" data-id="${item.id}">Edit</button>
                        <button class="btn btn-danger delete-btn" data-id="${item.id}">Delete</button>
                    </div>
                `;
                adminDesignList.appendChild(div);
            });

            // Attach listeners
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => handleEdit(btn.getAttribute('data-id')));
            });
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => handleDelete(btn.getAttribute('data-id')));
            });

        } catch (err) {
            console.error('Error fetching admin designs', err);
            adminDesignList.innerHTML = '<p style="color:red">Failed to load data.</p>';
        }
    };

    // Initial fetch
    fetchAdminDesigns();

    // UI Toggles
    addNewBtn.addEventListener('click', () => {
        isEditing = false;
        formTitle.textContent = 'Add New Design';
        designForm.reset();
        document.getElementById('designId').value = '';
        imageHelp.textContent = 'Required';
        designFormContainer.style.display = 'block';
        designFormContainer.scrollIntoView({ behavior: 'smooth' });
    });

    cancelBtn.addEventListener('click', () => {
        designFormContainer.style.display = 'none';
        designForm.reset();
    });

    // Form Submit (Create/Update)
    designForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('designId').value;
        const title = document.getElementById('title').value;
        const categoryEl = document.getElementById('category');
        const category = categoryEl ? categoryEl.value : '';
        const description = document.getElementById('description').value;
        const imageFile = document.getElementById('image').files[0];

        const formData = new FormData();
        formData.append('title', title);
        formData.append('category', category);
        formData.append('description', description);
        if (imageFile) {
            formData.append('image', imageFile);
        } else if (!isEditing) {
            alert('Image is required for new designs');
            return;
        }

        const url = isEditing ? `/api/designs/${id}` : '/api/designs';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                body: formData
            });

            if (res.ok) {
                designFormContainer.style.display = 'none';
                designForm.reset();
                fetchAdminDesigns();
            } else {
                const errData = await res.json();
                alert(errData.error || 'Operation failed');
            }
        } catch (err) {
            alert('Server error');
        }
    });

    // Handle Edit
    async function handleEdit(id) {
        try {
            const res = await fetch(`/api/designs/${id}`);
            const data = await res.json();

            isEditing = true;
            formTitle.textContent = 'Edit Design';
            document.getElementById('designId').value = data.id;
            document.getElementById('title').value = data.title;
            const categoryEl = document.getElementById('category');
            if (categoryEl) categoryEl.value = data.category || '';
            document.getElementById('description').value = data.description;
            
            imageHelp.textContent = 'Leave empty to keep current image';
            
            designFormContainer.style.display = 'block';
            designFormContainer.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            alert('Failed to fetch design data');
        }
    }

    // Handle Delete
    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this design?')) return;

        try {
            const res = await fetch(`/api/designs/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchAdminDesigns();
            } else {
                alert('Delete failed');
            }
        } catch (err) {
            alert('Server error');
        }
    }
}
