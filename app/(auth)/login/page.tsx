import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {/* Logo & Branding */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl tracking-tight">YPC</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Patil Construction</h1>
            <p className="text-sm text-gray-500 mt-1">Finance Tracker — Sign In</p>
          </div>
        </div>

        {/* Login Form */}
        <LoginForm />

        {/* Helper info */}
        <div className="pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Authorized personnel only. Contact your administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}
