// Declare global variable from Vite config
declare const __API_URL__: string;
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";

import { EyeCloseIcon, EyeIcon, UserCircleIcon, LockIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Toast from "../ui/alert/Alert";
import { createApiUrl } from "../../access/access.ts"; // use your helper

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
      setToastVariant("error");
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setIsLoading(true);

    // Build the login URL using createApiUrl
    const loginUrl = createApiUrl("app/login/");
    console.log("Login URL:", loginUrl);

    try {
      const response = await axios.post(
        loginUrl,
        {
          username: formData.username.trim(),
          password: formData.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
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
      setToastVariant("success");

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
        const errorMessage =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Login failed. Please check your credentials.";
        setToast(errorMessage);
        setToastVariant("error");
      } else {
        setToast("Network error. Please try again.");
        setToastVariant("error");
      }
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  return (
    <div className="flex flex-col flex-1">
      {toast && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full flex justify-center">
          <Toast variant={toastVariant} title={toastVariant === 'error' ? 'Error' : 'Success'} message={toast} showLink={false} />
        </div>
      )}

      

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        {/* Logo */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
        >
          <img src="/logo.png" alt="Innovyx HRMS Logo" className="w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300" />
        </motion.div>

        <motion.div
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            className="mb-2 font-bold text-gray-800 dark:text-white text-3xl text-center bg-gradient-to-r from-brand-600 to-brand-800 bg-clip-text text-transparent"
            variants={itemVariants}
          >
            Welcome Back
          </motion.h1>
          <motion.p
            className="text-center text-gray-600 dark:text-gray-400 mb-8 text-lg"
            variants={itemVariants}
          >
            Sign in to your account
          </motion.p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div variants={itemVariants}>
              <Label>Username</Label>
              <div className="relative group">
                <Input
                  type="text"
                  name="username"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange}
                  className="pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all duration-300 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm"
                />
                <UserCircleIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 size-5 text-gray-400 group-focus-within:text-brand-500 transition-colors duration-300" />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Label>Password</Label>
              <div className="relative group">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-12 pr-12 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all duration-300 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm"
                />
                <LockIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 size-5 text-gray-400 group-focus-within:text-brand-500 transition-colors duration-300" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 cursor-pointer hover:text-brand-500 transition-colors duration-300"
                >
                  {showPassword ? (
                    <EyeIcon className="size-5" />
                  ) : (
                    <EyeCloseIcon className="size-5" />
                  )}
                </button>
              </div>
            </motion.div>

            <motion.div className="flex items-center justify-between" variants={itemVariants}>
              <div className="flex items-center gap-3">
                <Checkbox checked={isChecked} onChange={setIsChecked} />
                <span className="text-sm text-gray-700 dark:text-gray-300">Keep me logged in</span>
              </div>
              <Link to="/resetpassword" className="text-sm text-brand-500 hover:text-brand-600 transition-colors font-medium">
                Forgot password?
              </Link>
            </motion.div>

            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 text-sm font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg relative overflow-hidden group"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </div>
            </motion.button>
          </form>

          <motion.div className="mt-8 text-center" variants={itemVariants}>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Don't have an account?{" "}
              <Link to="/signup" className="text-brand-500 hover:text-brand-600 transition-colors font-semibold hover:underline">
                Sign Up
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
