export default function TestBasic() {
  console.log("TestBasic component rendering");
  
  return (
    <div style={{ 
      backgroundColor: 'red', 
      padding: '50px', 
      color: 'white',
      fontSize: '24px',
      textAlign: 'center'
    }}>
      <h1>BASIC TEST PAGE</h1>
      <p>If you can see this, React is working!</p>
      <div style={{ backgroundColor: 'blue', padding: '20px', margin: '20px' }}>
        <p>This is a simple test without Tailwind</p>
      </div>
    </div>
  );
}