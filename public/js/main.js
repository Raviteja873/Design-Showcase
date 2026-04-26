document.addEventListener('DOMContentLoaded', () => {
    // Theme logic
    const themeToggleBtn = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'dark'; // default to dark
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    function updateThemeIcon(theme) {
        if (themeToggleBtn) {
            themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    // --- Custom Cursor ---
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);
    let mouseX = 0, mouseY = 0, cursorX = 0, cursorY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX; mouseY = e.clientY;
    });

    function updateCursor() {
        cursorX += (mouseX - cursorX) * 0.2;
        cursorY += (mouseY - cursorY) * 0.2;
        cursor.style.transform = `translate(${cursorX - 6}px, ${cursorY - 6}px)`; // offset for center
        requestAnimationFrame(updateCursor);
    }
    updateCursor();

    const applyCursorHover = (el) => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    };
    document.querySelectorAll('a, button').forEach(applyCursorHover);

    // --- Scroll Animations ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll('section').forEach(el => {
        el.classList.add('fade-up');
        observer.observe(el);
    });

    // Lightbox Logic
    let allDesigns = [];
    let currentIndex = 0;

    const lightbox = document.getElementById('lightbox');
    const lightboxMedia = document.getElementById('lightboxMedia');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDesc = document.getElementById('lightboxDesc');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');

    function openLightbox(index, direction = 'none') {
        const previousIndex = currentIndex;
        currentIndex = index;
        const item = allDesigns[index];
        if(!item) return;

        const info = document.querySelector('.lightbox-info');

        const fadeIn = () => {
            const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (lightboxMedia && !prefersReduced) {
                lightboxMedia.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                lightboxMedia.style.opacity = '1';
                lightboxMedia.style.transform = 'translateX(0) scale(1)';
            }
            if (info && !prefersReduced) {
                info.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                info.style.opacity = '1';
                info.style.transform = 'translateX(0)';
            }
        };

        const updateContent = () => {
            if (lightboxTitle) lightboxTitle.textContent = item.title;
            if (lightboxDesc) lightboxDesc.textContent = item.description;

            const isPdf = item.image_url.toLowerCase().endsWith('.pdf');
            if (lightboxMedia) {
                if (isPdf) {
                    lightboxMedia.innerHTML = `<div class="card-pdf-icon" style="font-size: 5rem;">
                           <svg width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/></svg>
                       </div>`;
                    fadeIn();
                } else {
                    const img = new Image();
                    img.src = item.image_url;
                    img.alt = item.title;
                    img.onload = () => {
                        lightboxMedia.innerHTML = '';
                        lightboxMedia.appendChild(img);
                        fadeIn();
                    };
                }
            } else {
                fadeIn();
            }
        };

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (lightbox && lightbox.classList.contains('show') && !prefersReduced) {
            // Transition out before changing the design smoothly
            let outX = direction === 'next' ? '-30px' : (direction === 'prev' ? '30px' : '0px');
            let inX = direction === 'next' ? '30px' : (direction === 'prev' ? '-30px' : '0px');

            if (lightboxMedia) {
                lightboxMedia.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                lightboxMedia.style.opacity = '0';
                lightboxMedia.style.transform = `translateX(${outX}) scale(0.98)`;
            }
            if (info) {
                info.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                info.style.opacity = '0';
                info.style.transform = `translateX(${outX})`;
            }
            
            setTimeout(() => {
                // Instantly move to the starting position for slide in
                if (lightboxMedia) {
                    lightboxMedia.style.transition = 'none';
                    lightboxMedia.style.transform = `translateX(${inX}) scale(0.98)`;
                }
                if (info) {
                    info.style.transition = 'none';
                    info.style.transform = `translateX(${inX})`;
                }
                updateContent();
            }, 250); // wait for CSS fade out to finish
        } else {
            // First time opening or reduced motion mode
            updateContent();
            if (lightbox) lightbox.classList.add('show');
        }
    }

    if(lightboxClose) lightboxClose.addEventListener('click', () => lightbox.classList.remove('show'));
    if(lightboxPrev) lightboxPrev.addEventListener('click', () => {
        const nextIdx = (currentIndex > 0) ? currentIndex - 1 : allDesigns.length - 1;
        openLightbox(nextIdx, 'prev');
    });
    if(lightboxNext) lightboxNext.addEventListener('click', () => {
        const nextIdx = (currentIndex < allDesigns.length - 1) ? currentIndex + 1 : 0;
        openLightbox(nextIdx, 'next');
    });
    // Close on outside click
    if(lightbox) lightbox.addEventListener('click', (e) => {
        if(e.target === lightbox) lightbox.classList.remove('show');
    });
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (lightbox && lightbox.classList.contains('show')) {
            if (e.key === 'Escape') {
                lightbox.classList.remove('show');
            } else if (e.key === 'ArrowLeft') {
                const nextIdx = (currentIndex > 0) ? currentIndex - 1 : allDesigns.length - 1;
                openLightbox(nextIdx, 'prev');
            } else if (e.key === 'ArrowRight') {
                const nextIdx = (currentIndex < allDesigns.length - 1) ? currentIndex + 1 : 0;
                openLightbox(nextIdx, 'next');
            }
        }
    });

    // Portfolio Fetching
    const grid = document.getElementById('portfolioGrid');
    const loading = document.getElementById('loading');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

    if (grid) {
        let fetchTimeout;
        
        const fetchDesigns = async () => {
            if (loading) loading.style.display = 'none'; // handled by skeleton
            
            // Render Skeleton Loaders
            if (grid) {
                grid.innerHTML = Array(6).fill(`<div class="skeleton" style="aspect-ratio: 4/3; width: 100%;"></div>`).join('');
            }

            const search = searchInput ? searchInput.value : '';
            const category = categoryFilter ? categoryFilter.value : '';

            let url = '/api/designs?';
            if (search) url += `search=${encodeURIComponent(search)}&`;
            if (category) url += `category=${encodeURIComponent(category)}`;

            try {
                const res = await fetch(url);
                const data = await res.json();

                if (data.length === 0) {
                    grid.innerHTML = '<p>No designs found.</p>';
                    return;
                }

                grid.innerHTML = '';
                allDesigns = data;
                data.forEach((item, index) => {
                    const isPdf = item.image_url.toLowerCase().endsWith('.pdf');
                    const mediaHtml = isPdf 
                        ? `<div class="card-pdf-icon">
                               <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/><path d="M14 3v5h5M16 13H8M16 17H8M10 9H8"/></svg>
                           </div>`
                        : `<img src="${item.image_url}" alt="${item.title}" class="card-img" loading="lazy">`;

                    const card = document.createElement('div');
                    card.className = 'card fade-up';
                    card.style.cursor = 'pointer'; 
                    card.innerHTML = `
                        <div class="card-img-container">
                            ${mediaHtml}
                            <div class="card-overlay">
                                <h3>${item.title}</h3>
                                <p>${item.description}</p>
                            </div>
                        </div>
                    `;

                    // Tilt interaction
                    card.addEventListener('mousemove', (e) => {
                        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                        if(prefersReduced) return;
                        
                        const rect = card.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        const centerX = rect.width / 2;
                        const centerY = rect.height / 2;
                        const rotateX = ((y - centerY) / centerY) * -4;
                        const rotateY = ((x - centerX) / centerX) * 4;
                        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
                    });
                    card.addEventListener('mouseleave', () => {
                        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
                    });

                    // Modals and Cursors
                    applyCursorHover(card);
                    card.addEventListener('click', () => openLightbox(index));
                    
                    grid.appendChild(card);
                    observer.observe(card); // fade in sequentially
                });
            } catch (err) {
                console.error('Failed to fetch designs', err);
                grid.innerHTML = '<p>Failed to load designs. Please try again later.</p>';
            }
        };

        // Initial fetch
        fetchDesigns();

        // Listeners for filter/search with debounce
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(fetchTimeout);
                fetchTimeout = setTimeout(fetchDesigns, 300);
            });
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', fetchDesigns);
        }
    }

    // --- Protect Designs from Download ---
    document.addEventListener('contextmenu', (e) => {
        // Disable right click on images, cards, and the lightbox
        if (e.target.tagName === 'IMG' || e.target.closest('.card') || e.target.closest('#lightbox')) {
            e.preventDefault();
        }
    });

    document.addEventListener('dragstart', (e) => {
        // Prevent users from dragging the image to their desktop
        if (e.target.tagName === 'IMG' || e.target.closest('.card') || e.target.closest('#lightbox')) {
            e.preventDefault();
        }
    });

});
