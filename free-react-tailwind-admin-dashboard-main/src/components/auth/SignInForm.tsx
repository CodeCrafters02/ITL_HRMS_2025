import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const navigate = useNavigate();

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
        "http://127.0.0.1:8000/app/login/",
        formData
      );

      const { access, refresh, role } = response.data;

      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);

      // Optionally set default header for other requests
      axios.defaults.headers.common["Authorization"] = `Bearer ${access}`;

      alert("Login successful!");

      
      if (role === "master") {
        navigate("/master-dashboard");
      } else if (role === "admin") {
        navigate("/admin");
      } else if (role === "employee") {
        navigate("/employee");
      } else {
        alert("Unknown role. Cannot redirect.");
      }
    } catch (err) {
      console.error("Login failed:", err);
      alert("Login failed. Check credentials.");
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <ChevronLeftIcon className="size-5" />
          Back to dashboard
        </Link>
      </div>

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
            className="w-full px-4 py-3 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600"
          >
            Sign In
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
