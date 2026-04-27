/**
 * @fileoverview React entrypoint that mounts the MediScan application into the DOM.
 * @module main
 */

import { createRoot } from 'react-dom/client'
import './styles/app.css'
import App from './App.jsx'

/** DOM root declared in index.html. */
createRoot(document.getElementById('root')).render(<App />)
