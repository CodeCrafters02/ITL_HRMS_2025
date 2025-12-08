import React from "react";
import { motion } from "framer-motion";
import GridShape from "../../components/common/GridShape";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 z-1 sm:p-0 min-h-screen overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-brand-400/20 to-brand-600/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full blur-3xl"
          animate={{
            scale: [1.1, 1, 1.1],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-blue-600/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <motion.div
          className="items-center hidden w-full h-full lg:w-1/2 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 lg:grid relative overflow-hidden"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="relative flex items-center justify-center z-1">
            {/* <!-- ===== Common Grid Shape Start ===== --> */}
            <GridShape />
            <motion.div
              className="flex flex-col items-center max-w-xs text-center"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <motion.div
                className="block mb-8 text-5xl font-bold text-white leading-tight"
                animate={{ textShadow: ["0 0 0px rgba(255,255,255,0)", "0 0 20px rgba(255,255,255,0.5)", "0 0 0px rgba(255,255,255,0)"] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Innovyx
              </motion.div>
              <motion.div
                className="block mb-6 text-2xl font-semibold text-white/90"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                Human Resource Management System
              </motion.div>
              <motion.p
                className="text-xl text-white/80 italic mb-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.9 }}
              >
                "Empowering your workforce, streamlining your success."
              </motion.p>
              <motion.div
                className="flex space-x-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 1.1, type: "spring" }}
              >
                <div className="w-4 h-4 bg-white/80 rounded-full animate-pulse"></div>
                <div className="w-4 h-4 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-4 h-4 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
