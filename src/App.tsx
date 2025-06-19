import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import ProposalPage from './ProposalPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/proposal" element={<ProposalPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;