// Simple test service to verify import works
console.log('🧞‍♂️ [TestAI] Service loading...');

export const testAI = {
  getSystemStatus: () => {
    return {
      test_status: "working",
      provider: "test"
    };
  },
  processQuery: (params) => {
    return {
      understanding: "Test response working!",
      recommendations: [],
      insights: ["Service is operational"],
      actions: []
    };
  }
};

console.log('🧞‍♂️ [TestAI] Service loaded successfully');