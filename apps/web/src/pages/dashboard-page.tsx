import { useState } from "react";

interface CarInWorkshop {
  id: number;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  checkInDate: string;
  status: "pending" | "in-progress" | "completed" | "ready-for-pickup";
  estimatedCompletion: string;
}

interface MaintenanceTip {
  id: number;
  title: string;
  description: string;
  category: "oil" | "tires" | "brakes" | "battery" | "general";
  priority: "low" | "medium" | "high";
}

interface WorkshopService {
  id: number;
  name: string;
  status: "pending" | "in-progress" | "completed";
  startDate: string;
  completionDate: string | null;
}

const sampleCarInWorkshop: CarInWorkshop = {
  id: 1,
  brand: "Toyota",
  model: "Corolla",
  year: 2022,
  licensePlate: "ABC-1234",
  checkInDate: "2025-02-20",
  status: "in-progress",
  estimatedCompletion: "2025-02-27",
};

const maintenanceTips: MaintenanceTip[] = [
  {
    id: 1,
    title: "Oil Change Required",
    description:
      "Your vehicle is due for an oil change. Synthetic oil is recommended for better engine performance.",
    category: "oil",
    priority: "high",
  },
  {
    id: 2,
    title: "Tire Rotation Scheduled",
    description:
      "It's time to rotate your tires to ensure even wear and extend their lifespan.",
    category: "tires",
    priority: "medium",
  },
  {
    id: 3,
    title: "Brake Inspection",
    description:
      "Schedule a brake inspection to ensure your vehicle stops safely. Check brake fluid levels.",
    category: "brakes",
    priority: "high",
  },
  {
    id: 4,
    title: "Battery Health Check",
    description:
      "Your battery is 3 years old. Consider a health check to avoid unexpected failures.",
    category: "battery",
    priority: "medium",
  },
];

const workshopServices: WorkshopService[] = [
  {
    id: 1,
    name: "Oil Change & Filter Replacement",
    status: "completed",
    startDate: "2025-02-20",
    completionDate: "2025-02-20",
  },
  {
    id: 2,
    name: "Brake Inspection & Pad Replacement",
    status: "in-progress",
    startDate: "2025-02-21",
    completionDate: null,
  },
  {
    id: 3,
    name: "Tire Rotation & Alignment",
    status: "pending",
    startDate: "2025-02-25",
    completionDate: null,
  },
  {
    id: 4,
    name: "Battery Replacement",
    status: "pending",
    startDate: "2025-02-26",
    completionDate: null,
  },
];

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 border-green-300";
    case "in-progress":
      return "bg-blue-100 text-blue-800 border-blue-300";
    case "ready-for-pickup":
      return "bg-purple-100 text-purple-800 border-purple-300";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800 border-red-300";
    case "medium":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "low":
      return "bg-green-100 text-green-800 border-green-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "oil":
      return "🛢️";
    case "tires":
      return "🛞";
    case "brakes":
      return "🛑";
    case "battery":
      return "🔋";
    default:
      return "⚙️";
  }
}

