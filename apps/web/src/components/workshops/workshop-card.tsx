interface WorkshopCardProps {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  rating_avg: number;
}

export function WorkshopCard({
  id,
  name,
  description,
  latitude,
  longitude,
  rating_avg,
}: WorkshopCardProps) {
  const starCount = Math.floor(rating_avg / 1.36);

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100">
      {/* Header with workshop name and rating */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">{name}</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-lg ${
                      i < starCount ? "text-yellow-300" : "text-gray-300"
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm font-semibold text-blue-100">
                {rating_avg.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-6 py-4 border-b border-gray-100">
        <p className="text-gray-700 leading-relaxed text-sm">{description}</p>
      </div>

      {/* Location details */}
      <div className="px-6 py-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-full p-2 mt-1">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Location
              </p>
              <p className="text-sm text-gray-800 mt-1 font-medium">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          View Details
        </button>
      </div>
    </div>
  );
}
