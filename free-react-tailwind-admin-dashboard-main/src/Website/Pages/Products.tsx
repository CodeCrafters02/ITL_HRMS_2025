import { useEffect, useState } from "react";
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
          img: (p.images && p.images.length > 0) ? p.images[0].image : "/default-image.jpg",
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
              <li>PRODUCTS</li>
            </ul>
            <h1 className="mil-mb-60">
              Explore <span className="mil-thin">Our</span> <br />
              <span className="mil-thin">Exclusive</span> Products
            </h1>
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

      {/* Footer */}
    </div>
    </BaseLayout>
  );
}
