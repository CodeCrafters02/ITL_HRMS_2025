import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BaseLayout from './BaseLayout.js';
import { getProductList ,ProductData} from "./api.js";

function formatDate(dateString: string): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: '2-digit', year: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options); // e.g. "Aug 01, 2025"
}


export default function ProductsPage() {
  // For styles, you can load them in your main index.html or dynamically like below:

  const [stylesLoaded, setStylesLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
;

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



    const [products, setProducts] = useState<
    {
      id: number;
      category: string;
      date: string;
      title: string;
      description?: string;
      img?: string;
      link: string;
    }[]
  >([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProductList()
      .then((data: ProductData[]) => {
        const mapped = data.map(p => ({
          id: p.id,
          category: p.service_details?.name ?? "Uncategorized", 
          date: formatDate(p.updated_at),
          title: p.name,
          description: p.description ?? "",
          img: p.image ?? "/default-image.jpg",
          link: `/product/${p.id}`,
        }));
        setProducts(mapped);
      })
      .catch((err) => {
        console.error("Failed to fetch products:", err);
      })
      .finally(() => setLoading(false));
  }, []);
    const productsPerPage = 5;
    const totalPages = Math.ceil(products.length / productsPerPage);

  // Slice products for current page
  const displayedProducts = products.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  // Pagination click handler
  const handlePageClick = (page: number) => {
    setCurrentPage(page);
    // Scroll to products section on page change (optional)
    const element = document.getElementById("products");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }

  if (loading) {
    return <div>Loading products...</div>;
  }
    if (!stylesLoaded) {
    // Show blank or loader until styles are loaded
    return <div style={{ background: "#000000ff", height: "100vh" }}></div>;
  }
  return (
    <BaseLayout 
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
    <div className="mil-wrapper" id="top">
      {/* Banner */}
      <section className="mil-inner-banner mil-p-0-120">
        <div className="mil-banner-content mil-up">
          <div className="mil-animation-frame">
            <div
              className="mil-animation mil-position-4 mil-dark mil-scale"
              data-value-1="6"
              data-value-2="1.4"
            ></div>
          </div>
          <div className="container">
            <ul className="mil-breadcrumbs mil-mb-60">
              <li>
                <Link to="/">Homepage</Link>
              </li>
              <li>Products</li>
            </ul>
            <h1 className="mil-mb-60">
              Explore <span className="mil-thin">Our</span> <br />
              <span className="mil-thin">Exclusive</span> Products
            </h1>
            <a href="#products" className="mil-link mil-dark mil-arrow-place mil-down-arrow">
              <span>Shop Now</span>
            </a>
          </div>
        </div>
      </section>


      {/* Categories */}
<section id="products">
          <div className="container mil-p-120-120">
            <div className="row">
              {displayedProducts.map((product) => (
                <div key={product.id} className="col-lg-12">
                  <Link to={product.link} className="mil-blog-card mil-blog-card-hori mil-more mil-mb-60">
                    <div className="mil-cover-frame mil-up">
                      <img src={product.img} alt={product.title} />
                    </div>
                    <div className="mil-post-descr">
                      <div className="mil-labels mil-up mil-mb-30">
                        <div className="mil-label mil-upper mil-accent">{product.category.toUpperCase()}</div>
                        <div className="mil-label mil-upper">{product.date}</div>
                      </div>
                      <h4 className="mil-up mil-mb-30">{product.title}</h4>
                      <p className="mil-post-text mil-up mil-mb-30">{product.description}</p>
                      <div className="mil-link mil-dark mil-arrow-place mil-up">
                        <span>See details</span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}

              {/* Pagination */}
              <div className="col-lg-12">
                <div className="mil-pagination">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageClick(page)}
                      className={`mil-pagination-btn ${page === currentPage ? "mil-active" : ""}`}
                      style={{ cursor: "pointer", margin: "0 5px" }}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* Call to Action */}
      <section className="mil-soft-bg">
        <div className="container mil-p-120-120">
          <div className="row">
            <div className="col-lg-10">
              <span className="mil-suptitle mil-suptitle-right mil-suptitle-dark mil-up">
                Ready to upgrade? Discover products that fit your lifestyle perfectly.
              </span>
            </div>
          </div>
          <div className="mil-center">
            <h2 className="mil-up mil-mb-60">
              Stay informed <span className="mil-thin">with our</span> <br />
              latest offers by <span className="mil-thin">subscribing</span> <br />
              to our <span className="mil-thin">newsletter!</span>
            </h2>
            <div className="row justify-content-center mil-up">
              <div className="col-lg-4">
                <form className="mil-subscribe-form mil-subscribe-form-2 mil-up">
                  <input type="email" placeholder="Enter your email" />
                  <button type="submit" className="mil-button mil-icon-button-sm mil-arrow-place"></button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mil-dark-bg">
        <div className="mi-invert-fix">
          <div className="container mil-p-120-60">
            <div className="row justify-content-between">
              <div className="col-md-4 col-lg-4 mil-mb-60">
                <div className="mil-muted mil-logo mil-up mil-mb-30">Ashley.</div>
                <p className="mil-light-soft mil-up mil-mb-30">Subscribe to our newsletter:</p>
                <form className="mil-subscribe-form mil-up">
                  <input type="email" placeholder="Enter your email" />
                  <button type="submit" className="mil-button mil-icon-button-sm mil-arrow-place"></button>
                </form>
              </div>
              <div className="col-md-7 col-lg-6">
                <div className="row justify-content-end">
                  <div className="col-md-6 col-lg-7">
                    <nav className="mil-footer-menu mil-mb-60">
                      <ul>
                        <li className="mil-up mil-active">
                          <Link to="/">Home</Link>
                        </li>
                        <li className="mil-up">
                          <Link to="/portfolio">Portfolio</Link>
                        </li>
                        <li className="mil-up">
                          <Link to="/services">Services</Link>
                        </li>
                        <li className="mil-up">
                          <Link to="/contact">Contact</Link>
                        </li>
                        <li className="mil-up">
                          <Link to="/products">Products</Link>
                        </li>
                      </ul>
                    </nav>
                  </div>
                  <div className="col-md-6 col-lg-5">
                    <ul className="mil-menu-list mil-up mil-mb-60">
                      <li>
                        <a href="#." className="mil-light-soft">
                          Privacy Policy
                        </a>
                      </li>
                      <li>
                        <a href="#." className="mil-light-soft">
                          Terms and conditions
                        </a>
                      </li>
                      <li>
                        <a href="#." className="mil-light-soft">
                          Cookie Policy
                        </a>
                      </li>
                      <li>
                        <a href="#." className="mil-light-soft">
                          Careers
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="row justify-content-between flex-sm-row-reverse">
              <div className="col-md-7 col-lg-6">
                <div className="row justify-content-between">
                  <div className="col-md-6 col-lg-5 mil-mb-60">
                    <h6 className="mil-muted mil-up mil-mb-30">Canada</h6>
                    <p className="mil-light-soft mil-up">
                      71 South Los Carneros Road, California{" "}
                      <span className="mil-no-wrap">+51 174 705 812</span>
                    </p>
                  </div>
                  <div className="col-md-6 col-lg-5 mil-mb-60">
                    <h6 className="mil-muted mil-up mil-mb-30">Germany</h6>
                    <p className="mil-light-soft mil-up">
                      Leehove 40, 2678 MC De Lier, Netherlands{" "}
                      <span className="mil-no-wrap">+31 174 705 811</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 col-lg-6 mil-mb-60">
                <div className="mil-vert-between">
                  <div className="mil-mb-30">
                    <ul className="mil-social-icons mil-up">
                      <li>
                        <a href="#." target="_blank" rel="noreferrer" className="social-icon">
                          <i className="fab fa-behance"></i>
                        </a>
                      </li>
                      <li>
                        <a href="#." target="_blank" rel="noreferrer" className="social-icon">
                          <i className="fab fa-dribbble"></i>
                        </a>
                      </li>
                      <li>
                        <a href="#." target="_blank" rel="noreferrer" className="social-icon">
                          <i className="fab fa-twitter"></i>
                        </a>
                      </li>
                      <li>
                        <a href="#." target="_blank" rel="noreferrer" className="social-icon">
                          <i className="fab fa-github"></i>
                        </a>
                      </li>
                    </ul>
                  </div>
                  <p className="mil-light-soft mil-up">© Copyright 2023 - Mil. All Rights Reserved.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </BaseLayout>
  );
}
