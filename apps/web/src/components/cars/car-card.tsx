import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import CarChevrolet from '../../assets/cars/car-chevrolet-tracker.png';
import { carService } from "../../services/car-service";

const CarCard = ({ carData, loading }) => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto bg-white rounded-3xl shadow-lg overflow-hidden animate-pulse">
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-1/2 h-72 lg:h-auto bg-gray-200"></div>
          <div className="lg:w-1/2 p-10 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/5"></div>
            <div className="h-20 bg-gray-200 rounded w-full mt-6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
      <div className="flex flex-col lg:flex-row">

        {/* LEFT — Car Image */}
        <div className="lg:w-1/2 relative bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6 lg:p-10">
          <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md">
            Active
          </div>
          <img
            src={CarChevrolet}
            alt={`${carData.brand} ${carData.model}`}
            className="w-full max-h-80 object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* RIGHT — Car Info */}
        <div className="lg:w-1/2 p-8 lg:p-10 flex flex-col justify-between">

          {/* Top section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {carData.brand}
              </span>
              <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {carData.year}
              </span>
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {carData.model}
            </h2>

            <p className="text-gray-500 mb-8">
              Premium vehicle • Excellent condition
            </p>

            {/* INFO GRID */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Year</p>
                <p className="text-xl font-bold text-gray-900">{carData.year}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Plate</p>
                <p className="text-xl font-bold text-gray-900">{carData.plate}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Brand</p>
                <p className="text-xl font-bold text-gray-900">{carData.brand}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">ID</p>
                <p className="text-xl font-bold text-gray-900">#{carData.id}</p>
              </div>
            </div>
          </div>

          {/* Bottom — Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate(`/cars/${carData.id}`)}
              className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl text-base font-semibold hover:bg-blue-700 transition duration-200 shadow-md shadow-blue-500/20"
            >
              View Details
            </button>
            <button
              onClick={() => navigate(`/client/services`)}
              className="flex-1 bg-slate-100 text-gray-700 py-3.5 rounded-xl text-base font-semibold hover:bg-slate-200 transition duration-200 border border-slate-200"
            >
              Service History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarCard;
