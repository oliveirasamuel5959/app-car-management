import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { useEffect, useState } from "react";
import { serviceService } from "../../services/service-service";
import Header from "../../components/navigation/header";

interface Service {
  id: number;
  status: "pending" | "in_progress" | "completed";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeService, setActiveService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const services = await serviceService.getServices();

        if (Array.isArray(services) && services.length > 0) {
          // Prefer in_progress service
          const inProgress = services.find(
            (s) => s.status === "in_progress"
          );

          setActiveService(inProgress || services[0]);
        }
      } catch (err) {
        console.error("Failed to fetch services", err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleGoToService = () => {
    if (!activeService) return;
    navigate(`/client/services/${activeService.id}`);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-gray-900">
          Welcome back{user?.name ? `, ${user.name}` : ""} 👋
        </h1>
        <p className="text-gray-500 mt-2">
          Track your service progress in real time.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row items-center justify-between">

        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            View Current Service
          </h2>
          <p className="text-gray-500 mt-2">
            Check repair progress, timeline updates, and workshop notes.
          </p>
        </div>

        <button
          onClick={handleGoToService}
          disabled={!activeService || loading}
          className={`mt-6 md:mt-0 px-6 py-3 rounded-xl font-medium transition
            ${
              activeService
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
        >
          {loading
            ? "Loading..."
            : activeService
            ? "Go to Service"
            : "No Active Services"}
        </button>

      </div>

    </div>
  );
}