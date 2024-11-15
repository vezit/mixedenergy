import React from 'react';

const LoadingConfettiButton = React.forwardRef(
  ({ onClick, loading, disabled, className, children }, ref) => {
    return (
      <button
        ref={ref}
        onClick={onClick}
        disabled={loading || disabled}
        className={`relative flex items-center justify-center ${className} ${
          loading || disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {loading && (
          <svg
            className="animate-spin h-5 w-5 mr-2 text-white absolute left-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
        )}
        <span className={`${loading ? 'ml-4' : ''}`}>{children}</span>
      </button>
    );
  }
);

export default LoadingConfettiButton;
