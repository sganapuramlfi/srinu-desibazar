import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Minimal app without ANY providers or API calls
function MinimalApp() {
  console.log("MinimalApp rendering");
  
  return (
    <div style={{ 
      backgroundColor: 'green', 
      padding: '50px', 
      color: 'white',
      fontSize: '24px',
      textAlign: 'center',
      minHeight: '100vh'
    }}>
      <h1>MINIMAL TEST - NO API CALLS</h1>
      <p>If you can see this, React core is working!</p>
      <p>Timestamp: {new Date().toISOString()}</p>
      <div style={{ backgroundColor: 'blue', padding: '20px', margin: '20px' }}>
        <p>No providers, no API calls, no complex components</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MinimalApp />
  </StrictMode>
);