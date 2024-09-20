// LoadingSpinner.js
import React from 'react';
import styled, { keyframes } from 'styled-components';

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  border: 8px solid rgba(0, 0, 255, 0.2);
  border-top: 8px solid blue;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: ${rotate} 2s linear infinite;
`;

const LoadingSpinner = () => (
  <Spinner />
);

export default LoadingSpinner;
