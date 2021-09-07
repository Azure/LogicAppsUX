import { initializeIcons } from '@fluentui/react'
import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'

initializeIcons();
ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
