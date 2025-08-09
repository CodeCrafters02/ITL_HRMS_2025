import React,{useEffect,useState}from 'react';
import { Link } from 'react-router-dom';
import BaseLayout from './BaseLayout.js';

const Service = () => {
  // Breadcrumb data

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

  const breadcrumbItems = [
    { text: "Homepage", link: "/" },
    { text: "Services", link: "/services" },
    { text: "Service Details" }
  ];

  return (
    <BaseLayout 
      pageTitle="Service Details" 
      breadcrumbItems={breadcrumbItems}
    >
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
      {/* Service Hero */}
      <section>
        <div className="container mil-p-120-60">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="mil-mb-60">
                <h2 className="mil-up mil-mb-30">Branding and <span className="mil-thin">Identity Design</span></h2>
                <p className="mil-up mil-mb-30">We create compelling brand identities that resonate with your target audience and differentiate you from competitors. Our comprehensive branding approach ensures consistency across all touchpoints.</p>
                <div className="mil-up">
                  <Link to="/contact" className="mil-button mil-arrow-place">
                    <span>Start Project</span>
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="mil-illustration mil-up">
                <div className="mil-image-frame">
                  <img src="/src/Website/src/static/img/works/1.jpg" alt="Branding Design" className="mil-scale" data-value-1="1" data-value-2="1.2"/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Features */}
      <section>
        <div className="container mil-p-120-60">
          <div className="row">
            <div className="col-lg-6">
              <div className="mil-mb-60">
                <h3 className="mil-up mil-mb-30">What's <span className="mil-thin">Included</span></h3>
                <p className="mil-up">Our branding service includes everything you need to establish a strong brand presence.</p>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-4">
              <div className="mil-feature-card mil-up mil-mb-60">
                <div className="mil-feature-icon mil-mb-30">
                  <span className="mil-feature-emoji">🎨</span>
                </div>
                <h5 className="mil-mb-20">Logo Design</h5>
                <p>Custom logo creation that perfectly represents your brand values and vision.</p>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="mil-feature-card mil-up mil-mb-60">
                <div className="mil-feature-icon mil-mb-30">
                  <span className="mil-feature-emoji">📋</span>
                </div>
                <h5 className="mil-mb-20">Brand Guidelines</h5>
                <p>Comprehensive style guide to ensure consistent brand application across all media.</p>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="mil-feature-card mil-up mil-mb-60">
                <div className="mil-feature-icon mil-mb-30">
                  <span className="mil-feature-emoji">🎯</span>
                </div>
                <h5 className="mil-mb-20">Brand Strategy</h5>
                <p>Strategic positioning and messaging framework for your brand identity.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Gallery */}
      <section>
        <div className="container mil-p-120-60">
          <div className="row">
            <div className="col-lg-12">
              <h3 className="mil-up mil-mb-60 mil-center">Recent <span className="mil-thin">Work</span></h3>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-4">
              <div className="mil-portfolio-card mil-up mil-mb-60">
                <div className="mil-image-frame">
                  <img src="/src/Website/src/static/img/works/1.jpg" alt="Project 1" className="mil-scale" data-value-1="1" data-value-2="1.2"/>
                </div>
                <div className="mil-portfolio-info">
                  <h5>Brand Identity Project</h5>
                  <p>Complete brand redesign for tech startup</p>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="mil-portfolio-card mil-up mil-mb-60">
                <div className="mil-image-frame">
                  <img src="img/works/2.jpg" alt="Project 2" className="mil-scale" data-value-1="1" data-value-2="1.2"/>
                </div>
                <div className="mil-portfolio-info">
                  <h5>Logo Design</h5>
                  <p>Modern logo for creative agency</p>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="mil-portfolio-card mil-up mil-mb-60">
                <div className="mil-image-frame">
                  <img src="img/works/3.jpg" alt="Project 3" className="mil-scale" data-value-1="1" data-value-2="1.2"/>
                </div>
                <div className="mil-portfolio-info">
                  <h5>Brand Guidelines</h5>
                  <p>Comprehensive brand manual</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section>
        <div className="container mil-p-120-60">
          <div className="row">
            <div className="col-lg-6">
              <div className="mil-mb-60">
                <h3 className="mil-up mil-mb-30">Our <span className="mil-thin">Process</span></h3>
                <p className="mil-up">We follow a proven methodology to deliver exceptional branding results.</p>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-6">
              <div className="mil-process-item mil-up mil-mb-60">
                <div className="mil-process-number">01</div>
                <div className="mil-process-content">
                  <h5>Research & Discovery</h5>
                  <p>We dive deep into understanding your brand, audience, and market landscape.</p>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="mil-process-item mil-up mil-mb-60">
                <div className="mil-process-number">02</div>
                <div className="mil-process-content">
                  <h5>Concept Development</h5>
                  <p>Multiple creative concepts are developed and refined based on research insights.</p>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="mil-process-item mil-up mil-mb-60">
                <div className="mil-process-number">03</div>
                <div className="mil-process-content">
                  <h5>Design Execution</h5>
                  <p>Final design elements are crafted with attention to every detail and nuance.</p>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="mil-process-item mil-up mil-mb-60">
                <div className="mil-process-number">04</div>
                <div className="mil-process-content">
                  <h5>Brand Implementation</h5>
                  <p>Complete brand guidelines and assets delivered for seamless implementation.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="container mil-p-120-60">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <div className="mil-mb-60">
                <h3 className="mil-up mil-mb-30">Ready to Transform Your <span className="mil-thin">Brand?</span></h3>
                <p className="mil-up">Let's create a brand identity that sets you apart from the competition and resonates with your audience.</p>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="mil-up">
                <Link to="/contact" className="mil-button mil-arrow-place">
                  <span>Get Started</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
};

export default Service;
