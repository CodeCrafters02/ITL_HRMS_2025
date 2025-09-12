import { useEffect, useState, useRef } from "react";
import BaseLayout from './BaseLayout';

export default function TermsAndConditions() {
  const [stylesLoaded, setStylesLoaded] = useState<boolean>(false);
  const scriptsLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (scriptsLoadedRef.current) return;

  const scriptUrls: string[] = [
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

    const loadAllScripts = async (): Promise<void> => {
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
      loadedScripts.forEach(script => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      });
      scriptsLoadedRef.current = false;
    };
  }, []);

  useEffect(() => {
  const styles: string[] = [
      "/src/Website/static/css/plugins/bootstrap-grid.css",
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
      "/src/Website/static/css/plugins/swiper.min.css",
      "/src/Website/static/css/plugins/fancybox.min.css",
      "/src/Website/static/css/style.css"
    ];

    let loadedCount = 0;
    const links: HTMLLinkElement[] = styles.map((href: string) => {
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
    { text: "Terms and Conditions" }
  ];

  return (
    <BaseLayout pageTitle="Terms and Conditions" breadcrumbItems={breadcrumbItems}>
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

            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>1. Introduction</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                Welcome to Innovyx Tech Labs LLP ("Website"). These Terms and Conditions ("Terms") govern your use of our Website located at innovyxtechlabs.com and any related services provided by Innovyx Tech Labs LLP.
                By accessing or using our Website, you agree to comply with and be bound by these Terms. If you disagree with any part of the Terms, you must not access or use our Website.
              </p>
            </div>

            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>2. Changes to Terms</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                We reserve the right to modify these Terms at any time. Any changes will be posted on this page, and your continued use of the Website constitutes acceptance of those changes.
              </p>
            </div>

            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>3. Use of the Website</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                You agree to use the Website only for lawful purposes and in a way that does not infringe the rights of, restrict, or inhibit anyone else's use and enjoyment of the Website.
                Prohibited behavior includes harassing or causing distress or inconvenience to any other user, transmitting obscene or offensive content, or disrupting the normal flow of dialogue within our Website.
              </p>
            </div>

            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>4. Intellectual Property</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                The content on our Website, including text, graphics, logos, images, and software, is the property of Innovyx Tech Labs LLP or its content suppliers and is protected by international copyright and trademark laws.
                Unauthorized use of any content may violate copyright, trademark, and other laws.
              </p>
            </div>

            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>5. User-Generated Content</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                You retain ownership of any content you post or submit to the Website ("User Content"). However, by submitting User Content, you grant Innovyx Tech Labs LLP a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, perform, and display such content in any media.
              </p>
            </div>

            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>6. Privacy Policy</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                Your use of our Website is also governed by our Privacy Policy, which can be viewed under the IT Act.
              </p>
            </div>

            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>7. Links to Other Websites</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                Our Website may contain links to third-party websites that are not owned or controlled by Innovyx Tech Labs LLP.
                We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party websites.
                You acknowledge and agree that Innovyx Tech Labs LLP shall not be responsible or liable, directly or indirectly, for any damage or loss caused by or in connection with the use of or reliance on any such content, goods, or services available on or through any such websites.
              </p>
            </div>

            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>8. Disclaimer of Warranties</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                The Website is provided on an "as is" and "as available" basis. Innovyx Tech Labs LLP makes no representations or warranties of any kind, express or implied, as to the operation of the Website or the information, content, materials, or products included on the Website.
                You expressly agree that your use of the Website is at your sole risk.
              </p>
            </div>

            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>9. Limitation of Liability</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                To the fullest extent permitted by law, Innovyx Tech Labs LLP shall not be liable for any damages of any kind arising from the use of the Website, including, but not limited to, direct, indirect, incidental, punitive, and consequential damages.
              </p>
            </div>

            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>10. Indemnification</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                You agree to indemnify, defend, and hold harmless Innovyx Tech Labs LLP, its officers, directors, employees, and agents from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including but not limited to attorney's fees) arising from your use of and access to the Website, or from your violation of these Terms.
              </p>
            </div>

            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>11. No Refund Policy</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                All sales are final. Innovyx Tech Labs LLP does not offer refunds for any products or services purchased through the Website. By making a purchase, you acknowledge and agree to this no refund policy.
              </p>
            </div>

            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>12. Governing Law</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                These Terms shall be governed and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
              </p>
            </div>

            <div className="mil-mb-60">
              <h2 className="mil-up mil-mb-30" style={{ color: "#000" }}>13. Contact Us</h2>
              <p className="mil-up mil-mb-30" style={{ fontWeight: "bold", textAlign: "justify" }}>
                If you have any questions about these Terms, please contact us at:<br />
                Innovyx Tech Labs LLP<br />
                innovyxtechlabs.com<br />
                info@innovyxtechlabs.com
              </p>
            </div>

          </div>
        </div>
      </div>
    </BaseLayout>
  );
}
