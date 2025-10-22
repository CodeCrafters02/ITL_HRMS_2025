import { useState } from "react";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { EyeIcon, EyeCloseIcon } from "../../icons";
import { sendOtp, verifyOtp, resetPassword } from "./api.ts";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function ForgotPasswordForm() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 1️ Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await sendOtp(email);
    if (result.success) {
      toast.success("OTP sent to your email.");
      setStep(2);
    } else {
      toast.error(result.error)
    }
    setIsSubmitting(false);
  };

  // 2️ Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await verifyOtp(email, otp);
    if (result.success) {
      toast.success("OTP verified. Please enter new password.");
      setStep(3);
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  };

  // 3️ Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      setIsSubmitting(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.success("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }
    const result = await resetPassword(email, otp, newPassword, confirmPassword);
    if (result.success) {
      toast.success("Password reset successful. You can now sign in.");
      setStep(4); 
    } else {
      toast.error(result.error)
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-md mx-auto p-4">
        <ToastContainer
          position="top-center"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          className="z-[99999]"
        />
        {step === 1 && (
        <div className="flex justify-center mt-[250px]">
            <div className="w-full max-w-sm p-6 bg-white dark:bg-gray-800 rounded shadow">
            <h2 className="text-xl font-bold mb-4 text-center">Forgot Password</h2>
            <form onSubmit={handleSendOtp}>
                <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                />
                <Button type="submit" className="mt-4 w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending OTP..." : "Send OTP"}
                </Button>
            </form>
            </div>
        </div>
        )}

        {step === 2 && (
        <div className="flex justify-center mt-[230px]">
            <div className="w-full max-w-sm p-6 bg-white dark:bg-gray-800 rounded shadow">
            <h2 className="text-xl font-bold mb-4 text-center">Verify OTP</h2>

            <form onSubmit={handleVerifyOtp}>
                <Input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                />
                <Button type="submit" className="mt-4 w-full" disabled={isSubmitting}>
                {isSubmitting ? "Verifying..." : "Verify OTP"}
                </Button>
            </form>

            <div className="text-center mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-300">
                Didn't receive OTP?{" "}
                <button
                    type="button"
                    className="text-blue-600 underline hover:text-blue-800"
                    onClick={async () => {
                    setIsSubmitting(true);
                    const result = await sendOtp(email);
                    if (result.success) {
                        toast.success("OTP resent successfully.");
                    } else {
                        toast.error(result.error || "Failed to resend OTP.");
                    }
                    setIsSubmitting(false);
                    }}
                >
                    Resend OTP
                </button>
                </p>
            </div>
            </div>
        </div>
        )}


        {step === 3 && (
          <div className="flex justify-center mt-[210px]">
            <div className="w-full max-w-sm p-6 bg-white dark:bg-gray-800 rounded shadow">
              <h2 className="text-xl font-bold mb-4 text-center">Reset Password</h2>
              <form onSubmit={handleResetPassword}>

                {/* New Password Field with Eye Icon */}
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={e => {
                      setNewPassword(e.target.value);
                    }}
                  />
                  <span
                    onClick={() => setShowNewPassword(prev => !prev)}
                    className="absolute right-3 top-3 cursor-pointer text-gray-500"
                  >
                    {showNewPassword ? <EyeCloseIcon  className="fill-gray-500 dark:fill-gray-400 size-5"/> : <EyeIcon  className="fill-gray-500 dark:fill-gray-400 size-5"/>}
                  </span>
                </div>

                {/* Confirm Password Field with Eye Icon and Validation */}
                <div className="relative mt-3">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => {
                      setConfirmPassword(e.target.value);
                    }}
                    className={
                      confirmPassword && newPassword !== confirmPassword
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : ""
                    }
                  />
                  <span
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    className="absolute right-3 top-3 cursor-pointer text-gray-500"
                  >
                    {showConfirmPassword ? <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" /> : <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />}
                  </span>
                </div>

                {/* Validation Feedback */}
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-500">Passwords do not match</p>
                )}
                {confirmPassword && newPassword === confirmPassword && (
                  <p className="mt-1 text-sm text-green-500">Passwords match ✓</p>
                )}

                {/* Submit Button */}
                <Button type="submit" className="mt-4 w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </div>
          </div>
        )}


        {step === 4 && (
        <div className="flex justify-center mt-[210px]">
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded shadow w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4 text-green-700">Password Reset Successful!</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-2">You can now sign in with your new password.</p>
            <a href="/" className="text-blue-600 underline">Go to Sign In</a>
            </div>
        </div>
        )}
        
    </div>
  );
}
