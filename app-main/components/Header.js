import React from 'react';
import Image from 'next/image';

const Header = () => {
  return (
    <header className="flex justify-between items-center p-4 bg-gray-100 shadow">
      <a href="/" className="flex items-center">
        <Image src="/images/winged-fury-energy.jpg" alt="Logo" width={50} height={50} />
        <h1 className="text-3xl font-bold ml-2">Mixed Energy</h1>
      </a>
      <nav className="flex space-x-4">
        {/* Add navigation links here if needed */}
        
      </nav>
      <div className="flex items-center space-x-4">
        {/* Basket Icon SVG */}
        <div className="relative">
          <a href="/cart">
            <svg
              width="45.76"
              height="46.782"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="806 -35 45.76 46.782"
              style={{ WebkitPrintColorAdjust: "exact" }}
              fill="none"
            >
              <g id="shape-3ed0f0c5-be42-8070-8004-d1fb9e038176" data-testid="image">
                <g fill="none">
                  <g className="fills" id="fills-3ed0f0c5-be42-8070-8004-d1fb9e038176">
                    <rect
                      rx="0"
                      ry="0"
                      x="806"
                      y="-35"
                      width="45.76021798365082"
                      height="46.78220574606121"
                      transform="matrix(1.000000, 0.000000, 0.000000, 1.000000, 0.000000, 0.000000)"
                      className="frame-background"
                    ></rect>
                  </g>
                  <g className="frame-children">
                    <g id="shape-3ed0f0c5-be42-8070-8004-d1fb9e038177" data-testid="image">
                      <defs>
                        <pattern
                          patternUnits="userSpaceOnUse"
                          x="806"
                          y="-35"
                          width="45.76021798365082"
                          height="46.78220574606121"
                          id="fill-0-render-192"
                        >
                          <g>
                            <image
                              id="fill-image-render-192-0"
                              href="data:image/png;base64,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"
                              preserveAspectRatio="xMidYMid slice"
                              width="45.76021798365082"
                              height="46.78220574606121"
                              opacity="1"
                            ></image>
                          </g>
                        </pattern>
                      </defs>
                      <g className="fills" id="fills-3ed0f0c5-be42-8070-8004-d1fb9e038177">
                        <rect
                          rx="0"
                          ry="0"
                          x="806"
                          y="-35"
                          transform="matrix(1.000000, 0.000000, 0.000000, 1.000000, 0.000000, 0.000000)"
                          width="45.76021798365082"
                          height="46.78220574606121"
                          fill="url(#fill-0-render-192)"
                        ></rect>
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
