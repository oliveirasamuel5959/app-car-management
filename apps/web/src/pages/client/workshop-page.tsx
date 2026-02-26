import { useState, useEffect } from "react";
import { WorkshopCard } from "../../components/workshops/workshop-card";

interface Workshop {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  rating_avg: number;
}

export default function WorkshopPage() {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sampleWorkshop: Workshop = {
      id: 3,
      name: "Mike's Auto Repair",
      description: "Professional automotive repair and maintenance services",
      latitude: 40.7128,
      longitude: -74.006,
      rating_avg: 6.8,
    };

    const timer = setTimeout(() => {
      setWorkshop(sampleWorkshop);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading workshop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Workshop Details
          </h1>
          <p className="text-gray-600">
            View detailed information about the workshop
          </p>
        </div>

        {workshop && (
          <WorkshopCard
            id={workshop.id}
            name={workshop.name}
            description={workshop.description}
            latitude={workshop.latitude}
            longitude={workshop.longitude}
            rating_avg={workshop.rating_avg}
          />
        )}

        {/* {workshop && (
          <div className="mt-12 bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Workshop Data (JSON)
            </h2>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
              {JSON.stringify(workshop, null, 2)}
            </pre>
          </div>
        )} */}
      </div>
    </div>
  );
}
