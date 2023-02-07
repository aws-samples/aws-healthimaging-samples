import ReactDOM from 'react-dom/client';

// Router
import { BrowserRouter } from 'react-router-dom';

// Cloudscape
import '@cloudscape-design/global-styles/index.css';

// AWS Amplify
import { Authenticator } from '@aws-amplify/ui-react';

// App
import App from './components/App';

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <Authenticator.Provider>
            <App />
        </Authenticator.Provider>
    </BrowserRouter>
);
