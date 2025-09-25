// Declare global variable from Vite config
declare const __API_URL__: string;
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Link } from "react-router-dom"; // ✅ FIXED!
import axios from "axios"; // ✅

import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";

export default function SignUpForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
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

    try {
      const response = await axios.post(
        `${__API_URL__}/app/master-register/`,
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
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
  <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover aria-label="Notification" />
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to dashboard
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
          Sign Up
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <Label>Email</Label>
            <Input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
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

          <div className="flex items-center gap-3">
            <Checkbox
              className="w-5 h-5"
              checked={isChecked}
              onChange={setIsChecked}
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              By creating an account, you agree to the{" "}
              <span className="text-gray-800 dark:text-white/90">
                Terms and Conditions
              </span>{" "}
              and{" "}
              <span className="text-gray-800 dark:text-white">
                Privacy Policy
              </span>
              .
            </p>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600"
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}
