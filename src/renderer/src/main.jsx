import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// No StrictMode: each pane's effect spawns a real OS pty process over
// async IPC. StrictMode's dev-only double mount/cleanup races the
// start/kill messages for the same paneId and can leave a pane wired
// to a pty that was already killed - looks like the terminal accepts
// no input at all.
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
