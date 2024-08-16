const Footer = () => {
    return (
        <footer className="p-4 bg-gray-200 text-center text-gray-600 mt-auto">
            <div className="flex justify-between text-sm">
                <div>
                    {/* left */}
                    <p><a href="/handelsbetingelser">Handelsbetingelser</a></p>
                </div>
                <div>
                    <p>MixedEnergy</p>
                    <p>Bagværds Hovedgade 141, 2800 Bagsværd</p>
                    <p>CVR: 40493032</p>
                    <p>kontakt@mixedenergy.dk</p>
                </div>
                <div>
                    {/* right empty */}
                </div>
            </div>
        </footer>
    );
};

export default Footer;