import Link from 'next/link';

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You don&apos;t have access to this page</h1>
        <p className="text-gray-600 mb-6">Sign in with an account that has access, or go back to the directory.</p>
        <div className="flex justify-center gap-3">
          <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
            Back to Directory
          </Link>
          <Link href="/login" className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
