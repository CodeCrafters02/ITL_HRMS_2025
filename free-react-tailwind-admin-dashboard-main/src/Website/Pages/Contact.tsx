import React, { useState,useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import BaseLayout from './BaseLayout.js';
import { postContactRequest } from './api';  

interface ContactProps {
    hasPreloaderShown?: boolean;
}

interface FormData {
    name: string;
    email: string;
    message: string;
    contact:string;
}

const Contact: React.FC<ContactProps> = ({ hasPreloaderShown }) => {
    // State for the contact form fields
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        message: '',
        contact:''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);


    // Handle input changes
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const [formResponse, setFormResponse] = useState<string>('');

    // Handle form submission
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormResponse('');
        try {
        await postContactRequest({
            name: formData.name,
            email: formData.email,
            contact_number: formData.contact,  // API expects contact_number key
            message: formData.message,
        });
        setFormResponse('<p style="color: green;">Message sent successfully!</p>');
        setFormData({ name: '', email: '', message: '', contact: '' }); // reset form
        } catch (error: any) {
        setFormResponse(`<p style="color: red;">Failed to send message: ${error.message || 'Unknown error'}</p>`);
        } finally {
        setIsSubmitting(false);
        setTimeout(() => setFormResponse(''), 5000);
        }
    };
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

    // Breadcrumb data
    const breadcrumbItems = [
        { text: "Homepage", link: "/" },
        { text: "Contact" }
    ];


    return (
        <BaseLayout 
            pageTitle="Get in touch!" 
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
            
            {/* Send Message Link */}
            <div className="mil-inner-banner-extra mil-center mil-up">
                <div className="container">
                    <a href="#contact" className="mil-link mil-dark mil-arrow-place mil-down-arrow">
                        <span>Send message</span>
                    </a>
                </div>
            </div>
            {/* Map Section */}
            <div className="mil-map-frame mil-up">
                <div className="mil-map">
                    <iframe 
                        src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d1396.5769090312324!2d-73.6519672!3d45.5673453!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4cc91f8abc30e0ff%3A0xfc6d9cbb49022e9c!2sManoir%20Saint-Joseph!5e0!3m2!1sen!2sua!4v1685485811069!5m2!1sen!2sua" 
                        style={{ border: 0 }} 
                        allowFullScreen 
                        loading="lazy" 
                        referrerPolicy="no-referrer-when-downgrade">
                    </iframe>
                </div>
            </div>

            {/* Contact Form Section */}
            <section id="contact">
                <div className="container mil-p-120-90">
                    <div className="row justify-content-between">
                        <div className="col-lg-4">
                            <div className="mil-mb-90">
                                <h2 className="mil-up mil-mb-60">Let's <br />Start a <span className="mil-thin">Project</span></h2>
                                <p className="mil-up mil-mb-30">Ready to bring your ideas to life? Let's collaborate and create something extraordinary together.</p>
                                <div className="mil-up">
                                    <Link to="/services" className="mil-button mil-arrow-place mil-mb-60">
                                        <span>Our services</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-7">
                            <form onSubmit={handleSubmit} className="mil-contact-form">
                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="mil-up mil-mb-30">
                                            <label htmlFor="name">Full Name *</label>
                                            <input 
                                                type="text" 
                                                id="name" 
                                                name="name" 
                                                value={formData.name}
                                                onChange={handleChange}
                                                required 
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mil-up mil-mb-30">
                                            <label htmlFor="email">Email Address *</label>
                                            <input 
                                                type="email" 
                                                id="email" 
                                                name="email" 
                                                value={formData.email}
                                                onChange={handleChange}
                                                required 
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="row">
                                        <div className="mil-up mil-mb-30">
                                            <label htmlFor="name">Contact *</label>
                                            <input 
                                                type="text" 
                                                id="contact" 
                                                name="contact" 
                                                value={formData.contact}
                                                onChange={handleChange}
                                                required 
                                            />
                                        </div>
                                </div>
                                <div className="mil-up mil-mb-30">
                                    <label htmlFor="message">Message *</label>
                                    <textarea 
                                        id="message" 
                                        name="message" 
                                        rows={6}
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                    ></textarea>
                                </div>
                                <div className="mil-up">
                                    <button type="submit" className="mil-button mil-arrow-place">
                                        <span>Send message</span>
                                    </button>
                                </div>
                                {formResponse && (
                                    <div className="mil-up mil-mt-30" dangerouslySetInnerHTML={{ __html: formResponse }}></div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Information Section */}
            <section className="mil-dark-bg">
                <div className="mi-invert-fix">
                    <div className="container mil-p-120-90">
                        <div className="row justify-content-between">
                            <div className="col-lg-4">
                                <div className="mil-mb-90">
                                    <h2 className="mil-up mil-mb-60">Contact <br />Information</h2>
                                    <p className="mil-up mil-mb-30">Get in touch with us for any questions or inquiries.</p>
                                </div>
                            </div>
                            <div className="col-lg-7">
                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="mil-contact-info mil-up mil-mb-60">
                                            <h6 className="mil-muted mil-mb-30">Canada</h6>
                                            <p className="mil-light-soft">71 South Los Carneros Road, California</p>
                                            <p className="mil-light-soft">+51 174 705 812</p>
                                            <p className="mil-light-soft">hello@ashley.com</p>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mil-contact-info mil-up mil-mb-60">
                                            <h6 className="mil-muted mil-mb-30">Germany</h6>
                                            <p className="mil-light-soft">Leehove 40, 2678 MC De Lier, Netherlands</p>
                                            <p className="mil-light-soft">+31 174 705 811</p>
                                            <p className="mil-light-soft">hello@ashley.com</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </BaseLayout>
    );
}

export default Contact;
