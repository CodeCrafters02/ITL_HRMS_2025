
import React,{useEffect,useState,useRef} from 'react';
// ...existing code...
import BaseLayout from './BaseLayout';
import { getSubServiceList, getServiceList,ServiceData ,SubServiceData} from './api'; // Adjust import path accordingly

const PentagonPage: React.FC = () => {

    const scriptsLoadedRef = useRef<boolean>(false);
        const [services, setServices] = useState<ServiceData[]>([]);
      const [subservices, setSubservices] = useState<SubServiceData[]>([]);
      

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
      $('.mil-has-children a').on('click', function(this: HTMLElement, e: MouseEvent) {
        e.preventDefault();
        $('.mil-has-children ul').removeClass('mil-active');
        $('.mil-has-children a').removeClass('mil-active');
        $(this).toggleClass('mil-active');
        $(this).next('ul').toggleClass('mil-active');
      });

            // Back to top functionality
      $('.mil-back-to-top .mil-link').on('click', function(e: MouseEvent) {
        e.preventDefault();
        $('html, body').animate({ scrollTop: 0 }, 800);
      });

            // Smooth scroll for anchor links
      $('a[href^="#"]').on('click', function(this: HTMLElement, e: MouseEvent) {
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
          "/src/Website/static/css/style.css",
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


          useEffect(() => {
          const fetchData = async () => {
            try {
              const [servicesData, subservicesData] = await Promise.all([
                getServiceList(),
                getSubServiceList(),
              ]);
      
              setServices(servicesData.filter(s => s.is_active));
              setSubservices(subservicesData);
            } catch (error) {
              console.error("Error fetching service data:", error);
            }
          };
      
          fetchData();
        }, []);
      // Group subservices by service_details.id
      const subservicesByService = subservices.reduce<Record<number, SubServiceData[]>>(
        (acc, sub) => {
          const serviceId = sub.service_details?.id;
          if (serviceId) {
            if (!acc[serviceId]) {
              acc[serviceId] = [];
            }
            acc[serviceId].push(sub);
          }
          return acc;
        },
        {}
      );
  // ...existing code...
      
        // Helper to generate URL path from service name
  // ...existing code...
      
        if (!stylesLoaded) {
          // Show blank or loader until styles are loaded
          return <div style={{ background: "#000000ff", height: "100vh" }}></div>;
        }
      
    
  return (
    <>
    <BaseLayout>
      {/* Converted HTML to TSX with same class names */}
    <div className="mil-wrapper" id="top">
        <div className="mil-content">
            <div id="swupMain" className="mil-main-transition">

                <div className="mil-dark-bg">
                    <div className="mil-inner-banner">

                        <div className="mi-invert-fix">
                                                          <div className="mil-animation-frame">
                                    <div className="mil-animation mil-position-1 mil-scale" data-value-1="7" data-value-2="1.6"></div>
                                    <div className="mil-animation mil-position-2 mil-scale" data-value-1="4" data-value-2="1"></div>
                                    <div className="mil-animation mil-position-3 mil-scale" data-value-1="1.2" data-value-2=".1"></div>
                                </div>
                            <div className="mil-banner-content mil-up">
                                <div className="container">
                                    <ul className="mil-breadcrumbs mil-light mil-mb-60">
                                        <li><a href="home-1.html">Homepage</a></li>
                                        <li><a href="services.html">Services</a></li>
                                    </ul>
                                    <h1 className="mil-muted mil-mb-60">This is <span className="mil-thin">what</span><br></br> we do <span className="mil-thin">best</span></h1>
                                    <a href="#services" className="mil-custom-button">
                                        <span>Our services</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>


<section id="services">
  <div className="mi-invert-fix">
    <div className="container mil-p-120-60">
      <div className="row">
        {/* RIGHT services display */}
        <div className="col-lg-12">
          <div className="row g-3">
            {services.length === 0 && <p>No services available.</p>}

            {services.map((service) => {
              const allSubs = subservicesByService[service.id] || [];

              return (
                <div
                  key={service.id}
                  className="col-md-6 col-lg-4 mb-4"
                  style={{
                    clear: undefined, // you no longer need to clear here
                  }}
                >
                  <a
                    href={"/" + service.name.toLowerCase().replace(/\s+/g, "")}
                    className="mil-service-card-lg mil-more mil-accent-cursor mil-offset"
                  >
                    <h4 className="mil-muted mil-up mil-mb-30">
                      {service.name}
                    </h4>

                    {service.description && (
                      <p className="mil-descr mil-light-soft mil-up mil-mb-30">
                        {service.description}
                      </p>
                    )}

                    {allSubs.length >= 1 && (
                      <div className="mil-custom-button">
                        <span>Read more</span>
                      </div>
                    )}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>


                </div>

                {/* <div className="mil-hidden-elements">
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
<svg
      width="250"
      viewBox="0 0 300 1404"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mil-lines"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1 892L1 941H299V892C299 809.71 232.29 743 150 743C67.7096 743 1 809.71 1 892ZM0 942H300V892C300 809.157 232.843 742 150 742C67.1573 742 0 809.157 0 892L0 942Z"
        className="mil-move"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M299 146V97L1 97V146C1 228.29 67.7096 295 150 295C232.29 295 299 228.29 299 146ZM300 96L0 96V146C0 228.843 67.1573 296 150 296C232.843 296 300 228.843 300 146V96Z"
        className="mil-move"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M299 1H1V1403H299V1ZM0 0V1404H300V0H0Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M150 -4.37115e-08L150 1404L149 1404L149 0L150 -4.37115e-08Z"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M150 1324C232.29 1324 299 1257.29 299 1175C299 1092.71 232.29 1026 150 1026C67.7096 1026 1 1092.71 1 1175C1 1257.29 67.7096 1324 150 1324ZM150 1325C232.843 1325 300 1257.84 300 1175C300 1092.16 232.843 1025 150 1025C67.1573 1025 0 1092.16 0 1175C0 1257.84 67.1573 1325 150 1325Z"
        className="mil-move"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M300 1175H0V1174H300V1175Z"
        className="mil-move"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M150 678C232.29 678 299 611.29 299 529C299 446.71 232.29 380 150 380C67.7096 380 1 446.71 1 529C1 611.29 67.7096 678 150 678ZM150 679C232.843 679 300 611.843 300 529C300 446.157 232.843 379 150 379C67.1573 379 0 446.157 0 529C0 611.843 67.1573 679 150 679Z"
        className="mil-move"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M299 380H1V678H299V380ZM0 379V679H300V379H0Z"
        className="mil-move"
      />
    </svg>
    </div> */}

  </div>
  </div>
            <section className="mil-light-bg">
          <div className="mi-invert-fix">
            <div className="container mil-p-120-90">
              <div className="row justify-content-center">
                <div className="col-lg-8">
                  <h2 className="mil-muted mil-center mil-up mil-mb-60" style={{ color: "black" }}>
                    Our Services
                  </h2>
                  <p className="mil-dark mil-center mil-up mil-mb-60" style={{ fontWeight: "bold" }}>
                    Innovyx Tech Labs: Excellence in Every Solution, Innovation in Every Service<br />
                    Innovyx Tech Labs provides advanced technology solutions tailored to your needs. Our services include custom app development, design, testing, and ongoing support. We focus on transforming your ideas into innovative and scalable software, ensuring high quality and exceptional client satisfaction. With our expertise, we turn your vision into impactful digital solutions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

    </div>
    </BaseLayout>
    </>
  );
};

export default PentagonPage;
