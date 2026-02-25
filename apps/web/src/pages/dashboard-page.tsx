import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import CarList from "../components/cars/car-list";
import travelingSvg from "../assets/undraw_traveling_yhxq.svg";
import { useEffect, useState } from "react";
import { api } from "../services/api";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");
  console.log("Dashboard token:", token);

  const WelcomeMessage = () => (
    <div className="flex flex-col items-center text-center py-20 px-6">
      <img
        src={travelingSvg}
        alt="Start"
        className="w-72 mb-8 opacity-90"
      />

      <h2 className="text-3xl font-bold text-gray-900 mb-4">
        Welcome to Car Keep
      </h2>

      <p className="text-gray-500 max-w-xl mb-8">
        You haven’t registered any vehicles yet. Add your first car and start
        managing everything in one place.
      </p>

      <button
        onClick={() => navigate("/cars/new")}
        className="bg-black text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
      >
        + Add Your First Car
      </button>
    </div>
  );

  const ErrorState = () => (
    <div className="flex flex-col items-center text-center py-20 px-6">
      <img
        src={travelingSvg}
        alt="Error"
        className="w-72 mb-8 opacity-60"
      />

      <h2 className="text-2xl font-semibold text-gray-800 mb-4">
        Something went wrong
      </h2>

      <p className="text-gray-500 max-w-xl mb-8">
        We couldn’t load your cars. Try refreshing the page.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <title>Car Keep - Dashboard</title>
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              My Cars
            </h1>
            <p className="text-gray-500 mt-2">
              Welcome back{user?.name ? `, ${user.name}` : ""}.
            </p>
          </div>

          <button
            onClick={() => navigate("/cars/new")}
            className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
          >
            + Add Car
          </button>
        </div>

        {/* Cars Container */}
        <div className="mt-10 bg-white rounded-3xl shadow-lg p-8 min-h-[60vh]">
          <CarList
            WelcomeMessage={WelcomeMessage}
            ErrorState={ErrorState}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;