export default function DashboardPage() {
  const [selectedTip, setSelectedTip] = useState<MaintenanceTip | null>(null);

  const daysInWorkshop = Math.floor(
    (new Date().getTime() - new Date(sampleCarInWorkshop.checkInDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const daysRemaining = Math.ceil(
    (new Date(sampleCarInWorkshop.estimatedCompletion).getTime() -
      new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const completedServices = workshopServices.filter(
    (s) => s.status === "completed"
  ).length;
  const inProgressServices = workshopServices.filter(
    (s) => s.status === "in-progress"
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Vehicle Dashboard
          </h1>
          <p className="text-gray-600">
            Track your car status, maintenance schedule, and workshop progress
          </p>
        </div>

        {/* Car in Workshop Status */}
        {sampleCarInWorkshop && (
          <div className="bg-white rounded-lg shadow-lg border-l-4 border-blue-500 mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {sampleCarInWorkshop.brand} {sampleCarInWorkshop.model}
                  </h2>
                  <p className="text-gray-600">
                    License Plate: <span className="font-mono font-bold">{sampleCarInWorkshop.licensePlate}</span>
                  </p>
                </div>
                <div
                  className={`px-4 py-2 rounded-full text-sm font-bold border ${getStatusColor(
                    sampleCarInWorkshop.status
                  )}`}
                >
                  {sampleCarInWorkshop.status.toUpperCase().replace("-", " ")}
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {/* Check-in Info */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 font-semibold mb-1">
                    CHECK-IN DATE
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {new Date(sampleCarInWorkshop.checkInDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {daysInWorkshop} days in workshop
                  </p>
                </div>

                {/* Days Remaining */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                  <p className="text-sm text-orange-700 font-semibold mb-1">
                    ESTIMATED COMPLETION
                  </p>
                  <p className="text-xl font-bold text-orange-900">
                    {new Date(sampleCarInWorkshop.estimatedCompletion).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-orange-600 mt-2">
                    {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Due soon!"}
                  </p>
                </div>

                {/* Services Progress */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-green-700 font-semibold mb-1">
                    PROGRESS
                  </p>
                  <p className="text-xl font-bold text-green-900">
                    {completedServices}/{workshopServices.length}
                  </p>
                  <p className="text-xs text-green-600 mt-2">Services completed</p>
                </div>

                {/* In Progress */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-700 font-semibold mb-1">
                    IN PROGRESS
                  </p>
                  <p className="text-xl font-bold text-blue-900">
                    {inProgressServices}
                  </p>
                  <p className="text-xs text-blue-600 mt-2">Services being handled</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  📅 Timeline Since Check-in
                </h3>
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-300" />
                  <div className="ml-8 space-y-4">
                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-5 h-5 bg-blue-500 rounded-full border-4 border-white" />
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="font-semibold text-gray-900">
                          Vehicle Check-in
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(sampleCarInWorkshop.checkInDate).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-5 h-5 bg-green-500 rounded-full border-4 border-white" />
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <p className="font-semibold text-gray-900">
                          {completedServices} Services Completed
                        </p>
                        <p className="text-sm text-gray-600">
                          {completedServices > 0 ? "Initial maintenance tasks completed" : "Waiting for first service"}
                        </p>
                      </div>
                    </div>

                    {inProgressServices > 0 && (
                      <div className="relative">
                        <div className="absolute -left-6 top-1 w-5 h-5 bg-yellow-500 rounded-full border-4 border-white animate-pulse" />
                        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                          <p className="font-semibold text-gray-900">
                            {inProgressServices} Service(s) In Progress
                          </p>
                          <p className="text-sm text-gray-600">
                            Currently being worked on
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-5 h-5 bg-blue-400 rounded-full border-4 border-white" />
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="font-semibold text-gray-900">
                          Expected Ready Date
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(sampleCarInWorkshop.estimatedCompletion).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Workshop Services Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  🔧 Workshop Services Schedule
                </h2>
              </div>

              <div className="divide-y divide-gray-200">
                {workshopServices.map((service) => (
                  <div
                    key={service.id}
                    className="p-4 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-900">{service.name}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                          service.status
                        )}`}
                      >
                        {service.status.toUpperCase().replace("-", " ")}
                      </span>
                    </div>

                    <div className="flex gap-4 text-sm text-gray-600">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold uppercase">
                          Start Date
                        </p>
                        <p className="font-medium">
                          {new Date(service.startDate).toLocaleDateString()}
                        </p>
                      </div>

                      {service.completionDate && (
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">
                            Completed
                          </p>
                          <p className="font-medium">
                            {new Date(service.completionDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {service.status === "in-progress" && (
                      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: "65%" }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            {/* Total Services Card */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold uppercase mb-1">
                    Total Services
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {workshopServices.length}
                  </p>
                </div>
                <div className="text-4xl">🛠️</div>
              </div>
            </div>

            {/* Pending Tasks */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold uppercase mb-1">
                    Pending Tasks
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {workshopServices.filter((s) => s.status === "pending").length}
                  </p>
                </div>
                <div className="text-4xl">⏳</div>
              </div>
            </div>

            {/* Maintenance Alerts */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold uppercase mb-1">
                    High Priority
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {maintenanceTips.filter((t) => t.priority === "high").length}
                  </p>
                </div>
                <div className="text-4xl">⚠️</div>
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance Tips Section */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              💡 Maintenance Tips & Alerts
            </h2>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {maintenanceTips.map((tip) => (
                <div
                  key={tip.id}
                  onClick={() => setSelectedTip(selectedTip?.id === tip.id ? null : tip)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    selectedTip?.id === tip.id
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : getPriorityColor(tip.priority)
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getCategoryIcon(tip.category)}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{tip.title}</h3>
                      <p
                        className={`text-xs leading-relaxed ${
                          selectedTip?.id === tip.id
                            ? "text-blue-900"
                            : "text-gray-700"
                        }`}
                      >
                        {selectedTip?.id === tip.id
                          ? tip.description
                          : tip.description.substring(0, 50) + "..."}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            tip.priority === "high"
                              ? "bg-red-200 text-red-800"
                              : tip.priority === "medium"
                              ? "bg-orange-200 text-orange-800"
                              : "bg-green-200 text-green-800"
                          }`}
                        >
                          {tip.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedTip && (
              <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  {selectedTip.title}
                </h3>
                <p className="text-gray-700 mb-3">{selectedTip.description}</p>
                <div className="flex gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold ${getPriorityColor(
                      selectedTip.priority
                    )}`}
                  >
                    {selectedTip.priority.toUpperCase()} PRIORITY
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-bold bg-gray-200 text-gray-800">
                    {selectedTip.category.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 mb-2">ℹ️ Vehicle Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600 text-xs uppercase font-semibold">Brand</p>
              <p className="font-bold text-gray-900">
                {sampleCarInWorkshop.brand}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-xs uppercase font-semibold">Model</p>
              <p className="font-bold text-gray-900">
                {sampleCarInWorkshop.model}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-xs uppercase font-semibold">Year</p>
              <p className="font-bold text-gray-900">
                {sampleCarInWorkshop.year}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-xs uppercase font-semibold">
                License Plate
              </p>
              <p className="font-bold text-gray-900 font-mono">
                {sampleCarInWorkshop.licensePlate}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
