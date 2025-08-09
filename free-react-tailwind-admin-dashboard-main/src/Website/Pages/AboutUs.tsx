import React,{useEffect,useState} from 'react';
import { Link } from 'react-router-dom';
import BaseLayout from './BaseLayout.js';

const About = () => {
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
    { text: "About Us" }
  ];
  return (
    <BaseLayout pageTitle="About Us" breadcrumbItems={breadcrumbItems}>
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
      
      {/* ===== About Intro Section ===== */}
      <section>
        <div className="container mil-p-120-90">
          <div className="row justify-content-between align-items-center">
            <div className="col-lg-6">
              <div className="mil-mb-60">
                <h2 className="mil-up mil-mb-40">Who <span className="mil-thin">We Are</span></h2>
                <p className="mil-up mil-mb-30">
                  We’re a passionate team of designers, developers, and strategists dedicated to building impactful digital experiences. Our mission is to blend creativity with technology to help brands thrive in a dynamic world.
                </p>
                <p className="mil-up mil-mb-60">
                  Since our founding, we’ve delivered innovative solutions for clients across industries—always with a focus on quality, collaboration, and long-term success.
                </p>
                <div className="mil-up">
                  <Link to="/contact" className="mil-button mil-arrow-place">
                    <span>Get in Touch</span>
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="mil-about-image mil-up">
                <img src="/src/Website/static/img/photo/1.jpg" alt="About us" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Mission Section ===== */}
      <section className="mil-dark-bg">
        <div className="mi-invert-fix">
          <div className="container mil-p-120-90">
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <h2 className="mil-muted mil-center mil-up mil-mb-60">Our <span className="mil-thin">Mission</span></h2>
                <p className="mil-light-soft mil-center mil-up mil-mb-60">
                  Our mission is simple: to craft meaningful, user-first solutions that leave a lasting impact. We strive to elevate brands with thoughtful design, powerful technology, and seamless user experiences.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Call to Action Section ===== */}
      <section>
        <div className="container mil-p-120-90">
          <div className="row justify-content-between align-items-center">
            <div className="col-lg-7">
              <h2 className="mil-up mil-mb-30">Let’s <span className="mil-thin">Create Something Great</span> Together</h2>
              <p className="mil-up mil-mb-40">
                Ready to bring your next idea to life? We’re here to help you every step of the way. Connect with our team and let’s get started.
              </p>
              <div className="mil-up">
                <Link to="/contact" className="mil-button mil-arrow-place">
                  <span>Start a Project</span>
                </Link>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="mil-up">
                <img src="/static/img/photo/3.jpg" alt="Work with us" />
              </div>
            </div>
          </div>
        </div>
      </section>

    </BaseLayout>
  );
};

export default About;
