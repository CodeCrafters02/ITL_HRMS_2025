import React,{useEffect,useState} from 'react';
import { Link } from 'react-router-dom';
import BaseLayout from './BaseLayout.js';
import img1 from "../static/img/faces/1.jpg";

const Services = () => {
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

  const services = [
    {
      title: "Branding and Identity Design",
      description: "We create compelling brand identities that resonate with your target audience and differentiate you from competitors.",
      icon: "🎨"
    },
    {
      title: "Website Design and Development",
      description: "Modern, responsive websites that provide exceptional user experiences and drive conversions.",
      icon: "💻"
    },
    {
      title: "Advertising and Marketing Campaigns",
      description: "Strategic marketing campaigns that increase brand awareness and drive measurable results.",
      icon: "📢"
    },
    {
      title: "Creative Consulting and Development",
      description: "Expert guidance to help you make informed decisions about your creative strategy and implementation.",
      icon: "💡"
    },
    {
      title: "UI/UX Design",
      description: "User-centered design solutions that create intuitive and engaging digital experiences.",
      icon: "🎯"
    },
    {
      title: "Digital Strategy",
      description: "Comprehensive digital strategies that align with your business goals and drive growth.",
      icon: "📈"
    }
  ];

  // Breadcrumb data
  const breadcrumbItems = [
    { text: "Homepage", link: "/" },
    { text: "Services" }
  ];

  return (
    <BaseLayout 
      pageTitle="Our Services" 
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
      {/* Services Grid */}
      <section>
        <div className="container mil-p-120-60">
          <div className="row">
            <div className="col-lg-6">
              <div className="mil-mb-90">
                <h2 className="mil-up mil-mb-60">What We <span className="mil-thin">Offer</span></h2>
                <p className="mil-up mil-mb-30">We provide comprehensive creative solutions to help your business stand out and thrive in today's competitive market.</p>
              </div>
            </div>
          </div>
          <div className="row">
            {services.map((service, index) => (
              <div key={index} className="col-lg-6">
                <div className="mil-service-card mil-up mil-mb-60">
                  <div className="mil-service-icon mil-mb-30">
                    <span className="mil-service-emoji">{service.icon}</span>
                  </div>
                  <h4 className="mil-mb-30">{service.title}</h4>
                  <p className="mil-mb-30">{service.description}</p>
                  <Link to="/service" className="mil-button mil-arrow-place">
                    <span>Learn more</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section>
        <div className="container mil-p-120-60">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="mil-mb-60">
                <h3 className="mil-up mil-mb-30">Ready to Start Your <span className="mil-thin">Project?</span></h3>
                <p className="mil-up mil-mb-30">Let's discuss how we can help bring your vision to life with our creative expertise.</p>
                <div className="mil-up">
                  <Link to="/contact" className="mil-button mil-arrow-place">
                    <span>Get in touch</span>
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="mil-illustration mil-up">
                <div className="mil-image-frame">
                  <img src={img1} alt="Creative Team" className="mil-scale" data-value-1="1" data-value-2="1.2"/>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section>
        <div className="container mil-p-120-60">
          <div className="row">
            <div className="col-lg-6">
              <div className="mil-mb-60">
                <h3 className="mil-up mil-mb-30">Our <span className="mil-thin">Process</span></h3>
                <p className="mil-up">We follow a structured approach to ensure every project delivers exceptional results.</p>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-3">
              <div className="mil-process-card mil-up mil-mb-60">
                <div className="mil-process-number mil-mb-30">01</div>
                <h5 className="mil-mb-30">Discovery</h5>
                <p>We start by understanding your goals, target audience, and project requirements.</p>
              </div>
            </div>
            <div className="col-lg-3">
              <div className="mil-process-card mil-up mil-mb-60">
                <div className="mil-process-number mil-mb-30">02</div>
                <h5 className="mil-mb-30">Strategy</h5>
                <p>We develop a comprehensive strategy tailored to your specific needs and objectives.</p>
              </div>
            </div>
            <div className="col-lg-3">
              <div className="mil-process-card mil-up mil-mb-60">
                <div className="mil-process-number mil-mb-30">03</div>
                <h5 className="mil-mb-30">Design</h5>
                <p>Our creative team brings your vision to life with innovative design solutions.</p>
              </div>
            </div>
            <div className="col-lg-3">
              <div className="mil-process-card mil-up mil-mb-60">
                <div className="mil-process-number mil-mb-30">04</div>
                <h5 className="mil-mb-30">Launch</h5>
                <p>We ensure a smooth launch and provide ongoing support for continued success.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
};

export default Services;
