export default function MinimalTest() {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#333', fontSize: '2em' }}>
        ✅ React is Working!
      </h1>
      <p style={{ fontSize: '1.2em', color: '#666' }}>
        If you can see this, React is rendering properly.
      </p>
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
        <h2>Test Results:</h2>
        <ul>
          <li>✅ HTML Loading</li>
          <li>✅ React Rendering</li>
          <li>✅ TypeScript Compiling</li>
          <li>✅ Docker Container Running</li>
        </ul>
      </div>
    </div>
  );
}