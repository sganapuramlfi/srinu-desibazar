function TestApp() {
  console.log("TestApp component is rendering NOW!");
  alert("TestApp is working!");
  return (
    <div style={{ padding: '50px', fontSize: '24px', backgroundColor: '#f0f8ff' }}>
      <h1 style={{ color: 'green' }}>🎉 SUCCESS! Page is Working!</h1>
      <p>If you see this, the React app is running properly.</p>
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: 'lightgreen', borderRadius: '10px' }}>
        <h2>DesiBazaar Hub is Ready!</h2>
        <p>✅ Docker containers are running</p>
        <p>✅ React is rendering</p>
        <p>✅ Ready for sidebar ads</p>
      </div>
    </div>
  );
}

export default TestApp;