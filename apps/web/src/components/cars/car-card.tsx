import { useNavigate } from "react-router-dom";

import CarChevrolet from '../../assets/cars/car-chevrolet-tracker.png';

const CarCard = ({ car, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto bg-white rounded-3xl shadow-lg overflow-hidden animate-pulse">
        <div className="h-80 bg-gray-300"></div>
        <div className="p-8 space-y-4">
          <div className="h-6 bg-gray-300 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/5"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
      
      {/* 🔥 BIG IMAGE */}
      <div className="h-96 w-full overflow-hidden">
        <img
          src={CarChevrolet}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* 📦 CONTENT */}
      <div className="p-10">
        {/* Title */}
        <h2 className="text-4xl font-bold text-gray-900 mb-2">
          {car.model} {car.brand}
        </h2>

        <p className="text-lg text-gray-500 mb-6">
          Premium vehicle • Excellent condition
        </p>

        {/* INFO GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          
          <div className="bg-gray-100 p-6 rounded-2xl text-center">
            <p className="text-sm text-gray-500">Year</p>
            <p className="text-2xl font-semibold text-gray-800">
              {car.year}
            </p>
          </div>

          <div className="bg-gray-100 p-6 rounded-2xl text-center">
            <p className="text-sm text-gray-500">Plate</p>
            <p className="text-2xl font-semibold text-gray-800">
              {car.plate}
            </p>
          </div>

          <div className="bg-gray-100 p-6 rounded-2xl text-center">
            <p className="text-sm text-gray-500">ID</p>
            <p className="text-2xl font-semibold text-gray-800">
              #{car.id}
            </p>
          </div>

        </div>

        {/* BUTTON */}
        <button
          onClick={() => navigate(`/cars/${car.id}`)}
          className="
            w-full
            bg-black
            text-white
            py-4
            rounded-2xl
            text-lg
            font-semibold
            hover:bg-gray-800
            transition
            duration-300
          "
        >
          View Details →
        </button>
      </div>
    </div>
  );
};

export default CarCard;