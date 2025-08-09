import React, { useEffect, useRef,useState } from 'react';
import { Link } from 'react-router-dom';
import HomeLayout from './HomeLayout.js';

// TypeScript declarations for global variables
declare global {
    interface Window {
        jQuery: any;
        $: any;
        gsap: any;
        ScrollTrigger: any;
        Swiper: any;
    }
}

interface HomeProps {
    hasPreloaderShown: boolean;
}

const Home: React.FC<HomeProps> = ({ hasPreloaderShown }) => {
    const scriptsLoadedRef = useRef<boolean>(false);

    useEffect(() => {
        // Prevent multiple script loading
        if (scriptsLoadedRef.current) return;
        
        const scriptUrls = [
            '/src/Website/static/js/plugins/jquery.min.js',
            '/src/Website/static/js/plugins/swup.min.js', // Load Swup but we'll disable it
            '/src/Website/static/js/plugins/swiper.min.js',
            '/src/Website/static/js/plugins/fancybox.min.js',
            '/src/Website/static/js/plugins/gsap.min.js',
            '/src/Website/static/js/plugins/smooth-scroll.js',
            '/src/Website/static/js/plugins/ScrollTrigger.min.js',
            '/src/Website/static/js/plugins/ScrollTo.min.js'
            // Don't load main.js as it contains Swup initialization
        ];

        const loadedScripts: HTMLScriptElement[] = [];

        // Clear any existing arrows before loading scripts
        const clearExistingArrows = (): void => {
            const arrowElements = document.querySelectorAll('.mil-arrow-place .mil-arrow');
            arrowElements.forEach((arrow: Element) => arrow.remove());
        };

        const loadScript = (url: string): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                // Check if script already exists
                if (document.querySelector(`script[src="${url}"]`)) {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = url;
                script.async = false;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
                document.body.appendChild(script);
                loadedScripts.push(script);
            });
        };

        // Load scripts sequentially and clear arrows first
        const loadAllScripts = async (): Promise<void> => {
            clearExistingArrows();
            
            for (const url of scriptUrls) {
                try {
                    await loadScript(url);
                } catch (error) {
                    console.warn(`Failed to load script: ${url}`, error);
                }
            }
            
            // Initialize animations after scripts load
            setTimeout(() => {
                initializeAnimations();
            }, 100);
            
            scriptsLoadedRef.current = true;
        };

        // Initialize the essential animations manually (from main.js but without Swup)
        const initializeAnimations = (): void => {
            // Skip if jQuery isn't loaded
            if (typeof window.jQuery === 'undefined') return;
            
            const $ = window.jQuery;
            
            // Arrow injection for mil-arrow-place elements
            const injectArrows = (): void => {
                $('.mil-arrow-place').each(function(this: HTMLElement) {
                    if ($(this).find('.mil-arrow').length === 0) {
                        const arrowSvg = $('.mil-hidden-elements .mil-arrow').clone();
                        $(this).append(arrowSvg);
                    }
                });
            };

            // Line injection for mil-lines-place elements  
            const injectLines = (): void => {
                $('.mil-lines-place').each(function(this: HTMLElement) {
                    if ($(this).find('.mil-lines').length === 0) {
                        const linesSvg = $('.mil-hidden-elements .mil-lines').clone();
                        $(this).append(linesSvg);
                    }
                });
            };

            // Dodecahedron injection for mil-animation elements
            const injectDodecahedron = (): void => {
                $('.mil-animation').each(function(this: HTMLElement) {
                    if ($(this).find('.mil-dodecahedron').length === 0) {
                        const dodecahedronElement = $('.mil-hidden-elements .mil-dodecahedron').clone();
                        $(this).append(dodecahedronElement);
                    }
                });
            };

            // Initialize all injections
            injectArrows();
            injectLines();
            injectDodecahedron();

            // Menu functionality
            $('.mil-menu-btn').on('click', function(this: HTMLElement) {
                $(this).toggleClass('mil-active');
                $('.mil-menu-frame').toggleClass('mil-active');
                $('body').toggleClass('mil-menu-show');
            });

            // Dropdown menu functionality
            $('.mil-has-children a').on('click', function(this: HTMLElement, e: any) {
                e.preventDefault();
                $('.mil-has-children ul').removeClass('mil-active');
                $('.mil-has-children a').removeClass('mil-active');
                $(this).toggleClass('mil-active');
                $(this).next('ul').toggleClass('mil-active');
            });

            // Back to top functionality
            $('.mil-back-to-top .mil-link').on('click', function(e: any) {
                e.preventDefault();
                $('html, body').animate({ scrollTop: 0 }, 800);
            });

            // Smooth scroll for anchor links
            $('a[href^="#"]').on('click', function(this: HTMLElement, e: any) {
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
                // Ensure ScrollTrigger is registered
                if (typeof window.ScrollTrigger !== 'undefined') {
                    window.gsap.registerPlugin(window.ScrollTrigger);
                    
                    // Refresh ScrollTrigger after a delay
                    setTimeout(() => {
                        window.ScrollTrigger.refresh();
                    }, 500);
                }
            }
        };

        loadAllScripts();

        // Cleanup function
        return () => {
            // Clear arrows on unmount
            clearExistingArrows();
            
            // Remove scripts if needed (optional - might cause issues if other components need them)
            loadedScripts.forEach((script: HTMLScriptElement) => {
                if (document.body.contains(script)) {
                    document.body.removeChild(script);
                }
            });
            
            scriptsLoadedRef.current = false;
        };
    }, []); // Empty dependency array ensures this effect runs only once


      const [stylesLoaded, setStylesLoaded] = useState(false);
    
      useEffect(() => {
        const styles = [
          "/src/Website/static/css/plugins/bootstrap-grid.css",
          "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
          "/src/Website/static/css/plugins/swiper.min.css",
          "/src/Website/static/css/plugins/fancybox.min.css",
          "/src/Website/static/css/style.css"
        ];
    
        let loadedCount = 0;
        const links = styles.map((href) => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = href;
    
          link.onload = () => {
            loadedCount++;
            if (loadedCount === styles.length) {
              setStylesLoaded(true); // all styles loaded
            }
          };
    
          document.head.appendChild(link);
          return link;
        });
    
        return () => {
          links.forEach((link) => document.head.removeChild(link));
        };
      }, []);
    
      if (!stylesLoaded) {
        // Show blank or loader until styles are loaded
        return <div style={{ background: "#000000ff", height: "100vh" }}></div>;
      }

    return (
        <HomeLayout hasPreloaderShown={hasPreloaderShown}>
             <div style={{ position: 'relative', height: '400px' /* or your container height */ }}>
            <Link
              to="/bookdemo"
              style={{
                position: 'fixed',
                top: '50px',
                right: '0px',
                backgroundColor: "rgb(255, 152, 0)",
                color: "#fff",
                padding: "8px 24px",
                borderRadius: "30px",
                fontWeight: "600",
                boxShadow: "0 4px 12px rgba(136,136,136,0.5)", // this is shadow for the button itself, you can keep or remove
                textDecoration: "none",
                textAlign: "center",
                textTransform: "uppercase",
                fontSize: "12px",
                letterSpacing: "1px",
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "background-color 0.3s ease",
                userSelect: 'none',
                display: 'inline-block',
                marginLeft: 'auto',
                marginRight: '180px',
                outline: 'none',     // Remove focus outline
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#555555")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgb(255, 152, 0)")}
            >
              BOOK A DEMO
            </Link>
            </div>
            {/* The following JSX is a direct and correct conversion of the body content from home-1.html. */}
            <div className="mil-wrapper" id="top">

                <div className="mil-ball">
                    <span className="mil-icon-1">
                        <svg viewBox="0 0 128 128">
                            <path d="M106.1,41.9c-1.2-1.2-3.1-1.2-4.2,0c-1.2,1.2-1.2,3.1,0,4.2L116.8,61H11.2l14.9-14.9c1.2-1.2,1.2-3.1,0-4.2	c-1.2-1.2-3.1-1.2-4.2,0l-20,20c-1.2,1.2-1.2,3.1,0,4.2l20,20c0.6,0.6,1.4,0.9,2.1,0.9s1.5-0.3,2.1-0.9c1.2-1.2,1.2-3.1,0-4.2	L11.2,67h105.5l-14.9,14.9c-1.2,1.2-1.2,3.1,0,4.2c0.6,0.6,1.4,0.9,2.1,0.9s1.5-0.3,2.1-0.9l20-20c1.2-1.2,1.2-3.1,0-4.2L106.1,41.9	z" />
                        </svg>
                    </span>
                    <div className="mil-more-text">More</div>
                    <div className="mil-choose-text">Сhoose</div>
                </div>

                <div className="mil-content">
                    <div id="swupMain" className="mil-main-transition">

                        <section className="mil-banner mil-dark-bg">
                            <div className="mi-invert-fix">
                                <div className="mil-animation-frame">
                                    <div className="mil-animation mil-position-1 mil-scale" data-value-1="7" data-value-2="1.6"></div>
                                    <div className="mil-animation mil-position-2 mil-scale" data-value-1="4" data-value-2="1"></div>
                                    <div className="mil-animation mil-position-3 mil-scale" data-value-1="1.2" data-value-2=".1"></div>
                                </div>
                                <div className="mil-gradient"></div>
                                <div className="container">
                                    <div className="mil-banner-content mil-up">
                                        <h1 className="mil-muted mil-mb-60">Designing <span className="mil-thin">a Better</span><br /> World <span className="mil-thin">Today</span></h1>
                                        <div className="row">
                                            <div className="col-md-7 col-lg-5">
                                                <p className="mil-light-soft mil-mb-60">Welcome to our world of endless imagination and boundless creativity. Together, let's embark on a remarkable journey where dreams become tangible realities.</p>
                                            </div>
                                        </div>
                                        <Link to="/services" className="mil-button mil-arrow-place mil-btn-space">
                                            <span>What we do</span>
                                        </Link>
                                        <a href="portfolio-1.html" className="mil-link mil-muted mil-arrow-place">
                                            <span>View works</span>
                                        </a>
                                        <div className="mil-circle-text">
                                            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 300 300" enableBackground="new 0 0 300 300" xmlSpace="preserve" className="mil-ct-svg mil-rotate" data-value="360">
                                                <defs>
                                                    <path id="circlePath" d="M 150, 150 m -60, 0 a 60,60 0 0,1 120,0 a 60,60 0 0,1 -120,0 " />
                                                </defs>
                                                <circle cx="150" cy="100" r="75" fill="none" />
                                                <g>
                                                    <use xlinkHref="#circlePath" fill="none" />
                                                    <text style={{ letterSpacing: '6.5px' }}>
                                                        <textPath xlinkHref="#circlePath">Scroll down - Scroll down - </textPath>
                                                    </text>
                                                </g>
                                            </svg>
                                            <a href="#about" className="mil-button mil-arrow-place mil-icon-button mil-arrow-down"></a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section id="about">
                            <div className="container mil-p-120-30">
                                <div className="row justify-content-between align-items-center">
                                    <div className="col-lg-6 col-xl-5">
                                        <div className="mil-mb-90">
                                            <h2 className="mil-up mil-mb-60">Discover <br />Our <span className="mil-thin">Studio</span></h2>
                                            <p className="mil-up mil-mb-30">At our design studio, we are a collective of talented individuals ignited by our unwavering passion for transforming ideas into reality. With a harmonious blend of diverse backgrounds and a vast array of skill sets, we join forces to create compelling solutions for our esteemed clients.</p>
                                            <p className="mil-up mil-mb-60">Collaboration is at the heart of what we do. Our team thrives on the synergy that arises when unique perspectives converge, fostering an environment of boundless creativity. By harnessing our collective expertise, we produce extraordinary results that consistently surpass expectations.</p>
                                            <div className="mil-about-quote">
                                                <div className="mil-avatar mil-up">
                                                    <img src="/src/Website/static/img/faces/customers/2.jpg" alt="Founder" />
                                                </div>
                                                <h6 className="mil-quote mil-up">Passionately Creating <span className="mil-thin">Design Wonders:</span> Unleashing <span className="mil-thin">Boundless Creativity</span></h6>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-lg-5">
                                        <div className="mil-about-photo mil-mb-90">
                                            <div className="mil-lines-place"></div>
                                            <div className="mil-up mil-img-frame" style={{ paddingBottom: '160%' }}>
                                                <img src="/src/Website/static/img/photo/1.jpg" alt="img" className="mil-scale" data-value-1="1" data-value-2="1.2" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="mil-dark-bg">
                            <div className="mi-invert-fix">
                                <div className="mil-animation-frame">
                                    <div className="mil-animation mil-position-1 mil-scale" data-value-1="2.4" data-value-2="1.4" style={{ top: '300px', right: '-100px' }}></div>
                                    <div className="mil-animation mil-position-2 mil-scale" data-value-1="2" data-value-2="1" style={{ left: '150px' }}></div>
                                </div>
                                <div className="container mil-p-120-0">
                                    <div className="mil-mb-120">
                                        <div className="row">
                                            <div className="col-lg-10">
                                                <span className="mil-suptitle mil-light-soft mil-suptitle-right mil-up">Professionals focused on helping your brand<br /> grow and move forward.</span>
                                            </div>
                                        </div>
                                        <div className="mil-complex-text justify-content-center mil-up mil-mb-15">
                                            <span className="mil-text-image"><img src="/src/Website/static/img/photo/2.jpg" alt="team" /></span>
                                            <h2 className="mil-h1 mil-muted mil-center">Unique <span className="mil-thin">Ideas</span></h2>
                                        </div>
                                        <div className="mil-complex-text justify-content-center mil-up">
                                            <h2 className="mil-h1 mil-muted mil-center">For Your <span className="mil-thin">Business.</span></h2>
                                            <Link to="/services" className="mil-services-button mil-button mil-arrow-place"><span>What we do</span></Link>
                                        </div>
                                    </div>
                                    <div className="row mil-services-grid m-0">
                                        <div className="col-md-6 col-lg-3 mil-services-grid-item p-0">
                                            <Link to="/service" className="mil-service-card-sm mil-up">
                                                <h5 className="mil-muted mil-mb-30">Branding and <br />Identity Design</h5>
                                                <p className="mil-light-soft mil-mb-30">Our creative agency is a team of professionals focused on helping your brand grow.</p>
                                                <div className="mil-button mil-icon-button-sm mil-arrow-place"></div>
                                            </Link>
                                        </div>
                                        <div className="col-md-6 col-lg-3 mil-services-grid-item p-0">
                                            <Link to="/service" className="mil-service-card-sm mil-up">
                                                <h5 className="mil-muted mil-mb-30">Website Design <br />and Development</h5>
                                                <p className="mil-light-soft mil-mb-30">Our creative agency is a team of professionals focused on helping your brand grow.</p>
                                                <div className="mil-button mil-icon-button-sm mil-arrow-place"></div>
                                            </Link>
                                        </div>
                                        <div className="col-md-6 col-lg-3 mil-services-grid-item p-0">
                                            <Link to="/service" className="mil-service-card-sm mil-up">
                                                <h5 className="mil-muted mil-mb-30">Advertising and <br />Marketing Campaigns</h5>
                                                <p className="mil-light-soft mil-mb-30">Our creative agency is a team of professionals focused on helping your brand grow.</p>
                                                <div className="mil-button mil-icon-button-sm mil-arrow-place"></div>
                                            </Link>
                                        </div>
                                        <div className="col-md-6 col-lg-3 mil-services-grid-item p-0">
                                            <Link to="/service" className="mil-service-card-sm mil-up">
                                                <h5 className="mil-muted mil-mb-30">Creative Consulting <br />and Development</h5>
                                                <p className="mil-light-soft mil-mb-30">Our creative agency is a team of professionals focused on helping your brand grow.</p>
                                                <div className="mil-button mil-icon-button-sm mil-arrow-place"></div>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <div className="container mil-p-120-30">
                                <div className="row justify-content-between align-items-center">
                                    <div className="col-lg-5 col-xl-4">
                                        <div className="mil-mb-90">
                                            <h2 className="mil-up mil-mb-60">Meet <br />Our Team</h2>
                                            <p className="mil-up mil-mb-30">We are talented individuals who are passionate about bringing ideas to life. With a diverse range of backgrounds and skill sets, we collaborate to produce effective solutions for our clients.</p>
                                            <p className="mil-up mil-mb-60">Together, our creative team is committed to delivering impactful work that exceeds expectations.</p>
                                            <div className="mil-up"><Link to="/team" className="mil-button mil-arrow-place mil-mb-60"><span>Read more</span></Link></div>
                                            <h4 className="mil-up"><span className="mil-thin">We</span> delivering <br /><span className="mil-thin">exceptional</span> results.</h4>
                                        </div>
                                    </div>
                                    <div className="col-lg-6">
                                        <div className="mil-team-list">
                                            <div className="mil-lines-place"></div>
                                            <div className="row mil-mb-60">
                                                <div className="col-sm-6">
                                                    <div className="mil-team-card mil-up mil-mb-30">
                                                        <img src="/src/Website/static/img/faces/1.jpg" alt="Team member" />
                                                        <div className="mil-description">
                                                            <div className="mil-secrc-text">
                                                                <h5 className="mil-muted mil-mb-5"><a href="home-2.html">Anna Oldman</a></h5>
                                                                <p className="mil-link mil-light-soft mil-mb-10">Art Director</p>
                                                                <ul className="mil-social-icons mil-center">
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-behance"></i></a></li>
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-dribbble"></i></a></li>
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-twitter"></i></a></li>
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-github"></i></a></li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mil-team-card mil-up mil-mb-30">
                                                        <img src="/src/Website/static/img/faces/3.jpg" alt="Team member" />
                                                        <div className="mil-description">
                                                            <div className="mil-secrc-text">
                                                                <h5 className="mil-muted mil-mb-5"><a href="home-2.html">Oscar Freeman</a></h5>
                                                                <p className="mil-link mil-light-soft mil-mb-10">Frontend Dev</p>
                                                                <ul className="mil-social-icons mil-center">
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-behance"></i></a></li>
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-dribbble"></i></a></li>
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-twitter"></i></a></li>
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-github"></i></a></li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-sm-6">
                                                    <p className="mil-mobile-hidden mil-text-sm mil-mb-30" style={{ height: '30px' }}><span className="mil-accent">*</span> The founders of our agency</p>
                                                    <div className="mil-team-card mil-up mil-mb-30">
                                                        <img src="/src/Website/static/img/faces/2.jpg" alt="Team member" />
                                                        <div className="mil-description">
                                                            <div className="mil-secrc-text">
                                                                <h5 className="mil-muted mil-mb-5"><a href="home-2.html">Emma Newman</a></h5>
                                                                <p className="mil-link mil-light-soft mil-mb-10">Founder</p>
                                                                <ul className="mil-social-icons mil-center">
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-behance"></i></a></li>
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-dribbble"></i></a></li>
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-twitter"></i></a></li>
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-github"></i></a></li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mil-team-card mil-up mil-mb-30">
                                                        <img src="/src/Website/static/img/faces/4.jpg" alt="Team member" />
                                                        <div className="mil-description">
                                                            <div className="mil-secrc-text">
                                                                <h5 className="mil-muted mil-mb-5"><a href="home-2.html">Lisa Trueman</a></h5>
                                                                <p className="mil-link mil-light-soft mil-mb-10">UI/UX Designer</p>
                                                                <ul className="mil-social-icons mil-center">
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-behance"></i></a></li>
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-dribbble"></i></a></li>
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-twitter"></i></a></li>
                                                                    <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-github"></i></a></li>
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="mil-soft-bg">
                            <div className="container mil-p-120-120">
                                <div className="row">
                                    <div className="col-lg-10">
                                        <span className="mil-suptitle mil-suptitle-right mil-suptitle-dark mil-up">Customer reviews are a valuable source <br />of information for both businesses and consumers.</span>
                                    </div>
                                </div>
                                <h2 className="mil-center mil-up mil-mb-60">Customer <span className="mil-thin">Voices:</span> <br />Hear What <span className="mil-thin">They Say!</span></h2>
                                <div className="mil-revi-pagination mil-up mil-mb-60"></div>
                                <div className="row mil-relative justify-content-center">
                                    <div className="col-lg-8">
                                        <div className="mil-slider-nav mil-soft mil-reviews-nav mil-up">
                                            <div className="mil-slider-arrow mil-prev mil-revi-prev mil-arrow-place"></div>
                                            <div className="mil-slider-arrow mil-revi-next mil-arrow-place"></div>
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="mil-quote-icon mil-up">
                                            <path d="M 13.5 10 A 8.5 8.5 0 0 0 13.5 27 A 8.5 8.5 0 0 0 18.291016 25.519531 C 17.422273 29.222843 15.877848 31.803343 14.357422 33.589844 C 12.068414 36.279429 9.9433594 37.107422 9.9433594 37.107422 A 1.50015 1.50015 0 1 0 11.056641 39.892578 C 11.056641 39.892578 13.931586 38.720571 16.642578 35.535156 C 19.35357 32.349741 22 27.072581 22 19 A 1.50015 1.50015 0 0 0 21.984375 18.78125 A 8.5 8.5 0 0 0 13.5 10 z M 34.5 10 A 8.5 8.5 0 0 0 34.5 27 A 8.5 8.5 0 0 0 39.291016 25.519531 C 38.422273 29.222843 36.877848 31.803343 35.357422 33.589844 C 33.068414 36.279429 30.943359 37.107422 30.943359 37.107422 A 1.50015 1.50015 0 1 0 32.056641 39.892578 C 32.056641 39.892578 34.931586 38.720571 37.642578 35.535156 C 40.35357 32.349741 43 27.072581 43 19 A 1.50015 1.50015 0 0 0 42.984375 18.78125 A 8.5 8.5 0 0 0 34.5 10 z" fill="#000000" />
                                        </svg>
                                        <div className="swiper-container mil-reviews-slider">
                                            <div className="swiper-wrapper">
                                                <div className="swiper-slide">
                                                    <div className="mil-review-frame mil-center" data-swiper-parallax="-200" data-swiper-parallax-opacity="0">
                                                        <h5 className="mil-up mil-mb-10">Sarah Newman</h5>
                                                        <p className="mil-mb-5 mil-upper mil-up mil-mb-30">Envato market</p>
                                                        <p className="mil-text-xl mil-up">This creative agency stands out with their exceptional talent and expertise. Their ability to think outside the box and bring unique ideas to life is truly impressive. With meticulous attention to detail, they consistently deliver visually stunning and impactful work.</p>
                                                    </div>
                                                </div>
                                                <div className="swiper-slide">
                                                    <div className="mil-review-frame mil-center" data-swiper-parallax="-200" data-swiper-parallax-opacity="0">
                                                        <h5 className="mil-up mil-mb-10">Emma Trueman</h5>
                                                        <p className="mil-mb-5 mil-upper mil-up mil-mb-30">Envato market</p>
                                                        <p className="mil-text-xl mil-up">I had the pleasure of working with this creative agency, and I must say, they truly impressed me. They consistently think outside the box, resulting in impressive and impactful work. I highly recommend this agency for their consistent delivery of exceptional creative solutions.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="mil-soft-bg">
                            <div className="container mil-p-0-120">
                                <div className="swiper-container mil-infinite-show mil-up">
                                    <div className="swiper-wrapper">
                                        <div className="swiper-slide">
                                            <a href="#." className="mil-partner-frame" style={{ width: '60px' }}><img src="/src/Website/static/img/partners/1.svg" alt="logo" /></a>
                                        </div>
                                        <div className="swiper-slide">
                                            <a href="#." className="mil-partner-frame" style={{ width: '100px' }}><img src="/src/Website/static/img/partners/2.svg" alt="logo" /></a>
                                        </div>
                                        <div className="swiper-slide">
                                            <a href="#." className="mil-partner-frame" style={{ width: '60px' }}><img src="/src/Website/static/img/partners/1.svg" alt="logo" /></a>
                                        </div>
                                        <div className="swiper-slide">
                                            <a href="#." className="mil-partner-frame" style={{ width: '100px' }}><img src="/src/Website/static/img/partners/2.svg" alt="logo" /></a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <section>
                            <div className="container mil-p-120-60">
                                <div className="row align-items-center mil-mb-30">
                                    <div className="col-lg-6 mil-mb-30">
                                        <h3 className="mil-up">Popular Publications:</h3>
                                    </div>
                                    <div className="col-lg-6 mil-mb-30">
                                        <div className="mil-adaptive-right mil-up">
                                            <a href="blog.html" className="mil-link mil-dark mil-arrow-place">
                                                <span>View all</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-lg-6">
                                        <a href="publication.html" className="mil-blog-card mil-mb-60">
                                            <div className="mil-cover-frame mil-up">
                                                <img src="/src/Website/static/img/blog/1.jpg" alt="cover" />
                                            </div>
                                            <div className="mil-post-descr">
                                                <div className="mil-labels mil-up mil-mb-30">
                                                    <div className="mil-label mil-upper mil-accent">TECHNOLOGY</div>
                                                    <div className="mil-label mil-upper">may 24 2023</div>
                                                </div>
                                                <h4 className="mil-up mil-mb-30">How to Become a Graphic Designer in 10 Simple Steps</h4>
                                                <p className="mil-post-text mil-up mil-mb-30">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eius sequi commodi dignissimos optio, beatae, eos necessitatibus nisi. Nam cupiditate consectetur nostrum qui! Repellat natus nulla, nisi aliquid, asperiores impedit tempora sequi est reprehenderit cumque explicabo, dicta. Rem nihil ullam totam ea voluptas quibusdam repudiandae id ut at iure! Totam, a!</p>
                                                <div className="mil-link mil-dark mil-arrow-place mil-up">
                                                    <span>Read more</span>
                                                </div>
                                            </div>
                                        </a>
                                    </div>
                                    <div className="col-lg-6">
                                        <a href="publication.html" className="mil-blog-card mil-mb-60">
                                            <div className="mil-cover-frame mil-up">
                                                <img src="/src/Website/static/img/blog/2.jpg" alt="cover" />
                                            </div>
                                            <div className="mil-post-descr">
                                                <div className="mil-labels mil-up mil-mb-30">
                                                    <div className="mil-label mil-upper mil-accent">TECHNOLOGY</div>
                                                    <div className="mil-label mil-upper">may 24 2023</div>
                                                </div>
                                                <h4 className="mil-up mil-mb-30">16 Best Graphic Design Online and Offline Courses</h4>
                                                <p className="mil-post-text mil-up mil-mb-30">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eius sequi commodi dignissimos optio, beatae, eos necessitatibus nisi. Nam cupiditate consectetur nostrum qui! Repellat natus nulla, nisi aliquid, asperiores impedit tempora sequi est reprehenderit cumque explicabo, dicta. Rem nihil ullam totam ea voluptas quibusdam repudiandae id ut at iure! Totam, a!</p>
                                                <div className="mil-link mil-dark mil-arrow-place mil-up">
                                                    <span>Read more</span>
                                                </div>
                                            </div>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* <footer className="mil-dark-bg">
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
                                                            <li className="mil-up mil-active"><a href="home-1.html">Home</a></li>
                                                            <li className="mil-up"><a href="portfolio-1.html">Portfolio</a></li>
                                                            <li className="mil-up"><Link to="/services">Services</Link></li>
                                                            <li className="mil-up"><Link to="/contact">Contact</Link></li>
                                                            <li className="mil-up"><a href="blog.html">Blog</a></li>
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
                                                        <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-behance"></i></a></li>
                                                        <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-dribbble"></i></a></li>
                                                        <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-twitter"></i></a></li>
                                                        <li><a href="#." target="_blank" rel="noopener noreferrer" className="social-icon"> <i className="fab fa-github"></i></a></li>
                                                    </ul>
                                                </div>
                                                <p className="mil-light-soft mil-up">© Copyright 2023 - Mil. All Rights Reserved.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </footer> */}

                        {/* 
                          FIX: The 'mil-hidden-elements' div is restored here.
                          This div contains the SVG templates for arrows and other animations.
                          The template's JavaScript searches for these elements by className,
                          clones them, and injects them where needed (e.g., inside 'mil-arrow-place' divs).
                          Without this section, the arrows and some animations will not appear.
                        */}
                        <div className="mil-hidden-elements">
                            <div className="mil-dodecahedron">
                                <div className="mil-pentagon">
                                    <div></div><div></div><div></div><div></div><div></div>
                                </div>
                                <div className="mil-pentagon">
                                    <div></div><div></div><div></div><div></div><div></div>
                                </div>
                                <div className="mil-pentagon">
                                    <div></div><div></div><div></div><div></div><div></div>
                                </div>
                                <div className="mil-pentagon">
                                    <div></div><div></div><div></div><div></div><div></div>
                                </div>
                                <div className="mil-pentagon">
                                    <div></div><div></div><div></div><div></div><div></div>
                                </div>
                                <div className="mil-pentagon">
                                    <div></div><div></div><div></div><div></div><div></div>
                                </div>
                                <div className="mil-pentagon">
                                    <div></div><div></div><div></div><div></div><div></div>
                                </div>
                                <div className="mil-pentagon">
                                    <div></div><div></div><div></div><div></div><div></div>
                                </div>
                                <div className="mil-pentagon">
                                    <div></div><div></div><div></div><div></div><div></div>
                                </div>
                                <div className="mil-pentagon">
                                    <div></div><div></div><div></div><div></div><div></div>
                                </div>
                                <div className="mil-pentagon">
                                    <div></div><div></div><div></div><div></div><div></div>
                                </div>
                                <div className="mil-pentagon">
                                    <div></div><div></div><div></div><div></div><div></div>
                                </div>
                            </div>

                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mil-arrow">
                                <path d="M 14 5.3417969 C 13.744125 5.3417969 13.487969 5.4412187 13.292969 5.6367188 L 13.207031 5.7226562 C 12.816031 6.1136563 12.816031 6.7467188 13.207031 7.1367188 L 17.070312 11 L 4 11 C 3.448 11 3 11.448 3 12 C 3 12.552 3.448 13 4 13 L 17.070312 13 L 13.207031 16.863281 C 12.816031 17.254281 12.816031 17.887344 13.207031 18.277344 L 13.292969 18.363281 C 13.683969 18.754281 14.317031 18.754281 14.707031 18.363281 L 20.363281 12.707031 C 20.754281 12.316031 20.754281 11.682969 20.363281 11.292969 L 14.707031 5.6367188 C 14.511531 5.4412187 14.255875 5.3417969 14 5.3417969 z" />
                            </svg>

                            <svg width="250" viewBox="0 0 300 1404" fill="none" xmlns="http://www.w3.org/2000/svg" className="mil-lines">
                                <path fillRule="evenodd" clipRule="evenodd" d="M1 892L1 941H299V892C299 809.71 232.29 743 150 743C67.7096 743 1 809.71 1 892ZM0 942H300V892C300 809.157 232.843 742 150 742C67.1573 742 0 809.157 0 892L0 942Z" className="mil-move" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M299 146V97L1 97V146C1 228.29 67.7096 295 150 295C232.29 295 299 228.29 299 146ZM300 96L0 96V146C0 228.843 67.1573 296 150 296C232.843 296 300 228.843 300 146V96Z" className="mil-move" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M299 1H1V1403H299V1ZM0 0V1404H300V0H0Z" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M150 -4.37115e-08L150 1404L149 1404L149 0L150 -4.37115e-08Z" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M150 1324C232.29 1324 299 1257.29 299 1175C299 1092.71 232.29 1026 150 1026C67.7096 1026 1 1092.71 1 1175C1 1257.29 67.7096 1324 150 1324ZM150 1325C232.843 1325 300 1257.84 300 1175C300 1092.16 232.843 1025 150 1025C67.1573 1025 0 1092.16 0 1175C0 1257.84 67.1573 1325 150 1325Z" className="mil-move" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M300 1175H0V1174H300V1175Z" className="mil-move" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M150 678C232.29 678 299 611.29 299 529C299 446.71 232.29 380 150 380C67.7096 380 1 446.71 1 529C1 611.29 67.7096 678 150 678ZM150 679C232.843 679 300 611.843 300 529C300 446.157 232.843 379 150 379C67.1573 379 0 446.157 0 529C0 611.843 67.1573 679 150 679Z" className="mil-move" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M299 380H1V678H299V380ZM0 379V679H300V379H0Z" className="mil-move" />
                            </svg>
                        </div>

                    </div>
                </div>
            </div>
        </HomeLayout>
    );
};

export default Home;
