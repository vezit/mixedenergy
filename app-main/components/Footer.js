const Footer = () => {
    return (
        <footer className="p-4 bg-gray-200 text-center text-gray-600 mt-auto">
            <div className="flex justify-between items-center text-sm">
                <div>
                    {/* left */}
                    <p><a href="/handelsbetingelser">Handelsbetingelser</a></p>
                    <p><a href="/fortrolighedspolitik">Fortrolighedspolitik</a></p>
                    <p><a href="/cookiepolitik">Cookiepolitik</a></p>
                </div>
                <div>
                    {/* center */}
                    <p>MixedEnergy</p>
                    <p>Bagværds Hovedgade 141, 2800 Bagsværd</p>
                    <p>CVR: 40493032</p>
                    <p>kontakt@mixedenergy.dk</p>
                </div>
                <div className="flex space-x-2">
                    {/* right - payment icons */}
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
