// components/Footer.tsx
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer
      className="p-4 text-center mt-auto"
      style={{ backgroundColor: '#fab93d', color: '#212121' }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-center text-sm space-y-4 sm:space-y-0">
        <div className="space-y-2">
          {/* left */}
          <p>
            <a
              href="/handelsbetingelser"
              className="font-bold rounded-full px-3 py-1 hover:bg-gray-300 transition"
              style={{ color: '#212121' }}
            >
              Handelsbetingelser
            </a>
          </p>
          <p>
            <a
              href="/fortrolighedspolitik"
              className="font-bold rounded-full px-3 py-1 hover:bg-gray-300 transition"
              style={{ color: '#212121' }}
            >
              Fortrolighedspolitik
            </a>
          </p>
          <p>
            <a
              href="/drinks"
              className="font-bold rounded-full px-3 py-1 hover:bg-gray-300 transition"
              style={{ color: '#212121' }}
            >
              Drikkevarer
            </a>
          </p>
          <p>
            <a
              href="/cookiepolitik"
              className="font-bold rounded-full px-3 py-1 hover:bg-gray-300 transition"
              style={{ color: '#212121' }}
            >
              Cookiepolitik
            </a>
          </p>
        </div>
        <div className="space-y-2 text-center" style={{ color: '#212121' }}>
          {/* center */}
          <p>Mixed Energy</p>
          <p>Bagsværd Hovedgade 141, 2880 Bagsværd</p>
          <p>CVR: 44992302</p>
          <p>info@mixedenergy.dk</p>
        </div>
        <div className="flex space-x-2">
          {/* right - payment icons */}
          <img
            src="/payment-icons/apple-pay-svgrepo-com.svg"
            alt="ApplePay"
            className="h-6"
          />
          <img
            src="/payment-icons/google-pay-or-tez-logo-svgrepo-com.svg"
            alt="GooglePay"
            className="h-6"
          />
          <img
            src="/payment-icons/klarna-svgrepo-com.svg"
            alt="Klarna"
            className="h-6"
          />
          <img
            src="/payment-icons/1156750_finance_mastercard_payment_icon.svg"
            alt="MasterCard"
            className="h-6"
          />
          <img
            src="/payment-icons/2593666_visa_icon.svg"
            alt="Visa"
            className="h-6"
          />
          <img
            src="/payment-icons/2593672_electron_visa_icon.svg"
            alt="Visa Electron"
            className="h-6"
          />
          <img
            src="/payment-icons/2593690_dankort_icon.svg"
            alt="Dankort"
            className="h-6"
          />
          <img
            src="/payment-icons/MP_RGB_NoTM_Logo_plus_Type_Horisontal_Blue.svg"
            alt="MobilePay"
            className="h-6"
          />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
