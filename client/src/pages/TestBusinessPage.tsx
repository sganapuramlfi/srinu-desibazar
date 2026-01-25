import { useQuery } from "@tanstack/react-query";

interface TestBusinessPageProps {
  businessId?: number;
  slug?: string;
}

export default function TestBusinessPage({ businessId, slug }: TestBusinessPageProps) {
  console.log('TestBusinessPage props:', { businessId, slug });

  // Simple hardcoded test
  const testBusinessId = businessId || (slug === 'spice-palace-melbourne' ? 22 : null);
  
  const { data: business, isLoading, error } = useQuery({
    queryKey: [`/api/businesses/${testBusinessId}/profile`],
    enabled: !!testBusinessId,
  });

  console.log('Query result:', { business: !!business, isLoading, error, testBusinessId });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading business...</p>
          <p className="text-sm text-gray-500">Business ID: {testBusinessId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p>Failed to load business</p>
          <p className="text-sm text-gray-500">Error: {error.message}</p>
          <p className="text-sm text-gray-500">Business ID: {testBusinessId}</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Business Data</h1>
          <p>Business not found or not loaded</p>
          <p className="text-sm text-gray-500">Business ID: {testBusinessId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{business.name}</h1>
          <p className="text-gray-600 mb-4">{business.description}</p>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Industry:</strong> {business.industryType}
            </div>
            <div>
              <strong>Status:</strong> {business.status}
            </div>
            <div>
              <strong>Slug:</strong> {business.slug}
            </div>
            <div>
              <strong>ID:</strong> {business.id}
            </div>
          </div>

          {business.amenities && business.amenities.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Amenities:</h3>
              <div className="flex flex-wrap gap-2">
                {business.amenities.map((amenity, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="font-semibold mb-2">Debug Info:</h3>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify({ businessId, slug, testBusinessId, hasData: !!business }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}