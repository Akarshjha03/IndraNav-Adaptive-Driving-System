/**
 * main.jsx - React Application Entry Point
 * 
 * This file initializes the React application and renders the main App component.
 * It includes global configurations and setup for the IndraNav application.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Create root element and render the application
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
) 