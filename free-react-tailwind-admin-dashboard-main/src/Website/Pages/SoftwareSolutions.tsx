import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BaseLayout from './BaseLayout.js';
import { getSubServiceList, SubServiceData } from './api'; // Adjust import path accordingly

const SoftwareSolutions = () => {
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const [subServices, setSubServices] = useState<SubServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          setStylesLoaded(true);
        }
      };

      document.head.appendChild(link);
      return link;
    });

    return () => {
      links.forEach((link) => document.head.removeChild(link));
    };
  }, []);

  // Fetch subservices on mount
  useEffect(() => {
    const fetchSubServices = async () => {
      setLoading(true);
      try {
        const allSubServices = await getSubServiceList();
        // Filter subservices where the related service's name is exactly "Software Solution"
        const filtered = allSubServices.filter(
          (sub) => sub.service_details?.name === "Software Solution"
        );
        setSubServices(filtered);
      } catch {
        setError("Failed to load software solutions.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubServices();
  }, []);

  if (!stylesLoaded) {
    return <div style={{ background: "#000", height: "100vh" }}></div>;
  }

  const breadcrumbItems = [
    { text: "Homepage", link: "/" },
    { text: "Software Solutions" }
  ];

  return (
    <BaseLayout pageTitle="Our Software Solutions" breadcrumbItems={breadcrumbItems}>
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
      
      {/* Solutions Section */}
      <section>
        <div className="container mil-p-120-90">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <h2 className="mil-center mil-up mil-mb-30">
                Explore Our <span className="mil-thin">Software Solutions</span>
              </h2>
              <p className="mil-center mil-up mil-light-soft mil-mb-60">
                Cutting-edge software services designed to empower your business in the digital era.
              </p>
            </div>
          </div>

          <div className="row">
            {loading ? (
              <div>Loading software solutions...</div>
            ) : error ? (
              <div className="text-danger">{error}</div>
            ) : subServices.length === 0 ? (
              <div>No software solutions found.</div>
            ) : (
              subServices.map((subService, index) => (
                <div key={subService.id} className="col-md-6 col-lg-4 mb-4">
                  <Link
                    to="#"
                    className="d-block h-100 text-decoration-none"
                    style={{
                      background: '#f8f9fa',
                      padding: '30px',
                      borderRadius: '10px',
                      height: '100%',
                      color: '#222',
                      border: '1px solid #e1e1e1',
                      transition: '0.3s ease-in-out'
                    }}
                  >
                    <h5 style={{ marginBottom: '20px', fontWeight: '600' }}>{subService.name}</h5>
                    <p style={{ marginBottom: '20px', opacity: 1 }}>
                      {subService.description || "No description available."}
                    </p>
                    <div
                      className="mil-button mil-icon-button-sm mil-arrow-place"
                      style={{
                        transform: 'scale(1)',
                        filter: 'grayscale(0)',
                        opacity: 1
                      }}
                    />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mil-dark-bg">
        <div className="mi-invert-fix">
          <div className="container mil-p-120-90">
            <div className="row justify-content-between align-items-center">
              <div className="col-lg-7">
                <h2 className="mil-muted mil-up mil-mb-30">Have a Unique Software Requirement?</h2>
                <p className="mil-light-soft mil-up mil-mb-40">
                  From idea to deployment, we can build custom solutions that meet your exact needs. Let’s turn your vision into reality.
                </p>
                <div className="mil-up">
                  <Link to="/contact" className="mil-button mil-arrow-place">
                    <span>Get a Free Consultation</span>
                  </Link>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="mil-up">
                  <img src="/src/Website/static/img/photo/software.jpg" alt="Software Solutions" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </BaseLayout>
  );
};

export default SoftwareSolutions;
