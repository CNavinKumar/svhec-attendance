import React, { createContext, useState, useEffect } from 'react';

export const MockContext = createContext();

// Helper: get today's date as YYYY-MM-DD in local time
const getTodayDate = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper: get current time as HH:MM in local time
const getCurrentTime = () => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

export const MockProvider = ({ children }) => {
  // Default to real current date (not a hardcoded mock date)
  const [mockDate, setMockDate] = useState(() => {
    return localStorage.getItem('mockDate') || getTodayDate();
  });

  // Default to real current time (not a hardcoded mock time)
  const [mockTime, setMockTime] = useState(() => {
    return localStorage.getItem('mockTime') || getCurrentTime();
  });

  // Flag to track if we're using real-time mode (auto-update every minute)
  const [isRealTime, setIsRealTime] = useState(() => {
    return localStorage.getItem('mockDate') === null && localStorage.getItem('mockTime') === null;
  });

  useEffect(() => {
    localStorage.setItem('mockDate', mockDate);
  }, [mockDate]);

  useEffect(() => {
    localStorage.setItem('mockTime', mockTime);
  }, [mockTime]);

  // In real-time mode, tick the time forward every second
  useEffect(() => {
    if (!isRealTime) return;
    
    setMockDate(getTodayDate());
    setMockTime(getCurrentTime());

    const interval = setInterval(() => {
      setMockDate(getTodayDate());
      setMockTime(getCurrentTime());
    }, 1000); // update every second
    return () => clearInterval(interval);
  }, [isRealTime]);

  // Snap back to real date/time
  const useRealTime = () => {
    const today = getTodayDate();
    const now = getCurrentTime();
    setMockDate(today);
    setMockTime(now);
    setIsRealTime(true);
    localStorage.removeItem('mockDate');
    localStorage.removeItem('mockTime');
  };

  // When user manually changes date/time, disable real-time mode
  const handleSetMockDate = (date) => {
    setIsRealTime(false);
    setMockDate(date);
  };

  const handleSetMockTime = (time) => {
    setIsRealTime(false);
    setMockTime(time);
  };

  return (
    <MockContext.Provider value={{
      mockDate, setMockDate: handleSetMockDate,
      mockTime, setMockTime: handleSetMockTime,
      isRealTime, useRealTime
    }}>
      {children}
    </MockContext.Provider>
  );
};
