// Wait for the DOM to fully load
document.addEventListener('DOMContentLoaded', () => {
    // Disable browser's automatic scroll restoration
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    // Header scroll effect
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // Add sticky header effects for section headers
    const experienceHeader = document.querySelector('.experience-header');
    const projectsHeader = document.querySelector('.projects-header');

    if (experienceHeader && projectsHeader) {
        window.addEventListener('scroll', () => {
            const headerHeight = document.querySelector('header').offsetHeight;

            // For experience header
            const experienceSection = document.getElementById('experience');
            const experienceRect = experienceSection.getBoundingClientRect();

            if (experienceRect.top <= headerHeight && experienceRect.bottom > 250) {
                experienceHeader.classList.add('sticky-active');
                experienceHeader.style.top = headerHeight + 'px';
            } else {
                experienceHeader.classList.remove('sticky-active');
                if (experienceRect.top > headerHeight) {
                    experienceHeader.style.top = '';
                }
            }

            // For projects header
            const projectsSection = document.getElementById('projects');
            const projectsRect = projectsSection.getBoundingClientRect();

            if (projectsRect.top <= headerHeight && projectsRect.bottom > 250) {
                projectsHeader.classList.add('sticky-active');
                projectsHeader.style.top = headerHeight + 'px';
            } else {
                projectsHeader.classList.remove('sticky-active');
                if (projectsRect.top > headerHeight) {
                    projectsHeader.style.top = '';
                }
            }
        });
    }

    // Handle navigation click with smooth scroll
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // If it's a link to another page without hash, let the default behavior handle it
            if (!href.includes('#')) {
                return;
            }

            // If it's a link to another page with hash
            if (href.includes('#') && href.indexOf('#') !== 0) {
                const parts = href.split('#');
                const pagePart = parts[0];
                const sectionId = parts[1];

                // If we're not on the target page, navigate there first
                if (pagePart && window.location.pathname.indexOf(pagePart) === -1) {
                    // Just use normal navigation
                    return;
                }
            }

            // At this point, we're handling same-page hash navigation
            e.preventDefault();

            if (href.includes('#') && href !== '#') {
                const sectionId = href.split('#')[1];
                const targetSection = document.querySelector('#' + sectionId);
                if (targetSection) {
                    simpleScrollToSection(targetSection);
                }
            }
        });
    });

    // A simpler scroll function that's less prone to timing issues
    function simpleScrollToSection(targetSection) {
        const headerHeight = document.querySelector('header').offsetHeight;
        // Add a larger offset (40px) to move it further down from the header
        const targetPosition = targetSection.offsetTop - headerHeight + 40;

        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });

        // Update active state
        updateActiveNavLink();
    }

    // NEW FUNCTION: Update active navigation link based on scroll position
    function updateActiveNavLink() {
        const sections = document.querySelectorAll('section');
        const navLinks = document.querySelectorAll('.nav-links a');
        
        let currentSectionId = '';
        const scrollPosition = window.scrollY;
        const headerHeight = document.querySelector('header').offsetHeight;
        
        // Determine which section is currently most visible in the viewport
        sections.forEach(section => {
            const sectionTop = section.offsetTop - headerHeight - 50; // Offset by header height plus buffer
            const sectionHeight = section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                currentSectionId = section.getAttribute('id');
            }
        });
        
        // Update active class on navigation links
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === '#' + currentSectionId) {
                link.classList.add('active');
            }
        });
    }
    
    // Call updateActiveNavLink on scroll
    window.addEventListener('scroll', updateActiveNavLink);
    
    // Call it once initially to set the correct active link
    updateActiveNavLink();

    // Fix for "View My Work" button
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', () => {
            // Scroll to the projects section
            const projectsSection = document.querySelector('#projects');
            if (projectsSection) {
                simpleScrollToSection(projectsSection);
            }
        });
    }

    // Handle hash in URL on page load with a short delay
    if (window.location.hash) {
        setTimeout(() => {
            const targetSection = document.querySelector(window.location.hash);
            if (targetSection) {
                simpleScrollToSection(targetSection);
            }
        }, 100);
    }

    // Section reveal animation when scrolling
    const sections = document.querySelectorAll('section');

    // Intersection Observer for section animations
    const sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('section-visible');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, {
        threshold: 0.15 // Trigger when 15% of the section is visible
    });

    // Observe all sections
    sections.forEach(section => {
        section.classList.add('section-animated');
        sectionObserver.observe(section);
    });

    // Add a small animation to the project cards when they come into view
    const projectCards = document.querySelectorAll('.project-card');

    // Function to add 'visible' class when element is in viewport
    const projectObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Add staggered delay for cascade effect
                setTimeout(() => {
                    entry.target.classList.add('card-visible');
                }, index * 100); // 100ms delay between each card
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px' // Trigger a bit before the card enters viewport
    });

    // Observe all project cards
    projectCards.forEach(card => {
        card.classList.add('card-animated');
        projectObserver.observe(card);
    });

    // Same for experience items
    const experienceItems = document.querySelectorAll('.experience-item');

    const experienceObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('experience-visible');
                }, index * 150);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    experienceItems.forEach(item => {
        item.classList.add('experience-animated');
        experienceObserver.observe(item);
    });

    // Component items in project pages
    const componentItems = document.querySelectorAll('.component-item');

    const componentObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('component-visible');
                }, index * 150);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    componentItems.forEach(item => {
        item.classList.add('component-animated');
        componentObserver.observe(item);
    });
});
