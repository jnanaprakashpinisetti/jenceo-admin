// App.js
import { BrowserRouter } from 'react-router-dom';
import TopNav from "./layout/TopNav";
import LeftNav from "./layout/LeftNav";

function App() {
  return (
    <div className="man-section">
      <TopNav />
      <div className="layout">
        <BrowserRouter>
          <LeftNav />
        </BrowserRouter>
      </div>
    </div>
  );
}

export default App;