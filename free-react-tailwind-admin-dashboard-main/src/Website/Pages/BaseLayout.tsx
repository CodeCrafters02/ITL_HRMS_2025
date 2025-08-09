import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTemplateScripts } from '../../hooks/useTemplateScripts.js';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbItem {
  text: string;
  link?: string;
}

interface BaseLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  breadcrumbItems?: BreadcrumbItem[];
}

declare global {
  interface Window {
    jQuery: any;
    gsap: any;
    ScrollTrigger: any;
    SmoothScroll: any;
    Swiper: any;
    Fancybox: any;
  }
}

const BaseLayout: React.FC<BaseLayoutProps> = ({ children, pageTitle, breadcrumbItems = [] }) => {
  const { cursorRef, preloaderRef, progressRef } = useTemplateScripts();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
    useEffect(() => {
      const styles = [
        "/src/Website/static/css/plugins/bootstrap-grid.css",
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
        "/src/Website/static/css/plugins/swiper.min.css",
        "/src/Website/static/css/plugins/fancybox.min.css",
        "/src/Website/static/css/style.css"
      ];
  
      const links = styles.map(href => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
        return link;
      });
  
      return () => {
        links.forEach(link => document.head.removeChild(link));
      };
    }, []);
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  // Initialize animations for all pages (except home which has its own initialization)
  useEffect(() => {
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script ${src}`));
        document.head.appendChild(script);
      });
    };

    const initializePageAnimations = async (): Promise<void> => {
      try {
        // Load essential scripts in sequence
        await loadScript('/src/Website/static/js/plugins/jquery.min.js');
        await loadScript('/src/Website/static/js/plugins/gsap.min.js');
        await loadScript('/src/Website/static/js/plugins/ScrollTrigger.min.js');
        await loadScript('/src/Website/static/js/plugins/ScrollTo.min.js');
        await loadScript('/src/Website/static/js/plugins/swiper.min.js');
        await loadScript('/src/Website/static/js/plugins/fancybox.min.js');
        await loadScript('/src/Website/static/js/plugins/smooth-scroll.js');
        
        // Small delay to ensure scripts are ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Skip if jQuery isn't loaded
        if (typeof window.jQuery === 'undefined') return;
        
        const $ = window.jQuery;
        
        // Arrow injection for mil-arrow-place elements
        const injectArrows = (): void => {
          $('.mil-arrow-place').each(function(this: HTMLElement) {
            if ($(this).find('.mil-arrow').length === 0) {
              const arrowSvg = $('.mil-hidden-elements .mil-arrow').clone();
              if (arrowSvg.length > 0) {
                $(this).append(arrowSvg);
              }
            }
          });
        };

        // Line injection for mil-lines-place elements  
        const injectLines = (): void => {
          $('.mil-lines-place').each(function(this: HTMLElement) {
            if ($(this).find('.mil-lines').length === 0) {
              const linesSvg = $('.mil-hidden-elements .mil-lines').clone();
              if (linesSvg.length > 0) {
                $(this).append(linesSvg);
              }
            }
          });
        };

        // Dodecahedron injection for mil-animation elements
        const injectDodecahedron = (): void => {
          $('.mil-animation').each(function(this: HTMLElement) {
            if ($(this).find('.mil-dodecahedron').length === 0) {
              const dodecahedronElement = $('.mil-hidden-elements .mil-dodecahedron').clone();
              if (dodecahedronElement.length > 0) {
                $(this).append(dodecahedronElement);
              }
            }
          });
        };

        // Initialize all injections
        injectArrows();
        injectLines();
        injectDodecahedron();

        // Menu functionality
        $('.mil-menu-btn').off('click').on('click', function(this: HTMLElement) {
          $(this).toggleClass('mil-active');
          $('.mil-menu-frame').toggleClass('mil-active');
          $('body').toggleClass('mil-menu-show');
        });

        // Dropdown menu functionality
        $('.mil-has-children a').off('click').on('click', function(this: HTMLElement, e: any) {
          e.preventDefault();
          $('.mil-has-children ul').removeClass('mil-active');
          $('.mil-has-children a').removeClass('mil-active');
          $(this).toggleClass('mil-active');
          $(this).next('ul').toggleClass('mil-active');
        });

        // Back to top functionality
        $('.mil-back-to-top .mil-link').off('click').on('click', function(e: any) {
          e.preventDefault();
          $('html, body').animate({ scrollTop: 0 }, 800);
        });

        // Smooth scroll for anchor links
        $('a[href^="#"]').off('click').on('click', function(this: HTMLElement, e: any) {
          e.preventDefault();
          const target = $(this.getAttribute('href'));
          if (target.length) {
            $('html, body').animate({
              scrollTop: target.offset().top - 100
            }, 800);
          }
        });

        // Initialize GSAP ScrollTrigger if available
        if (typeof window.gsap !== 'undefined' && window.gsap.registerPlugin) {
          if (typeof window.ScrollTrigger !== 'undefined') {
            window.gsap.registerPlugin(window.ScrollTrigger);
            
            // Refresh ScrollTrigger after a delay
            setTimeout(() => {
              window.ScrollTrigger.refresh();
            }, 500);
          }
        }

        // Initialize smooth scrolling
        if (typeof window.SmoothScroll !== 'undefined') {
          new window.SmoothScroll('a[href*="#"]', {
            speed: 800,
            speedAsDuration: true,
            offset: 100
          });
        }

        console.log('BaseLayout animations initialized successfully');
      } catch (error) {
        console.error('Error loading scripts:', error);
      }
    };

    // Initialize animations
    initializePageAnimations();
  }, []);

  // Body class for open menu
  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('mil-menu-open');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('mil-menu-open');
      document.body.style.overflow = 'auto';
    }

    // Cleanup function to remove the class when component unmounts
    return () => {
      document.body.classList.remove('mil-menu-open');
      document.body.style.overflow = 'auto';
    };
  }, [isMenuOpen]);

  return (
    <div 
      className={`mil-wrapper ${isMenuOpen ? 'mil-menu-show' : ''}`} 
      id="top"
      style={{ overflow: 'visible' }}
    >
      {/* Cursor */}
      <div className="mil-ball" ref={cursorRef}>
        <span className="mil-icon-1">
          <svg viewBox="0 0 128 128">
            <path d="M106.1,41.9c-1.2-1.2-3.1-1.2-4.2,0c-1.2,1.2-1.2,3.1,0,4.2L116.8,61H11.2l14.9-14.9c1.2-1.2,1.2-3.1,0-4.2	c-1.2-1.2-3.1-1.2-4.2,0l-20,20c-1.2,1.2-1.2,3.1,0,4.2l20,20c0.6,0.6,1.4,0.9,2.1,0.9s1.5-0.3,2.1-0.9c1.2-1.2,1.2-3.1,0-4.2	L11.2,67h105.5l-14.9,14.9c-1.2,1.2-1.2,3.1,0,4.2c0.6,0.6,1.4,0.9,2.1,0.9s1.5-0.3,2.1-0.9l20-20c1.2-1.2,1.2-3.1,0-4.2L106.1,41.9	z" />
          </svg>
        </span>
        <div className="mil-more-text">More</div>
        <div className="mil-choose-text">Сhoose</div>
      </div>



      {/* Preloader */}
      <div className="mil-preloader" ref={preloaderRef}>
        <div className="mil-preloader-animation">
          <div className="mil-pos-abs mil-animation-1">
            <p className="mil-h3 mil-muted mil-thin">Pioneering</p>
            <p className="mil-h3 mil-muted">Creative</p>
            <p className="mil-h3 mil-muted mil-thin">Excellence</p>
          </div>
          <br></br>
          <br></br>
          <div className="mil-pos-abs mil-animation-1">
            <p className="mil-h3 mil-muted">Innovyx</p>
            <p className="mil-h3 mil-muted">Tech</p>
            <p className="mil-h3 mil-muted">Labs</p>
          </div>
          <div className="mil-pos-abs mil-animation-2">
            <div className="mil-reveal-frame">
              <p className="mil-reveal-box"></p>
              <p className="mil-h3 mil-muted mil-thin">innovyxtechlabs.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mil-progress-track">
        <div className="mil-progress" ref={progressRef}></div>
      </div>

      {/* Hidden Elements for Injection */}
      <div className="mil-hidden-elements" style={{ display: 'none' }}>
        <div className="mil-arrow">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12,5 19,12 12,19"></polyline>
          </svg>
        </div>
        <div className="mil-lines">
          <div className="mil-line"></div>
          <div className="mil-line"></div>
          <div className="mil-line"></div>
        </div>
        <div className="mil-dodecahedron">
          <div className="mil-animation-el"></div>
        </div>
      </div>

      {/* Menu */}
      <div className={`mil-menu-frame ${isMenuOpen ? 'mil-active' : ''}`}>
        <div className="mil-frame-top">
          <Link to="/" className="mil-logo" onClick={() => setIsMenuOpen(false)}>Af.</Link>
          <div className={`mil-menu-btn ${isMenuOpen ? 'mil-active' : ''}`} onClick={toggleMenu}>
            <span></span>
          </div>

        </div>
        <div className="container">
          <div className="mil-menu-content">
            <div className="row">
              <div className="col-xl-5">
                <nav className="mil-main-menu" >
                  <ul>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/about">About us</Link></li>
                    <li className="mil-has-children">  <Link to="#" onClick={(e) => e.preventDefault()}>Services</Link>
                        <ul>
                          <li>
                            <a
                              href="/softwaresolution"
                              onClick={(e) => {
                                e.preventDefault();
                                handleNavigate("/softwaresolution");
                              }}
                            >
                              Software solution
                            </a>
                          </li>
                          <li>
                            <a
                              href="/digitalmarketing"
                              onClick={(e) => {
                                e.preventDefault();
                                handleNavigate("/digitalmarketing");
                              }}
                            >
                              Digital Marketing
                            </a>
                          </li>
                          <li>
                            <a
                              href="/analyticssolution"
                              onClick={(e) => {
                                e.preventDefault();
                                handleNavigate("/analyticssolution");
                              }}
                            >
                              Analytics Solution
                            </a>
                          </li>
                        </ul>
                    </li>
                    <li><Link to="/products">Products</Link></li>
                    <li><Link to="/contact">Contact us</Link></li>
                    <li><Link to="/team">Teams</Link></li>
                  </ul>
                </nav>
              </div>
              <div className="col-xl-7">
                <div className="mil-menu-right-frame">
                  <div className="mil-animation-in">
                    <div className="mil-animation-frame">
                      <div className="mil-animation mil-position-1 mil-scale" data-value-1="2" data-value-2="2"></div>
                    </div>
                  </div>
                  <div className="mil-menu-right">
                    <div className="row">
                      <div className="col-lg-8 mil-mb-60">
                        <h6 className="mil-muted mil-mb-30">Projects</h6>
                        <ul className="mil-menu-list">
                          <li><Link to="/project-1" className="mil-light-soft">Interior design studio</Link></li>
                          <li><Link to="/project-2" className="mil-light-soft">Home Security Camera</Link></li>
                          <li><Link to="/project-3" className="mil-light-soft">Kemia Honest Skincare</Link></li>
                          <li><Link to="/project-4" className="mil-light-soft">Cascade of Lava</Link></li>
                          <li><Link to="/project-5" className="mil-light-soft">Air Pro by Molekule</Link></li>
                          <li><Link to="/project-6" className="mil-light-soft">Tony's Chocolonely</Link></li>
                        </ul>
                      </div>
                      <div className="col-lg-4 mil-mb-60">
                        <h6 className="mil-muted mil-mb-30">Useful links</h6>
                        <ul className="mil-menu-list">
                          <li><a href="#." className="mil-light-soft">Privacy Policy</a></li>
                          <li><a href="#." className="mil-light-soft">Terms and conditions</a></li>
                          <li><a href="#." className="mil-light-soft">Cookie Policy</a></li>
                          <li><a href="#." className="mil-light-soft">Careers</a></li>
                          <li><a href="/signin" className="mil-light-soft">Login</a></li>
                        </ul>
                      </div>
                    </div>
                    <div className="mil-divider mil-mb-60"></div>
                    <div className="row justify-content-between">
                      <div className="col-lg-4 mil-mb-60">
                        <h6 className="mil-muted mil-mb-30">Canada</h6>
                        <p className="mil-light-soft mil-up">71 South Los Carneros Road, California <span className="mil-no-wrap">+51 174 705 812</span></p>
                      </div>
                      <div className="col-lg-4 mil-mb-60">
                        <h6 className="mil-muted mil-mb-30">Germany</h6>
                        <p className="mil-light-soft">Leehove 40, 2678 MC De Lier, Netherlands <span className="mil-no-wrap">+31 174 705 811</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Frame */}
      <div className="mil-frame">
        <div className="mil-frame-top">
          <Link to="/" className="mil-logo">A.</Link>
          <div className={`mil-menu-btn ${isMenuOpen ? 'mil-active' : ''}`} onClick={toggleMenu}>
            <span></span>
          </div>
        </div>
        <div className="mil-frame-bottom">
          <div className="mil-current-page"></div>
          <div className="mil-back-to-top">
            <a href="#top" className="mil-link mil-dark mil-arrow-place">
              <span>Back to top</span>
            </a>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="mil-content">
        <div className="mil-main-transition">
          {/* Breadcrumb and Page Title */}
          {(pageTitle || breadcrumbItems.length > 0) && (
            <div className="mil-inner-banner mil-p-0-120">
              <div className="mil-banner-content mil-center mil-up">
                <div className="container">
                  {breadcrumbItems.length > 0 && (
                    <ul className="mil-breadcrumbs mil-center mil-mb-60">
                      {breadcrumbItems.map((item, index) => (
                        <li key={index}>
                          {item.link ? (
                            <Link to={item.link}>{item.text}</Link>
                          ) : (
                            item.text
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {pageTitle && <h1 className="mil-mb-60">{pageTitle}</h1>}
                </div>
              </div>
            </div>
          )}

          {/* Page Content */}
          {children}

          {/* Footer */}
          <footer className="mil-dark-bg">
            <div className="mi-invert-fix">
              <div className="container mil-p-120-60">
                <div className="row justify-content-between">
                  <div className="col-md-4 col-lg-4 mil-mb-60">
                    <div className="mil-muted mil-logo mil-up mil-mb-30">Ashley.</div>
                    <p className="mil-light-soft mil-up mil-mb-30">Subscribe our newsletter:</p>
                    <form className="mil-subscribe-form mil-up">
                      <input type="text" placeholder="Enter our email" />
                      <button type="submit" className="mil-button mil-icon-button-sm mil-arrow-place"></button>
                    </form>
                  </div>
                  <div className="col-md-7 col-lg-6">
                    <div className="row justify-content-end">
                      <div className="col-md-6 col-lg-7">
                        <nav className="mil-footer-menu mil-mb-60">
                          <ul>
                            <li className="mil-up"><Link to="/">Home</Link></li>
                            <li className="mil-up"><Link to="/portfolio-1">Portfolio</Link></li>
                            <li className="mil-up"><Link to="/services">Services</Link></li>
                            <li className="mil-up"><Link to="/contact">Contact</Link></li>
                            <li className="mil-up"><Link to="/team">Team</Link></li>
                          </ul>
                        </nav>
                      </div>
                      <div className="col-md-6 col-lg-5">
                        <ul className="mil-menu-list mil-up mil-mb-60">
                          <li><a href="#." className="mil-light-soft">Privacy Policy</a></li>
                          <li><a href="#." className="mil-light-soft">Terms and conditions</a></li>
                          <li><a href="#." className="mil-light-soft">Cookie Policy</a></li>
                          <li><a href="#." className="mil-light-soft">Careers</a></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row justify-content-between flex-sm-row-reverse">
                  <div className="col-md-7 col-lg-6">
                    <div className="row justify-content-between">
                      <div className="col-md-6 col-lg-5 mil-mb-60">
                        <h6 className="mil-muted mil-up mil-mb-30">Canada</h6>
                        <p className="mil-light-soft mil-up">71 South Los Carneros Road, California <span className="mil-no-wrap">+51 174 705 812</span></p>
                      </div>
                      <div className="col-md-6 col-lg-5 mil-mb-60">
                        <h6 className="mil-muted mil-up mil-mb-30">Germany</h6>
                        <p className="mil-light-soft mil-up">Leehove 40, 2678 MC De Lier, Netherlands <span className="mil-no-wrap">+31 174 705 811</span></p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 col-lg-6 mil-mb-60">
                    <div className="mil-vert-between">
                      <div className="mil-mb-30">
                        <ul className="mil-social-icons mil-up">
                          <li><a href="#." target="_blank" className="social-icon"> <i className="fab fa-behance"></i></a></li>
                          <li><a href="#." target="_blank" className="social-icon"> <i className="fab fa-dribbble"></i></a></li>
                          <li><a href="#." target="_blank" className="social-icon"> <i className="fab fa-twitter"></i></a></li>
                          <li><a href="#." target="_blank" className="social-icon"> <i className="fab fa-github"></i></a></li>
                        </ul>
                      </div>
                      {/* <p className="mil-light-soft mil-up">©  2023 - Innovyx Tech Labs. All Rights Reserved.</p> */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default BaseLayout;