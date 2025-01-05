// components/LoadingConfettiButton.tsx

import React, {
  MouseEventHandler,
  ReactNode,
  forwardRef,
  ForwardRefRenderFunction
} from 'react';

interface LoadingConfettiButtonProps {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

// If you want to ensure 'vibrate' is recognized, you can add this global augmentation
// Or simply use a type assertion as shown below
//
// declare global {
//   interface Navigator {
//     vibrate?: (pattern: number | number[]) => boolean;
//   }
// }

const LoadingConfettiButton: ForwardRefRenderFunction<
  HTMLButtonElement,
  LoadingConfettiButtonProps
> = (
  { onClick, loading = false, disabled = false, className = '', children },
  ref
) => {
  const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    // Safely call vibrate if it exists
    if ((navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate) {
      navigator.vibrate?.(200);
    }

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      ref={ref}
      onClick={handleClick}
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
};

// Wrap the function in `forwardRef` and export it
export default forwardRef<HTMLButtonElement, LoadingConfettiButtonProps>(LoadingConfettiButton);
