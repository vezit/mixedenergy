// components/BannerSteps.js

const BannerSteps = ({ currentStep }) => {
    const steps = [
      { number: 1, label: "Kundeoplysninger" },
      { number: 2, label: "Fragt og levering" },
      { number: 3, label: "Godkend din ordre" },
    ];
  
    return (
      <div className="flex justify-center space-x-8 bg-gray-800 text-white py-4 rounded-lg shadow-lg">
        {steps.map((step) => (
          <div key={step.number} className="flex items-center space-x-2">
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full border-2 ${
                currentStep === step.number
                  ? "bg-blue-600 border-blue-600"
                  : "bg-gray-500 border-gray-500"
              }`}
            >
              <span className="text-white">{step.number}</span>
            </div>
            <div
              className={`text-lg ${
                currentStep === step.number ? "font-bold" : ""
              }`}
            >
              {step.label}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  export default BannerSteps;
  