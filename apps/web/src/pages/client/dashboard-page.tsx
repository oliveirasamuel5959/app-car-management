import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { useEffect, useState } from "react";
import { useRealtimeRefresh } from "../../realtime/use-realtime-refresh";
import { serviceService } from "../../services/service-service";

interface Service {
  id: number;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  name: string;
}

interface ServiceSummary {
  total_orders: number;
  active_orders: number;
  pending_orders: number;
  confirmed_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  recent_orders: Service[];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeService, setActiveService] = useState<Service | null>(null);
  const [summary, setSummary] = useState<ServiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshKey = useRealtimeRefresh('order_status_change');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const nextSummary = await serviceService.getClientSummary();
        setSummary(nextSummary);

        const recentOrders = Array.isArray(nextSummary.recent_orders) ? nextSummary.recent_orders : [];
        const preferred = recentOrders.find((service) => service.status === "in_progress")
          || recentOrders.find((service) => service.status === "confirmed")
          || recentOrders.find((service) => service.status === "pending")
          || recentOrders[0]
          || null;

        setActiveService(preferred);
      } catch (err) {
        console.error("Failed to fetch services", err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [refreshKey]);

  const handleGoToService = () => {
    if (!activeService) return;
    navigate(`/client/services/${activeService.id}`);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-8">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold text-gray-900">
          Welcome back{user?.name ? `, ${user.name}` : ""} 👋
        </h1>
        <p className="text-gray-500 mt-2">
          Track your service progress in real time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {[
          { label: "Ativos", value: summary?.active_orders ?? 0 },
          { label: "Pendentes", value: summary?.pending_orders ?? 0 },
          { label: "Confirmados", value: summary?.confirmed_orders ?? 0 },
          { label: "Em andamento", value: summary?.in_progress_orders ?? 0 },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm uppercase tracking-wide text-gray-500">{item.label}</p>
            <p className="text-3xl font-semibold text-gray-900 mt-3">{loading ? '...' : item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row items-center justify-between">

        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Current Service Order
          </h2>
          <p className="text-gray-500 mt-2">
            {activeService ? `${activeService.name} is currently ${activeService.status.replace('_', ' ')}.` : 'Check repair progress, timeline updates, and workshop notes.'}
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
            ? "Open My Orders"
            : "No Active Services"}
        </button>

      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mt-8">
        <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
        <div className="mt-6 space-y-3">
          {(summary?.recent_orders ?? []).slice(0, 5).map((service) => (
            <button
              key={service.id}
              onClick={() => navigate(`/client/services/${service.id}`)}
              className="w-full text-left border border-gray-100 rounded-xl px-4 py-3 hover:border-blue-200 hover:bg-blue-50 transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">{service.name}</p>
                  <p className="text-sm text-gray-500">Order #{service.id}</p>
                </div>
                <span className="text-sm font-medium text-blue-700 capitalize">{service.status.replace('_', ' ')}</span>
              </div>
            </button>
          ))}
          {!loading && (summary?.recent_orders?.length ?? 0) === 0 && (
            <p className="text-gray-500">No orders yet.</p>
          )}
        </div>
      </div>

    </div>
  );
}