import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Toast from "../ui/alert/Alert";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.username.trim() || !formData.password.trim()) {
      setToast("Please enter both username and password.");
      setToastVariant('error');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        "https://apihrms.innovyxtechlabs.com/app/login/",
        {
          username: formData.username.trim(),
          password: formData.password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { access, refresh, role } = response.data;

      if (!access || !refresh || !role) {
        throw new Error("Invalid response from server");
      }

      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("user_role", role);

      // Set default header for other requests
      axios.defaults.headers.common["Authorization"] = `Bearer ${access}`;

  setToast("Sign in successful! Redirecting...");
  setToastVariant('success');

      // Redirect based on role
      setTimeout(() => {
        if (role === "master") {
          navigate("/master-dashboard");
        } else if (role === "admin") {
          navigate("/admin");
        } else if (role === "employee") {
          navigate("/employee");
        } else {
          setToast("Unknown role. Cannot redirect.");
          setTimeout(() => setToast(null), 3000);
        }
      }, 1000);

    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.detail || 
                           err.response?.data?.message || 
                           err.response?.data?.error ||
                           "Login failed. Please check your credentials.";
        setToast(errorMessage);
        setToastVariant('error');
      } else {
        setToast("Network error. Please try again.");
        setToastVariant('error');
      }
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {toast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full flex justify-center">
          <Toast variant={toastVariant} title={toastVariant === 'error' ? 'Error' : 'Success'} message={toast} showLink={false} />
        </div>
      )}

      

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <h1 className="mb-2 font-semibold text-gray-800 text-title-sm sm:text-title-md">
          Sign In
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>Username</Label>
            <Input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                {showPassword ? (
                  <EyeIcon className="size-5" />
                ) : (
                  <EyeCloseIcon className="size-5" />
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox checked={isChecked} onChange={setIsChecked} />
              <span className="text-sm text-gray-700">Keep me logged in</span>
            </div>
            <Link to="/reset-password" className="text-sm text-brand-500">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-3 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <p className="text-sm text-gray-700">
            Don't have an account?{" "}
            <Link to="/signup" className="text-brand-500">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
