import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// Utility function to ensure page scrollability
export const ensureScrollable = (): void => {
    // Force page to be scrollable
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    const wrapper = document.querySelector('.mil-wrapper') as HTMLElement;
    if (wrapper) {
        wrapper.style.overflow = 'visible';
    }
    
    // Reset any menu classes that might interfere with scroll
    document.body.classList.remove('mil-menu-open');
    
    // Force ScrollTrigger refresh after a brief delay
    setTimeout(() => {
        if ((window as any).ScrollTrigger) {
            ScrollTrigger.refresh(true);
        }
    }, 50);
};

interface UseTemplateScriptsReturn {
    cursorRef: MutableRefObject<HTMLDivElement | null>;
    preloaderRef: MutableRefObject<HTMLDivElement | null>;
    progressRef: MutableRefObject<HTMLDivElement | null>;
}

export const useTemplateScripts = (): UseTemplateScriptsReturn => {
    const cursorRef = useRef<HTMLDivElement | null>(null);
    const preloaderRef = useRef<HTMLDivElement | null>(null);
    const progressRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Ensure scrollability first
        ensureScrollable();
        
        // Ensure page is scrollable by removing any overflow restrictions
        const wrapper = document.querySelector('.mil-wrapper') as HTMLElement;
        if (wrapper) {
            wrapper.style.overflow = 'visible';
        }
        
        // Ensure body is scrollable
        document.body.style.overflow = 'auto';
        
        // Refresh ScrollTrigger to recalculate positions with a slight delay
        setTimeout(() => {
            if ((window as any).ScrollTrigger) {
                ScrollTrigger.refresh();
            }
        }, 100);

        // Color variables
        const accent = 'rgba(255, 152, 0, 1)';
        const dark = '#000';
        const light = '#fff';

        // Preloader animation
        const timeline = gsap.timeline();
        
        if (preloaderRef.current) {
            timeline.to(".mil-preloader-animation", {
                opacity: 1,
            });

            timeline.fromTo(
                ".mil-animation-1 .mil-h3", {
                    y: "30px",
                    opacity: 0
                }, {
                    y: "0px",
                    opacity: 1,
                    stagger: 0.4
                },
            );

            timeline.to(".mil-animation-1 .mil-h3", {
                opacity: 0,
                y: '-30',
            }, "+=.3");

            timeline.fromTo(".mil-reveal-box", 0.1, {
                opacity: 0,
            }, {
                opacity: 1,
                x: '-30',
            });

            timeline.to(".mil-reveal-box", 0.45, {
                width: "100%",
                x: 0,
            }, "+=.1");
            
            timeline.to(".mil-reveal-box", {
                right: "0"
            });
            
            timeline.to(".mil-reveal-box", 0.3, {
                width: "0%"
            });
            
            timeline.fromTo(".mil-animation-2 .mil-h3", {
                opacity: 0,
            }, {
                opacity: 1,
            }, "-=.5");
            
            timeline.to(".mil-animation-2 .mil-h3", 0.6, {
                opacity: 0,
                y: '-30'
            }, "+=.5");
            
            timeline.to(".mil-preloader", 0.8, {
                opacity: 0,
                onComplete: () => {
                    if (preloaderRef.current) {
                        preloaderRef.current.style.display = 'none';
                    }
                }
            });
        }

        // Back to top functionality
        const btt = document.querySelector(".mil-back-to-top .mil-link") as HTMLElement;
        if (btt) {
            gsap.set(btt, {
                x: -30,
                opacity: 0,
            });

            gsap.to(btt, {
                x: 0,
                opacity: 1,
                ease: 'sine',
                scrollTrigger: {
                    trigger: "body",
                    start: "top -40%",
                    end: "top -40%",
                    toggleActions: "play none reverse none"
                }
            });
        }

        // Cursor functionality
        if (cursorRef.current) {
            const cursor = cursorRef.current;
            
            gsap.set(cursor, {
                xPercent: -50,
                yPercent: -50,
            });

            const movecursor = (e: MouseEvent) => {
                gsap.to(cursor, {
                    duration: 0.6,
                    ease: 'sine',
                    x: e.clientX,
                    y: e.clientY,
                });
            };

            document.addEventListener('pointermove', movecursor);

            // Cursor hover effects
            const dragElements = document.querySelectorAll('.mil-drag, .mil-more, .mil-choose');
            const accentElements = document.querySelectorAll('.mil-accent-cursor');

            dragElements.forEach((element: Element) => {
                element.addEventListener('mouseover', () => {
                    gsap.to(cursor, {
                        duration: 0.2,
                        width: 90,
                        height: 90,
                        opacity: 1,
                        ease: 'sine',
                    });
                });

                element.addEventListener('mouseleave', () => {
                    gsap.to(cursor, {
                        duration: 0.2,
                        width: 20,
                        height: 20,
                        opacity: 0.1,
                        ease: 'sine',
                    });
                });
            });

            accentElements.forEach((element: Element) => {
                element.addEventListener('mouseover', () => {
                    gsap.to(cursor, {
                        duration: 0.2,
                        background: accent,
                        ease: 'sine',
                    });
                    cursor.classList.add('mil-accent');
                });

                element.addEventListener('mouseleave', () => {
                    gsap.to(cursor, {
                        duration: 0.2,
                        background: dark,
                        ease: 'sine',
                    });
                    cursor.classList.remove('mil-accent');
                });
            });

            // Drag cursor effects
            const dragOnlyElements = document.querySelectorAll('.mil-drag');
            dragOnlyElements.forEach((element: Element) => {
                const iconElement = cursor.querySelector('.mil-icon-1') as HTMLElement;
                element.addEventListener('mouseover', () => {
                    if (iconElement) {
                        gsap.to(iconElement, {
                            duration: 0.2,
                            scale: 1,
                            ease: 'sine',
                        });
                    }
                });

                element.addEventListener('mouseleave', () => {
                    if (iconElement) {
                        gsap.to(iconElement, {
                            duration: 0.2,
                            scale: 0,
                            ease: 'sine',
                        });
                    }
                });
            });

            // Cleanup
            return () => {
                document.removeEventListener('pointermove', movecursor);
            };
        }

        // Scroll progress bar
        const handleScroll = (): void => {
            const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            if (progressRef.current) {
                progressRef.current.style.width = `${scrolled}%`;
            }
        };

        window.addEventListener('scroll', handleScroll);

        // GSAP animations for elements with 'mil-up' class
        gsap.utils.toArray<Element>('.mil-up').forEach((element: Element) => {
            gsap.fromTo(element, 
                { opacity: 0, y: 50 }, 
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    scrollTrigger: {
                        trigger: element,
                        start: 'top 90%',
                        toggleActions: 'play none none none'
                    }
                }
            );
        });

        // Menu functionality
        const menuBtn = document.querySelector('.mil-menu-btn') as HTMLElement;
        const menuFrame = document.querySelector('.mil-menu-frame') as HTMLElement;
        
        if (menuBtn && menuFrame) {
            const handleMenuClick = () => {
                menuBtn.classList.toggle('mil-active');
                menuFrame.classList.toggle('mil-active');
                document.body.classList.toggle('mil-menu-show');
            };
            menuBtn.addEventListener('click', handleMenuClick);
        }

        // Main menu dropdown functionality
        const hasChildrenElements = document.querySelectorAll('.mil-has-children a');
        hasChildrenElements.forEach((element: Element) => {
            element.addEventListener('click', (e: Event) => {
                e.preventDefault();
                
                // Remove active class from all other menus
                document.querySelectorAll('.mil-has-children ul').forEach((ul: Element) => {
                    ul.classList.remove('mil-active');
                });
                document.querySelectorAll('.mil-has-children a').forEach((a: Element) => {
                    a.classList.remove('mil-active');
                });
                
                // Toggle current menu
                element.classList.toggle('mil-active');
                const nextUl = element.nextElementSibling;
                if (nextUl && nextUl.tagName === 'UL') {
                    nextUl.classList.toggle('mil-active');
                }
            });
        });

        // Progress bar animation
        gsap.to('.mil-progress', {
            height: '100%',
            ease: 'sine',
            scrollTrigger: {
                scrub: 0.3
            }
        });

        // Scale image animations
        const scaleImages = document.querySelectorAll(".mil-scale");
        scaleImages.forEach((section: Element) => {
            const value1 = section.getAttribute("data-value-1") || "1";
            const value2 = section.getAttribute("data-value-2") || "1.2";
            gsap.fromTo(section, {
                ease: 'sine',
                scale: parseFloat(value1),
            }, {
                scale: parseFloat(value2),
                scrollTrigger: {
                    trigger: section,
                    scrub: true,
                    toggleActions: 'play none none reverse',
                }
            });
        });

        // Parallax animations (only on desktop)
        const parallaxImages = document.querySelectorAll(".mil-parallax");
        if (window.innerWidth > 960) {
            parallaxImages.forEach((section: Element) => {
                const value1 = section.getAttribute("data-value-1") || "0";
                const value2 = section.getAttribute("data-value-2") || "100";
                gsap.fromTo(section, {
                    ease: 'sine',
                    y: parseFloat(value1),
                }, {
                    y: parseFloat(value2),
                    scrollTrigger: {
                        trigger: section,
                        scrub: true,
                        toggleActions: 'play none none reverse',
                    }
                });
            });
        }

        // Additional cursor effects for links and inputs
        const interactiveElements = document.querySelectorAll('a:not(.mil-choose, .mil-more, .mil-drag, .mil-accent-cursor), input, textarea, .mil-accordion-menu');
        interactiveElements.forEach((element: Element) => {
            element.addEventListener('mouseover', () => {
                if (cursorRef.current) {
                    gsap.to(cursorRef.current, {
                        duration: 0.2,
                        scale: 0,
                        ease: 'sine',
                    });
                    const svg = cursorRef.current.querySelector('svg');
                    if (svg) {
                        gsap.to(svg, {
                            duration: 0.2,
                            scale: 0,
                        });
                    }
                }
            });

            element.addEventListener('mouseleave', () => {
                if (cursorRef.current) {
                    gsap.to(cursorRef.current, {
                        duration: 0.2,
                        scale: 1,
                        ease: 'sine',
                    });
                    const svg = cursorRef.current.querySelector('svg');
                    if (svg) {
                        gsap.to(svg, {
                            duration: 0.2,
                            scale: 1,
                        });
                    }
                }
            });
        });

        // Cleanup
        return () => {
            window.removeEventListener('scroll', handleScroll);
            
            // Clean up menu event listener
            const menuBtn = document.querySelector('.mil-menu-btn') as HTMLElement;
            if (menuBtn) {
                // Note: We can't remove the exact handler without keeping a reference
                // This is a limitation, but the component unmounting handles cleanup
            }
            
            // Kill all ScrollTrigger instances to prevent memory leaks
            if ((window as any).ScrollTrigger) {
                (window as any).ScrollTrigger.getAll().forEach((trigger: any) => trigger.kill());
            }
        };
    }, []);

    return { cursorRef, preloaderRef, progressRef };
}; 