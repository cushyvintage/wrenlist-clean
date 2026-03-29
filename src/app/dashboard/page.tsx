export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-gray-600 mt-2">Welcome to Wrenlist. Manage your vintage resale inventory.</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Total Products</p>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Active Listings</p>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Recent Sales</p>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Connected Marketplaces</p>
          <p className="text-3xl font-bold mt-2">0</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <h3 className="text-lg font-semibold mb-2">Inventory</h3>
          <p className="text-gray-600 text-sm mb-4">Manage your product inventory</p>
          <a href="/dashboard/products" className="text-green-600 hover:text-green-700 font-medium">
            Go to Inventory →
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <h3 className="text-lg font-semibold mb-2">Listings</h3>
          <p className="text-gray-600 text-sm mb-4">Create and manage marketplace listings</p>
          <a href="/dashboard/listings" className="text-green-600 hover:text-green-700 font-medium">
            Go to Listings →
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <h3 className="text-lg font-semibold mb-2">Settings</h3>
          <p className="text-gray-600 text-sm mb-4">Configure marketplace accounts and preferences</p>
          <a href="/dashboard/settings" className="text-green-600 hover:text-green-700 font-medium">
            Go to Settings →
          </a>
        </div>
      </div>
    </div>
  )
}
