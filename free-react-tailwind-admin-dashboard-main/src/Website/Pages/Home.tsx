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
    const [activeIndex, setActiveIndex] = useState(0); 
    const [activeFAQ, setActiveFAQ] = useState(null);
    const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [faqExpanded, setFaqExpanded] = useState(false);

  const toggleFAQ = (index) => {
    setActiveFAQ(activeFAQ === index ? null : index);
  };


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
    

const testimonials = [
  {
    text: `This product changed my life! Highly recommend to everyone looking to improve their workflow and productivity. 
           The ease of use and the outstanding customer support made the experience seamless. 
           I have seen tremendous results and will definitely continue using it.`,
    name: "Alice Johnson",
    company: "WonderCorp",
    avatar: "/avatars/alice.jpg"
  },
  {
    text: `Excellent service and support throughout the entire process. 
           The team was knowledgeable, responsive, and truly cared about my needs. 
           Their attention to detail and proactive communication exceeded my expectations, making the entire experience enjoyable.`,
    name: "Bob Smith",
    company: "TechSolutions",
    avatar: "/avatars/bob.jpg"
  },
  {
    text: `Reliable and fast, great experience all around. 
           Every interaction was professional and efficient, helping me meet deadlines without hassle. 
           The quality of the product combined with their quick turnaround makes them my go-to choice.`,
    name: "Carol Lee",
    company: "InnovateX",
    avatar: "/avatars/carol.jpg"
  },
  {
    text: `This creative agency stands out with their exceptional talent and expertise. 
           Their ability to think outside the box and bring unique ideas to life is truly impressive. 
           With meticulous attention to detail, they consistently deliver visually stunning and impactful work.`,
    name: "Sarah Newman",
    company: "ENVATO MARKET",
    avatar: "/avatars/sarah.jpg"
  }
];
const faqs = [
  {
    question: "What types of applications do you develop?",
    answer: "We develop a wide range of custom applications, including web apps, mobile apps (iOS and Android), and enterprise solutions, tailored to meet your specific business requirements."
  },
  {
    question: "How do you ensure the quality of the app?",
    answer: "We follow a rigorous development process that includes detailed planning, regular testing, and quality assurance to ensure the app meets high standards of functionality and performance."
  },
  {
    question: "Can you integrate third-party services into the app?",
    answer: "Yes, we can integrate various third-party services and APIs based on your app’s needs."
  },
  {
    question: "What digital marketing services do you offer?",
    answer: "We offer a range of digital marketing services, including SEO, social media marketing, content marketing, email campaigns, and analytics to enhance your online presence and drive engagement."
  },
  {
    question: "How can Web3 technology benefit my business?",
    answer: "Web3 technology offers benefits such as enhanced security, transparency, and control over data. It also enables the creation of decentralized platforms and applications that can improve efficiency and trust."
  },
  {
    question: "What types of AI and ML solutions do you offer?",
    answer: "We offer AI and ML solutions such as predictive analytics, natural language processing, computer vision, and automation to help you leverage data for better decision-making and operational efficiency."
  },
  {
    question: "How do you handle app updates and maintenance?",
    answer: "We provide ongoing maintenance and updates as part of our service, including bug fixes, performance improvements, and feature enhancements."
  },
  {
    question: "What platforms do you develop mobile apps for?",
    answer: "We develop mobile apps for both iOS and Android platforms, ensuring compatibility and optimal performance across different devices."
  },
];

      if (!stylesLoaded) {
        // Show blank or loader until styles are loaded
        return <div style={{ background: "#000000ff", height: "100vh" }}></div>;
      }

    return (
        <HomeLayout hasPreloaderShown={hasPreloaderShown}>
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
                                  <h1 className="mil-muted mil-mb-60">
                                    Transforming Ideas<br />
                                    <span className="mil-thin">into Revolutionary Apps</span>
                                  </h1>


                                  <div className="row">
                                    <div className="col-md-7 col-lg-5">
                                      <p className="mil-light-soft mil-mb-60">
                                        Innovation in every code, revolution in every app. Innovyx Tech Labs – where ideas become reality.
                                      </p>
                                    </div>
                                  </div>

                                  <Link to="/about" className="mil-button mil-arrow-place mil-btn-space">
                                    <span style={{ paddingRight: "25px" }}>Learn More</span>
                                  </Link>

                                  <Link to="/products" className="mil-link mil-muted mil-arrow-place">
                                    <span>Our Projects</span>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </section>


                        <section id="about">
                          <div className="container mil-p-120-30">
                              <div className="row justify-content-between align-items-center">
                                  <div className="col-lg-6 col-xl-5">
                                      <div className="mil-mb-90">
                                          <h2 className="mil-up mil-mb-60">
                                              About <span className="mil-thin">Innovyx</span>
                                          </h2>
                                          <p className="mil-up mil-mb-30"   style={{ color: "#0c0c0cff", marginTop: 10, marginBottom: 20,fontWeight: "bold" }}>
                                              The innovation powerhouse where digital dreams take flight! At Innovyx, we're more than just coders; we're architects of innovation, wizards of analytics, and pioneers of digital transformation. 
                                              From custom software solutions to AI-driven marvels and digital marketing magic, we're here to turn your ideas into game-changing realities.
                                          </p>
                                          <p className="mil-up mil-mb-60"   style={{ color: "#0c0c0cff", marginTop: 10, marginBottom: 20,fontWeight: "bold" }}>
                                              Let's collaborate and redefine what's possible together. Ready to make waves? Join us on this exhilarating journey — powered by cutting-edge technology solutions, an experienced and skilled team, a comprehensive service offering, and a truly client-centric approach.
                                          </p>
                                      </div>
                                  </div>
                                  <div className="col-lg-5">
                                      <div className="mil-about-photo mil-mb-90">
                                          <div className="mil-lines-place"></div>
                                          <div className="mil-up mil-img-frame" style={{ paddingBottom: '160%' }}>
                                              <img 
                                                  src="/src/Website/static/img/photo/1.jpg" 
                                                  alt="Innovyx Team" 
                                                  className="mil-scale" 
                                                  data-value-1="1" 
                                                  data-value-2="1.2" 
                                                  style={{ maxWidth: "90%", height: "auto" }}
                                              />
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </section>
                      <section className="mil-dark-bg">
                        <div className="mi-invert-fix">
                            <div className="mil-animation-frame">
                                <div 
                                    className="mil-animation mil-position-1 mil-scale" 
                                    data-value-1="2.4" 
                                    data-value-2="1.4" 
                                    style={{ top: '300px', right: '-100px' }}
                                ></div>
                                <div 
                                    className="mil-animation mil-position-2 mil-scale" 
                                    data-value-1="2" 
                                    data-value-2="1" 
                                    style={{ left: '150px' }}
                                ></div>
                            </div>
                            <div className="container mil-p-120-0">
                                <div className="mil-mb-120">
                                    <div className="row">
                                        <div className="col-lg-10">
                                            <span className="mil-suptitle mil-light-soft mil-suptitle-right mil-up">
                                                Driving innovation through technology, creativity, and strategic thinking.
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mil-complex-text justify-content-center mil-up mil-mb-15">
                                        <span className="mil-text-image">
                                            <img src="/src/Website/static/img/photo/2.jpg" alt="team" />
                                        </span>
                                        <h2 className="mil-h1 mil-muted mil-center">
                                            Innovative <span className="mil-thin">Solutions</span>
                                        </h2>
                                    </div>
                                    <div className="mil-complex-text justify-content-center mil-up">
                                        <h2 className="mil-h1 mil-muted mil-center">
                                            For Your <span className="mil-thin">Business</span>
                                        </h2>
                                        <Link to="/services" className="mil-services-button mil-button mil-arrow-place">
                                            <span style={{ paddingRight: "25px" }}>Our Services</span>
                                        </Link>
                                    </div>
                                </div>
                                <div className="row mil-services-grid m-0">
                                    <div className="col-md-6 col-lg-3 mil-services-grid-item p-0">
                                        <Link to="/service" className="mil-service-card-sm mil-up">
                                            <h5 className="mil-muted mil-mb-30">Web Crafting</h5>
                                            <p className="mil-light-soft mil-mb-30">
                                                Innovyx Tech Labs specializes in creating exceptional websites with custom design, responsive layouts, and robust functionality to enhance your brand and engage audiences.
                                            </p>
                                            <div className="mil-button mil-icon-button-sm mil-arrow-place"></div>
                                        </Link>
                                    </div>
                                    <div className="col-md-6 col-lg-3 mil-services-grid-item p-0">
                                        <Link to="/service" className="mil-service-card-sm mil-up">
                                            <h5 className="mil-muted mil-mb-30">Custom App Development</h5>
                                            <p className="mil-light-soft mil-mb-30">
                                                Bespoke app solutions designed for scalability, innovation, and seamless user experiences that meet your unique business needs.
                                            </p>
                                            <div className="mil-button mil-icon-button-sm mil-arrow-place"></div>
                                        </Link>
                                    </div>
                                    <div className="col-md-6 col-lg-3 mil-services-grid-item p-0">
                                        <Link to="/service" className="mil-service-card-sm mil-up">
                                            <h5 className="mil-muted mil-mb-30">Digital Marketing</h5>
                                            <p className="mil-light-soft mil-mb-30">
                                                Comprehensive strategies using SEO, social media, content marketing, and analytics to drive growth and boost your online presence.
                                            </p>
                                            <div className="mil-button mil-icon-button-sm mil-arrow-place"></div>
                                        </Link>
                                    </div>
                                    <div className="col-md-6 col-lg-3 mil-services-grid-item p-0">
                                        <Link to="/service" className="mil-service-card-sm mil-up">
                                            <h5 className="mil-muted mil-mb-30">AI & ML Solutions</h5>
                                            <p className="mil-light-soft mil-mb-30">
                                                Custom algorithms and models to automate processes, analyze data, and deliver actionable, AI-powered insights for smarter decision-making.
                                            </p>
                                            <div className="mil-button mil-icon-button-sm mil-arrow-place"></div>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                      </section>

                      <section className="testimonial-section">
                            <div className="container">
                              <h2 className="testimonial-title">
                                <strong>Customer</strong> Voices: <br />
                                <strong>Hear What</strong> They Say!
                              </h2>

                              {/* Testimonial content */}
                              <div className="testimonial-content">
                                {activeIndex > 0 && (
                                  <button
                                    className="arrow arrow-left"
                                    onClick={() => setActiveIndex(activeIndex - 1)}
                                    aria-label="Previous testimonial"
                                  >
                                    &#8592;
                                  </button>
                                )}

                                <div className="testimonial-text">
                                  <p>{testimonials[activeIndex].text}</p>
                                  <h5>{testimonials[activeIndex].name}</h5>
                                  <small>{testimonials[activeIndex].company}</small>
                                </div>

                                {activeIndex < testimonials.length - 1 && (
                                  <button
                                    className="arrow arrow-right"
                                    onClick={() => setActiveIndex(activeIndex + 1)}
                                    aria-label="Next testimonial"
                                  >
                                    &#8594;
                                  </button>
                                )}
                              </div>
                            </div>
                        </section>

                      <section className="mil-dark-bg">
                        <div className="mi-invert-fix">
                          <div className="mil-animation-frame">
                            <div className="mil-animation mil-position-1 mil-scale" data-value-1="7" data-value-2="1.6"></div>
                            <div className="mil-animation mil-position-2 mil-scale" data-value-1="4" data-value-2="1"></div>
                            <div className="mil-animation mil-position-3 mil-scale" data-value-1="1.2" data-value-2=".1"></div>
                          </div>
                          <div className="container mil-p-120-90">
                            <div className="row justify-content-center">
                              <div className="col-lg-8 text-center">
                                <h2 className="mil-light mil-up mil-mb-30">
                                  Why Partner with Us?
                                </h2>
                                <p
                                  className="mil-light mil-up mil-mb-30"
                                  style={{ fontWeight: "bold", fontSize: "1.2rem", color: "white" }}
                                >
                                  Empowering Your Business with Cutting-Edge AI & Tech Innovations
                                </p>
                                <p
                                  className="mil-light mil-up mil-mb-60"
                                  style={{ fontSize: "1rem", color: "white" }}
                                >
                                  We blend deep industry knowledge with the latest in AI and emerging technologies to create custom solutions that unlock your company’s full potential — driving growth, efficiency, and lasting competitive advantage.
                                </p>

                                <div className="row mil-mb-60">
                                  <div className="col-md-4">
                                    <h4 className="mil-light mil-up">Customer-Centric Innovation</h4>
                                  </div>
                                  <div className="col-md-4">
                                    <h4 className="mil-light mil-up">Agile & Scalable Solutions</h4>
                                  </div>
                                  <div className="col-md-4">
                                    <h4 className="mil-light mil-up">Trusted Industry Experts</h4>
                                  </div>
                                </div>

                                <div>
                                  <h3
                                    className="mil-light mil-up"
                                    style={{ fontSize: "3rem", fontWeight: "bold", color: "white" }}
                                  >
                                    10,000+
                                  </h3>
                                  <p
                                    className="mil-light mil-up"
                                    style={{ fontSize: "1.2rem", marginTop: "-10px", color: "white" }}
                                  >
                                    Satisfied Clients Worldwide
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="faq-section">
                        <h2 className="faq-title">
                          Frequently Asked Questions
                        </h2>

                        <div className="faq-list">
                          {faqs.map((faq, i) => (
                            <div
                              key={i}
                              className="faq-item"
                              onClick={() => toggleFAQ(i)}
                            >
                              <h4 className="faq-question">
                                {faq.question}
                                <span className={`faq-question-icon ${activeFAQ === i ? 'open' : ''}`}>+</span>
                              </h4>
                              {activeFAQ === i && (
                                <p className="faq-answer">{faq.answer}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>

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
