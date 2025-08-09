import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTemplateScripts } from '../../hooks/useTemplateScripts.js';
import { useNavigate } from 'react-router-dom';

interface HomeLayoutProps {
  children: ReactNode;
  hasPreloaderShown?: boolean;
}

const HomeLayout: React.FC<HomeLayoutProps> = ({ children, hasPreloaderShown = false }) => {
  const { cursorRef, preloaderRef, progressRef } = useTemplateScripts();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  // Body class for open menu
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : 'auto';
  }, [isMenuOpen]);
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
        <div className="mil-choose-text">Choose</div>
      </div>

      {/* Preloader - Only show on first load */}
      {!hasPreloaderShown && (
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
      )}


      {/* Progress Bar */}
      <div className="mil-progress-track">
        <div className="mil-progress" ref={progressRef}></div>
      </div>
      

      {/* Menu */}
      <div className={`mil-menu-frame ${isMenuOpen ? 'mil-active' : ''}`}>
        <div className="mil-frame-top">
          <Link to="/" className="mil-logo" onClick={() => setIsMenuOpen(false)}>Innovyx Tech Labs</Link>
          <div className={`mil-menu-btn ${isMenuOpen ? 'mil-active' : ''}`} onClick={toggleMenu}>
            <span></span>
          </div>
        </div>
        <div className="container">
          <div className="mil-menu-content">
            <div className="row">
              <div className="col-xl-5">
                <nav className="mil-main-menu" id="swupMenu">
                  <ul>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/about">About us</Link></li>
                    <li className="mil-has-children"><Link to="">Services</Link>
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
          <Link to="/about" className="mil-logo">A.</Link>
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
      
      {/* Content - No banner for home page */}
      <div className="mil-content">
        <div className="mil-main-transition">
          {/* Page Content */}
          {children}

          {/* Footer */}
          <footer className="mil-dark-bg">
            <div className="mi-invert-fix">
              <div className="container mil-p-120-60">
                <div className="row justify-content-between">
                  <div className="col-md-4 col-lg-4 mil-mb-60">
                    <div className="mil-muted mil-logo mil-up mil-mb-30">Innovyx Tech Labs</div>
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
                            <li className="mil-up"><Link to="#.">About us</Link></li>
                            <li className="mil-up"><Link to="/services">Services</Link></li>
                            <li className="mil-up"><Link to="#.">Products</Link></li>
                            <li className="mil-up"><Link to="/contact">Contact</Link></li>
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

export default HomeLayout;
