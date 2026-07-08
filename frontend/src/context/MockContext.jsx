import React, { createContext, useState, useEffect } from 'react';

export const MockContext = createContext();

export const MockProvider = ({ children }) => {
  // Set default mock date to 2026-07-07 (Day 4 in our seed schedule)
  const [mockDate, setMockDate] = useState(() => {
    return localStorage.getItem('mockDate') || '2026-07-07';
  });

  // Default mock time to 09:15 (during Period 1)
  const [mockTime, setMockTime] = useState(() => {
    return localStorage.getItem('mockTime') || '09:15';
  });

  useEffect(() => {
    localStorage.setItem('mockDate', mockDate);
  }, [mockDate]);

  useEffect(() => {
    localStorage.setItem('mockTime', mockTime);
  }, [mockTime]);

  return (
    <MockContext.Provider value={{ mockDate, setMockDate, mockTime, setMockTime }}>
      {children}
    </MockContext.Provider>
  );
};
