document.addEventListener('DOMContentLoaded', async () => {

    const isLogin = window.location.pathname.endsWith('login.html');
    const isAdmin = window.location.pathname.endsWith('admin.html');

    // LOGIN PAGE
    if (isLogin) {
        document.body.style.display = 'block';
    }

    // ADMIN PAGE AUTH CHECK
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

    // LOGIN FORM
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = form.username.value;
            const password = form.password.value;

            const res = await fetch('/api/login', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                window.location.href = '/admin.html';
            } else {
                alert('Login failed');
            }
        });
    }

    // LOGOUT
    const logout = document.getElementById('logoutBtn');
    if (logout) {
        logout.addEventListener('click', async () => {
            await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = '/login.html';
        });
    }

});


function initAdminDashboard() {

    const list = document.getElementById('adminDesignList');
    const form = document.getElementById('designForm');

    async function load() {
        const res = await fetch('/api/designs', {
            credentials: 'include'
        });
        const data = await res.json();

        list.innerHTML = '';

        data.forEach(d => {
            const div = document.createElement('div');
            div.innerHTML = `
                <p>${d.title}</p>
                <button onclick="deleteDesign(${d.id})">Delete</button>
            `;
            list.appendChild(div);
        });
    }

    load();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fd = new FormData(form);

        await fetch('/api/designs', {
            method: 'POST',
            credentials: 'include',
            body: fd
        });

        form.reset();
        load();
    });

}

async function deleteDesign(id) {
    await fetch('/api/designs/' + id, {
        method: 'DELETE',
        credentials: 'include'
    });
    location.reload();
}
