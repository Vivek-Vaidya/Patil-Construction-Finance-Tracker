import ChangePasswordForm from "./ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">YPC</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
            <p className="text-sm text-gray-500 mt-1">
              You must change your password before continuing.
            </p>
          </div>
        </div>

        <ChangePasswordForm />
      </div>
    </div>
  );
}
