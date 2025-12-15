import React, { createContext, useContext, useState, useEffect } from 'react';

const ConfigContext = createContext();

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export const ConfigProvider = ({ children }) => {
  const mlUrl = '/pei-ml';
  
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConfig = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch(`${mlUrl}/api/v1/config`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setConfig(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch config:', err.message);
      setError(`Failed to load configuration from ML service: ${err.message}`);
      setConfig(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const value = {
    config,
    loading,
    error,
    refetch: fetchConfig
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};
