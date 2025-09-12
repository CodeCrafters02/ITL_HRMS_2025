import {useEffect,useState} from 'react';
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
<section className="mile-soft-bg">
              <div className="mil-invert-fix">
    
  {/* <div className="mile-animation-frame">
      <div className="mile-animation mile-position-1 mil-scale" data-value-1="7" data-value-2="1.6"></div>
      <div className="mile-animation mile-position-2 mil-scale" data-value-1="4" data-value-2="1"></div>
      <div className="mile-animation mile-position-3 mil-scale" data-value-1="1.2" data-value-2=".1"></div>
  </div> */}

  <div className="container mil-p-120-90">
    <div className="row justify-content-between align-items-center">
      <div className="col-lg-6">
        <div className="mil-mb-60">
          <h2 className="mil-up mil-mb-40">
            Who <span className="mil-thin">We Are</span>
          </h2>
          <p
            className="mil-up mil-mb-60"
            style={{ color: "#0c0c0cff", fontWeight: "bold", marginTop: 10 }}
          >
            The innovation powerhouse where digital dreams take flight! 
            <br></br>At Innovyx, we're more than just coders; we're architects of innovation, wizards of analytics, and pioneers of digital transformation. From custom software solutions to AI-driven marvels and digital marketing magic, we're here to turn your ideas into game-changing realities.
          </p>

          <div className="mil-up">
            <Link to="/contact" className="mil-custom-button">
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
  </div>
</section>



      {/* ===== Mission Section ===== */}
    <section className="mil-dark-bg">
      <div className="mi-invert-fix">
      <div className="mil-animation-frame">
          <div className="mil-animation mil-position-1 mil-scale" data-value-1="7" data-value-2="1.6"></div>
          <div className="mil-animation mil-position-2 mil-scale" data-value-1="4" data-value-2="1"></div>
          <div className="mil-animation mil-position-3 mil-scale" data-value-1="1.2" data-value-2=".1"></div>
      </div>
        <div className="container mil-p-120-90">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <h2 className="mil-muted mil-center mil-up mil-mb-60">
                Our Mission 
              </h2>
              <p className="mil-light-soft mil-center mil-up mil-mb-60" style={{ fontWeight: "bold" }}>
                At Innovyx Tech Labs, our mission is to craft innovative web applications, mobile apps, and digital services that transform your ideas into game-changing realities. 
                We leverage cutting-edge technology, AI, and machine learning to deliver scalable, user-centric solutions that empower businesses to thrive in a digital-first world.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

      <section>
          <div className="container mil-p-120-30">
              <div className="row justify-content-center align-items-center">
                  <div className="col-lg-7 col-xl-5">
                    <div className="mil-mb-90"  style={{ textAlign: "center" }}>
                      <h3 className="mil-up mil-mb-60">
                        Meet The Professionals <br />Behind Our Success
                      </h3>
                      <p className="mil-up mil-mb-30" style={{ fontWeight: "bold" }}>
                        At Innovyx Tech Labs, our team of skilled professionals drives our success with expertise in cutting-edge technologies. Each member brings a unique blend of experience and innovation, ensuring top-notch solutions and exceptional results for our clients.
                      </p>
                      <p className="mil-up mil-mb-60">
                      </p>
                      <h4 className="mil-up invisible">
                        <span className="mil-thin">Read</span> More
                      </h4>
                    </div>
                  </div>
                  {/* <div className="col-lg-6">
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
                  </div> */}
              </div>
          </div>
      </section>
    </BaseLayout>
  );
};

export default About;
