import React ,{useEffect,useState}from 'react';
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
  const navigate = useNavigate();

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

  const teamMembers = [
    {
      name: "Emma Newman",
      position: "Founder & Creative Director",
      image: img1,
      bio: "Emma leads our creative vision with over 10 years of experience in design and branding. She's passionate about creating meaningful connections through design.",
      social: {
        behance: "#",
        dribbble: "#",
        twitter: "#",
        github: "#"
      }
    },
    {
      name: "Anna Oldman",
      position: "Art Director",
      image: img2,
      bio: "Anna brings artistic excellence to every project, ensuring our designs are both beautiful and strategically sound.",
      social: {
        behance: "#",
        dribbble: "#",
        twitter: "#",
        github: "#"
      }
    },
    {
      name: "Oscar Freeman",
      position: "Frontend Developer",
      image: img3,
      bio: "Oscar transforms our designs into functional, responsive websites that provide exceptional user experiences.",
      social: {
        behance: "#",
        dribbble: "#",
        twitter: "#",
        github: "#"
      }
    },
    {
      name: "Lisa Trueman",
      position: "UI/UX Designer",
      image: img4,
      bio: "Lisa creates intuitive user experiences that delight users and drive business results.",
      social: {
        behance: "#",
        dribbble: "#",
        twitter: "#",
        github: "#"
      }
    },
    {
      name: "Michael Chen",
      position: "Backend Developer",
      image: img5,
      bio: "Michael builds robust backend systems that power our digital solutions and ensure scalability.",
      social: {
        behance: "#",
        dribbble: "#",
        twitter: "#",
        github: "#"
      }
    },
    {
      name: "Sarah Johnson",
      position: "Project Manager",
      image: img6,
      bio: "Sarah ensures every project runs smoothly, on time, and exceeds client expectations.",
      social: {
        behance: "#",
        dribbble: "#",
        twitter: "#",
        github: "#"
      }
    }
  ];

  // Breadcrumb data
  const breadcrumbItems = [
    { text: "Homepage", link: "/" },
    { text: "Team" }
  ];

  return (
    
    <BaseLayout 
      pageTitle="Meet Our Team" 
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
      {/* Team Members */}
      <section>
        <div className="container mil-p-120-90">
          <div className="row">
            {teamMembers.map((member, index) => (
                  <div key={index} className="col-lg-6 col-xl-4">
                    <div className="mil-team-card mil-up mil-mb-60">
                      <div className="mil-cover-frame">
                        <img src={member.image} alt={member.name} />
                      </div>
                      <div className="mil-description">
                        <div className="mil-secrc-text">
                          <h5 className="mil-muted mil-mb-5">
                            <Link to="/team">{member.name}</Link>
                          </h5>
                          <p className="mil-link mil-light-soft mil-mb-10">{member.position}</p>
                          <p className="mil-mb-20">{member.bio}</p>
                          <ul className="mil-social-icons mil-center">
                            <li><a href={member.social.behance} target="_blank" className="social-icon"> <i className="fab fa-behance"></i></a></li>
                            <li><a href={member.social.dribbble} target="_blank" className="social-icon"> <i className="fab fa-dribbble"></i></a></li>
                            <li><a href={member.social.twitter} target="_blank" className="social-icon"> <i className="fab fa-twitter"></i></a></li>
                            <li><a href={member.social.github} target="_blank" className="social-icon"> <i className="fab fa-github"></i></a></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===== Company Values (FIXED) ===== */}
          <section className="mil-dark-bg">
            <div className="mi-invert-fix">
              <div className="container mil-p-120-90">
                <div className="row justify-content-center">
                  <div className="col-lg-8">
                    {/* FIXED: Added light text classes for visibility */}
                    <h2 className="mil-muted mil-center mil-up mil-mb-60">Our <span className="mil-thin">Values</span></h2>
                    <p className="mil-light-soft mil-center mil-up mil-mb-90">The principles that guide everything we do</p>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 col-lg-3">
                    <div className="mil-value-card mil-up mil-mb-60">
                      <div className="mil-value-icon mil-mb-30">
                        {/* FIXED: Added light color class to icon */}
                        <i className="fas fa-lightbulb mil-muted"></i>
                      </div>
                      {/* FIXED: Added light color classes to text */}
                      <h5 className="mil-muted mil-mb-30">Innovation</h5>
                      <p className="mil-light-soft">We constantly push boundaries and explore new creative possibilities to deliver cutting-edge solutions.</p>
                    </div>
                  </div>
                  <div className="col-md-6 col-lg-3">
                    <div className="mil-value-card mil-up mil-mb-60">
                      <div className="mil-value-icon mil-mb-30">
                        <i className="fas fa-users mil-muted"></i>
                      </div>
                      <h5 className="mil-muted mil-mb-30">Collaboration</h5>
                      <p className="mil-light-soft">We believe in the power of teamwork and foster an environment where diverse perspectives thrive.</p>
                    </div>
                  </div>
                  <div className="col-md-6 col-lg-3">
                    <div className="mil-value-card mil-up mil-mb-60">
                      <div className="mil-value-icon mil-mb-30">
                        <i className="fas fa-star mil-muted"></i>
                      </div>
                      <h5 className="mil-muted mil-mb-30">Excellence</h5>
                      <p className="mil-light-soft">We maintain the highest standards in everything we do, from concept to final delivery.</p>
                    </div>
                  </div>
                  <div className="col-md-6 col-lg-3">
                    <div className="mil-value-card mil-up mil-mb-60">
                      <div className="mil-value-icon mil-mb-30">
                        <i className="fas fa-heart mil-muted"></i>
                      </div>
                      <h5 className="mil-muted mil-mb-30">Passion</h5>
                      <p className="mil-light-soft">We're driven by our love for design and our commitment to creating meaningful experiences.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* ===== End of Company Values Section ===== */}

          {/* Company Culture */}
          <section>
            <div className="container mil-p-120-90">
              <div className="row justify-content-between align-items-center">
                <div className="col-lg-6">
                  <div className="mil-mb-90">
                    <h2 className="mil-up mil-mb-60">Our <span className="mil-thin">Culture</span></h2>
                    <p className="mil-up mil-mb-30">We foster a creative environment where innovation thrives and every team member feels valued and inspired.</p>
                    <p className="mil-up mil-mb-60">Our culture is built on mutual respect, continuous learning, and a shared passion for creating exceptional work that makes a difference.</p>
                    <div className="mil-up">
                      <Link to="/contact" className="mil-button mil-arrow-place mil-mb-60">
                        <span>Join our team</span>
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="col-lg-5">
                  <div className="mil-culture-image mil-up">
                    <img src="/src/Website/src/static/img/photo/2.jpg" alt="Team culture" />
                  </div>
                </div>
              </div>
            </div>
          </section>
    </BaseLayout>
  );
};

export default Team; 