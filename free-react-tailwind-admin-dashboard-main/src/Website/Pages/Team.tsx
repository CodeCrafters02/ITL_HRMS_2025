import React ,{useEffect,useState,useRef}from 'react';
import { Link } from 'react-router-dom';
import BaseLayout from './BaseLayout.js';
import img1 from "../static/img/faces/1.jpg";
import img2 from "../static/img/faces/2.jpg";
import img3 from "../static/img/faces/3.jpg";
import img4 from "../static/img/faces/4.jpg";
import img5 from "../static/img/faces/5.jpg";
import img6 from "../static/img/faces/6.jpg";
import { useNavigate } from 'react-router-dom';

const Team = () => {
  const [stylesLoaded, setStylesLoaded] = useState(false);
      const scriptsLoadedRef = useRef<boolean>(false);
  
  const navigate = useNavigate();
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
    
    <div className="mil-wrapper" id="top">


        <div className="mil-content">
            <div id="swupMain" className="mil-main-transition">

                <div className="mil-inner-banner">
                    <div className="mil-animation-frame">
                        <div className="mil-animation mil-position-4 mil-dark mil-scale" data-value-1="6" data-value-2="1.4"></div>
                    </div>
                    <div className="mil-banner-content mil-up">
                        <div className="container">
                            <ul className="mil-breadcrumbs mil-mb-60">
                                <li><a href="/">Homepage</a></li>
                                <li><a href="/services">Services</a></li>
                                <li><a href="service.html">Service</a></li>
                            </ul>
                            <h1 className="mil-mb-60">Website <span className="mil-thin">Design</span><br></br> and <span className="mil-thin">Development</span></h1>
                            <a href="#service" className="mil-link mil-dark mil-arrow-place mil-down-arrow">
                                <span>About service</span>
                            </a>
                        </div>
                    </div>
                </div>
                <section id="service">
                    <div className="container mil-p-120-90">
                        <div className="row justify-content-between">
                            <div className="col-lg-4 mil-relative mil-mb-90">

                                <h4 className="mil-up mil-mb-30">Your <span className="mil-thin">Approach</span> <br></br>and <span className="mil-thin">Work Specifics</span></h4>
                                <p className="mil-up mil-mb-30">At our agency, we have a unique approach to web design and development. We believe in creating websites that not only look great but also perform well in terms of user experience, functionality, and search engine optimization.</p>
                                <div className="mil-up">
                                    <a href="portfolio-3.html" className="mil-link mil-dark mil-arrow-place">
                                        <span>View works</span>
                                    </a>
                                </div>

                            </div>
                            <div className="col-lg-6">

                                <div className="mil-accordion-group mil-up">
                                    <div className="mil-accordion-menu">

                                        <p className="mil-accordion-head">UX Audits</p>

                                        <div className="mil-symbol mil-h3">
                                            <div className="mil-plus">+</div>
                                            <div className="mil-minus">-</div>
                                        </div>

                                    </div>
                                    <div className="mil-accordion-content">
                                        <p className="mil-mb-30">A UX audit is a service that evaluates the user experience (UX) of a website. It involves analyzing the website's design, functionality, and content to identify areas of improvement that can enhance the user's overall experience.</p>

                                        <p className="mil-mb-30">During a UX audit, a team of UX experts will conduct a thorough review of the website and provide a comprehensive report that outlines specific recommendations for improving the website's usability, accessibility, and overall user experience.</p>

                                        <p className="mil-mb-30">The audit may cover various aspects of the website, such as navigation, layout, visual design, content structure, and mobile responsiveness. The goal is to identify any pain points or obstacles that users may encounter while browsing the website and provide actionable recommendations to improve their experience.</p>

                                        <p className="mil-mb-30">In summary, a UX audit can help website owners identify areas of improvement that can enhance their website's user experience and increase user engagement and satisfaction.</p>
                                    </div>
                                </div>

                                <div className="mil-accordion-group mil-up">
                                    <div className="mil-accordion-menu">

                                        <p className="mil-accordion-head">Design thinking</p>

                                        <div className="mil-symbol mil-h3">
                                            <div className="mil-plus">+</div>
                                            <div className="mil-minus">-</div>
                                        </div>

                                    </div>
                                    <div className="mil-accordion-content">
                                        <p className="mil-mb-30">Design thinking is a problem-solving approach that emphasizes empathy, creativity, and collaboration. It involves understanding the needs and perspectives of users, identifying and defining the problem, generating multiple possible solutions, prototyping and testing those solutions, and iterating based on feedback.</p>
                                        <p className="mil-mb-30">Design thinking encourages a human-centered approach to innovation and is often used in fields such as product design, user experience (UX) design, and business strategy to create user-centric and innovative solutions. It promotes a mindset that embraces experimentation, iteration, and continuous learning throughout the design process.</p>
                                    </div>
                                </div>

                                <div className="mil-accordion-group mil-up">
                                    <div className="mil-accordion-menu">

                                        <p className="mil-accordion-head">wireframing</p>

                                        <div className="mil-symbol mil-h3">
                                            <div className="mil-plus">+</div>
                                            <div className="mil-minus">-</div>
                                        </div>

                                    </div>
                                    <div className="mil-accordion-content">
                                        <p className="mil-mb-30">Wireframing is a vital step in web design where a visual representation of a website's structure is created. It focuses on layout and user experience, using basic shapes and lines to outline elements like headers, menus, and content sections. Wireframes establish the website's architecture and functionality, facilitating communication between designers, developers, and clients. They serve as a blueprint for user-friendly websites, setting the foundation for design and development.</p>
                                    </div>
                                </div>

                                <div className="mil-accordion-group mil-up">
                                    <div className="mil-accordion-menu">

                                        <p className="mil-accordion-head">Aesthetics</p>

                                        <div className="mil-symbol mil-h3">
                                            <div className="mil-plus">+</div>
                                            <div className="mil-minus">-</div>
                                        </div>

                                    </div>
                                    <div className="mil-accordion-content">
                                        <p className="mil-mb-30">Aesthetics in web design focus on the visual appeal of a website, incorporating elements like colors, typography, images, and layout. It aims to create an engaging and visually pleasing user experience that reflects the brand identity and purpose of the website. A well-designed aesthetic balances visual appeal with functionality, leaving a lasting impression on users.</p>
                                    </div>
                                </div>

                                <div className="mil-accordion-group mil-up">
                                    <div className="mil-accordion-menu">

                                        <p className="mil-accordion-head">Methodologies</p>

                                        <div className="mil-symbol mil-h3">
                                            <div className="mil-plus">+</div>
                                            <div className="mil-minus">-</div>
                                        </div>

                                    </div>
                                    <div className="mil-accordion-content">
                                        <p className="mil-mb-30">Libero quam alias tempora facilis necessitatibus quis officiis voluptatem architecto harum exercitationem quidem illum eligendi. Veniam non vitae, nemo dolor tempora, necessitatibus enim sapiente quam voluptas architecto minima omnis sequi aperiam aliquam vel quo reprehenderit, tempore tenetur. Architecto dolorem assumenda voluptas, odio nemo vero illo praesentium pariatur, ut perspiciatis, est itaque minus ratione vitae laboriosam molestiae.</p>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </section>


                <footer className="mil-dark-bg">
                    <div className="mi-invert-fix">
                        <div className="container mil-p-120-60">
                            <div className="row justify-content-between">
                                <div className="col-md-4 col-lg-4 mil-mb-60">

                                    <div className="mil-muted mil-logo mil-up mil-mb-30">Ashley.</div>

                                    <p className="mil-light-soft mil-up mil-mb-30">Subscribe our newsletter:</p>

                                    {/* <form className="mil-subscribe-form mil-up">
                                        <input type="text" placeholder="Enter our email">
                                        <button type="submit" className="mil-button mil-icon-button-sm mil-arrow-place"></button>
                                    </form> */}

                                </div>
                                <div className="col-md-7 col-lg-6">
                                    <div className="row justify-content-end">
                                        <div className="col-md-6 col-lg-7">

                                            <nav className="mil-footer-menu mil-mb-60">
                                                <ul>
                                                    <li className="mil-up mil-active">
                                                        <a href="home-1.html">Home</a>
                                                    </li>
                                                    <li className="mil-up">
                                                        <a href="portfolio-1.html">Portfolio</a>
                                                    </li>
                                                    <li className="mil-up">
                                                        <a href="services.html">Services</a>
                                                    </li>
                                                    <li className="mil-up">
                                                        <a href="contact.html">Contact</a>
                                                    </li>
                                                    <li className="mil-up">
                                                        <a href="blog.html">Blog</a>
                                                    </li>
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
                                        <p className="mil-light-soft mil-up">© Copyright 2023 - Mil. All Rights Reserved.</p>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                </footer>
                <div className="mil-hidden-elements">
                    <div className="mil-dodecahedron">
                        <div className="mil-pentagon">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                        <div className="mil-pentagon">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                        <div className="mil-pentagon">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                        <div className="mil-pentagon">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                        <div className="mil-pentagon">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                        <div className="mil-pentagon">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                        <div className="mil-pentagon">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                        <div className="mil-pentagon">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                        <div className="mil-pentagon">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                        <div className="mil-pentagon">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                        <div className="mil-pentagon">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                        <div className="mil-pentagon">
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
                            <div></div>
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
  );
};

export default Team; 