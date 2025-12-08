// Declare global variable from Vite config
declare const __API_URL__: string;
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Link } from "react-router-dom"; // ✅ FIXED!
import axios from "axios"; // ✅
import { motion } from "framer-motion";

import { ChevronLeftIcon, EyeCloseIcon, EyeIcon, UserCircleIcon, LockIcon, EnvelopeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";

export default function SignUpForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "master",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isChecked) {
      toast.error("Please accept the Terms and Conditions.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${__API_URL__}app/master-register/`,
        formData
      );
      console.log("Success:", response.data);
      toast.success("Master registered successfully!");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error) {
      console.error("Registration failed:", error);
      const err = error as Record<string, unknown>;
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        (err.response as Record<string, unknown>).data &&
        typeof (err.response as Record<string, unknown>).data === 'object'
      ) {
        const data = (err.response as Record<string, unknown>).data as Record<string, unknown>;
        if (data.detail === "Email already exists.") {
          toast.error("Email already exists.");
        } else if (typeof data.detail === 'string') {
          toast.error(data.detail);
        } else {
          toast.error("Registration failed.");
        }
      } else {
        toast.error("Registration failed.");
      }
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
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover aria-label="Notification" />

      <motion.div
        className="w-full max-w-md mx-auto mb-5 sm:pt-10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 group"
        >
          <ChevronLeftIcon className="size-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to dashboard
        </Link>
      </motion.div>

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
            Create Account
          </motion.h1>
          <motion.p
            className="text-center text-gray-600 dark:text-gray-400 mb-8 text-lg"
            variants={itemVariants}
          >
            Join Innovyx HRMS today
          </motion.p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div variants={itemVariants}>
              <Label>Username</Label>
              <div className="relative group">
                <Input
                  type="text"
                  name="username"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={handleChange}
                  className="pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all duration-300 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm"
                />
                <UserCircleIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 size-5 text-gray-400 group-focus-within:text-brand-500 transition-colors duration-300" />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Label>Email</Label>
              <div className="relative group">
                <Input
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all duration-300 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm"
                />
                <EnvelopeIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 size-5 text-gray-400 group-focus-within:text-brand-500 transition-colors duration-300" />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Label>Password</Label>
              <div className="relative group">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a strong password"
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

            <motion.div className="flex items-start gap-3" variants={itemVariants}>
              <Checkbox
                className="w-5 h-5 mt-1"
                checked={isChecked}
                onChange={setIsChecked}
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                By creating an account, you agree to the{" "}
                <span className="text-brand-600 dark:text-brand-400 font-medium hover:underline cursor-pointer">
                  Terms and Conditions
                </span>{" "}
                and{" "}
                <span className="text-brand-600 dark:text-brand-400 font-medium hover:underline cursor-pointer">
                  Privacy Policy
                </span>
                .
              </p>
            </motion.div>

            <motion.button
              type="submit"
              disabled={isLoading || !isChecked}
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
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </div>
            </motion.button>
          </form>

          <motion.div className="mt-8 text-center" variants={itemVariants}>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Already have an account?{" "}
              <Link to="/signin" className="text-brand-500 hover:text-brand-600 transition-colors font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
