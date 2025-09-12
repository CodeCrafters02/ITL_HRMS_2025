import React, { useState,useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import BaseLayout from './BaseLayout.js';
import { postContactRequest } from './api';  


interface FormData {
    name: string;
    email: string;
    message: string;
    contact:string;
}

const Contact: React.FC = () => {
    // State for the contact form fields
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        message: '',
        contact:''
    });
    // Removed unused isSubmitting state


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
        } catch (error: unknown) {
            let errorMsg = 'Unknown error';
            if (typeof error === 'object' && error !== null && 'message' in error) {
                errorMsg = (error as { message?: string }).message || errorMsg;
            }
            setFormResponse(`<p style="color: red;">Failed to send message: ${errorMsg}</p>`);
        } finally {
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
        { text: "CONTACTS" }
    ];
    return (
        <BaseLayout 
            pageTitle="Get in touch!" 
            breadcrumbItems={breadcrumbItems}
        >          
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
                        src="https://maps.google.com/maps?width=100%25&amp;height=600&amp;hl=en&amp;q=1%20GraftInnovyx%20Tech%20Labs%20LLP.%2035%20K,%2042/5,%20Vittasandra%20Main%20Rd,%20Vittasandra,%20Bengaluru,%20Karnataka%20560100on%20Street,%20Dublin,%20Ireland+(My%20Business%20Name)&amp;t=&amp;z=14&amp;ie=UTF8&amp;iwloc=B&amp;output=embed"
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
                                <p className="mil-up mil-mb-30"style={{ color: "#000" }}>Ready to bring your ideas to life? Let's collaborate and create something extraordinary together.</p>
                                <div className="mil-up">
                                        <Link to="/services" className="mil-custom-button">
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
                                            <label htmlFor="name" style={{ color: "#000" }}>Full Name *</label>
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
                                            <label htmlFor="email" style={{ color: "#000" }} >Email Address *</label>
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
                                            <label htmlFor="name" style={{ color: "#000" }} >Contact *</label>
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
                                    <label htmlFor="message" style={{ color: "#000" }}>Message *</label>
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
                                    <button type="submit" className="mil-custom-button">
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
        </BaseLayout>
    );
}

export default Contact;
