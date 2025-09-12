import { useEffect, useState, useRef } from "react";
import BaseLayout from './BaseLayout.js';

export default function PrivacyPolicy() {
  const [stylesLoaded, setStylesLoaded] = useState(false);
  const scriptsLoadedRef = useRef(false);

  useEffect(() => {
    if (scriptsLoadedRef.current) return;

    const scriptUrls = [
      '/src/Website/static/js/plugins/jquery.min.js',
      '/src/Website/static/js/plugins/swup.min.js',
      '/src/Website/static/js/plugins/swiper.min.js',
      '/src/Website/static/js/plugins/fancybox.min.js',
      '/src/Website/static/js/plugins/gsap.min.js',
      '/src/Website/static/js/plugins/smooth-scroll.js',
      '/src/Website/static/js/plugins/ScrollTrigger.min.js',
      '/src/Website/static/js/plugins/ScrollTo.min.js'
    ];

  const loadedScripts: HTMLScriptElement[] = [];

    const loadScript = (url: string): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = url;
        script.async = false;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.body.appendChild(script);
        loadedScripts.push(script);
      });
    };

    const loadAllScripts = async () => {
      for (const url of scriptUrls) {
        try {
          await loadScript(url);
        } catch (e) {
          console.warn(e);
        }
      }
      scriptsLoadedRef.current = true;
    };

    loadAllScripts();

    return () => {
      loadedScripts.forEach((script: HTMLScriptElement) => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      });
      scriptsLoadedRef.current = false;
    };
  }, []);

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
        if (loadedCount === styles.length) setStylesLoaded(true);
      };
      document.head.appendChild(link);
      return link;
    });

    return () => {
      links.forEach(link => document.head.removeChild(link));
    };
  }, []);

  if (!stylesLoaded) return <div style={{ background: "#000", height: "100vh" }}></div>;
  const breadcrumbItems = [
    { text: "Homepage", link: "/" },
    { text: "Privacy Policy" }
  ];
  return (
    <BaseLayout pageTitle="Privacy Policy" breadcrumbItems={breadcrumbItems}>
      <div className="container-fluid mil-p-120-90" style={{ color: "#0c0c0cff" }}>
        <div className="row justify-content-center">
                                  <div className="mil-animation-frame">
            <div
              className="mil-animation mil-position-4 mil-dark mil-scale"
              data-value-1="6"
              data-value-2="1.4"
            ></div>
          </div>
          <div className="col-lg-8">
           
            {/* Section 1 */}
            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>1. Introduction</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                Innovyx Tech Labs LLP ("we", "our", "us") is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website innovyxtechlabs.com (the "Website").
                Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the Website.
              </p>
            </div>
            {/* Section 2 */}
            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>2. Information We Collect</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                We may collect personal information that you provide to us directly, such as your name, email address, phone number, and any other information you choose to provide.
                Additionally, we may collect information automatically when you visit our Website, such as your IP address, browser type, operating system, access times, and the pages you have viewed directly before and after accessing the Website.
              </p>
            </div>

            {/* Section 3 */}
            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>3. Use of Your Information</h2>
              <p className="mil-up mil-mb-20" style={{ fontWeight: "bold", textAlign: "justify" }}>We use the information we collect in the following ways:</p>
              <ul style={{ paddingLeft: "1.2rem", color: "#000" , textAlign: "justify"}}>
                <li>To operate and maintain our Website</li>
                <li>To improve your experience on our Website</li>
                <li>To respond to your comments, questions, and provide customer service</li>
                <li>To send you technical notices, updates, security alerts, and support messages</li>
                <li>To communicate with you about products, services, offers, promotions, and events</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>4. Disclosure of Your Information</h2>
              <p className="mil-up mil-mb-20" style={{ fontWeight: "bold", textAlign: "justify" }}>
                We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
              </p>
              <ul style={{ paddingLeft: "1.2rem", color: "#000", textAlign: "justify" }}>
                <li>
                  <strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.
                </li>
                <li>
                  <strong>Business Transfers:</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.
                </li>
                <li>
                  <strong>With Your Consent:</strong> We may disclose your personal information for any other purpose with your consent.
                </li>
              </ul>
            </div>

            {/* Section 5 */}
            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000", textAlign: "justify" }}>5. Security of Your Information</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold" , textAlign: "justify"}}>
                We use administrative, technical, and physical security measures to help protect your personal information.
                While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable,
                and no method of data transmission can be guaranteed against any interception or other type of misuse.
              </p>
            </div>

            {/* Section 6 */}
            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000", textAlign: "justify" }}>6. Policy for Children</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                We do not knowingly solicit information from or market to children under the age of 13.
                If we learn that we have collected personal information from a child under age 13 without verification of parental consent, we will delete that information as quickly as possible.
                If you believe we might have any information from or about a child under 13, please contact us.
              </p>
            </div>

            {/* Section 7 */}
            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>7. Changes to This Privacy Policy</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold" , textAlign: "justify"}}>
                We may update this Privacy Policy from time to time in order to reflect, for example, changes to our practices or for other operational, legal, or regulatory reasons.
                We will notify you of any changes by posting the new Privacy Policy on this page.
                You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </div>

          </div>
        </div>
      </div>
    </BaseLayout>
  );
}
