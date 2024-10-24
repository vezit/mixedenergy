import React from 'react';

const BannerSteps = ({ currentStep, onStepChange }) => {
  const steps = [
    { number: 1, label: 'Min Kurv' },
    { number: 2, label: 'Kundeoplysninger' },
    { number: 3, label: 'Fragt og levering' },
    { number: 4, label: 'Godkend din ordre' },
  ];

  return (
    <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-8 bg-gray-800 text-white py-4 rounded-lg shadow-lg">
      {steps.map((step) => (
        <div
          key={step.number}
          className={`flex items-center space-x-2 cursor-pointer ${
            currentStep >= step.number ? '' : 'opacity-50 cursor-not-allowed'
          }`}
          onClick={() => {
            if (currentStep >= step.number) {
              onStepChange(step.number);
            }
          }}
        >
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full border-2 ${
              currentStep === step.number
                ? 'bg-blue-600 border-blue-600'
                : 'bg-gray-500 border-gray-500'
            }`}
          >
            <span className="text-white">{step.number}</span>
          </div>
          <div className={`text-lg ${currentStep === step.number ? 'font-bold' : ''}`}>
            {step.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BannerSteps;
