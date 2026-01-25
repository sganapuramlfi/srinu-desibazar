export default function TestPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-4xl font-bold text-primary mb-4">
        Test Page - Working!
      </h1>
      <p className="text-lg text-muted-foreground">
        If you can see this, React is working properly.
      </p>
      <div className="mt-8 p-6 bg-primary/10 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Sidebar Ads Testing</h2>
        <div className="space-y-4">
          <div className="p-4 bg-primary text-primary-foreground rounded animate-pulse">
            Flash Animation Test
          </div>
          <div className="p-4 bg-secondary text-secondary-foreground rounded hover:scale-105 transition-transform">
            Hover Animation Test
          </div>
          <div className="p-4 bg-accent text-accent-foreground rounded animate-bounce">
            Bounce Animation Test
          </div>
        </div>
      </div>
    </div>
  );
}