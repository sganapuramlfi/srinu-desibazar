// Simple test to verify chat API is working
const testChatAPI = async () => {
  try {
    // Test basic endpoint
    const response = await fetch('http://localhost:3000/api/chat/preferences', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    console.log('Chat API Status:', response.status);
    console.log('Response:', await response.text());
  } catch (error) {
    console.error('Error testing chat API:', error);
  }
};

testChatAPI();