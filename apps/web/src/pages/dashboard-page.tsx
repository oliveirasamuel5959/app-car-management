import { CheckInCard } from "../components/workshops/services-status-card";
import { CheckoutEstimatedCard } from "../components/workshops/services-status-card";
import { ServiceProgressCard } from "../components/workshops/services-status-card";
import { ServiceInProgressCard } from "../components/workshops/services-status-card";
import { ServicesTimeline } from "../components/workshops/services-timeline";
import { VehicleInfo } from "../components/workshops/vehicle-info";
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
  checkInDate: "2026-02-10",
  status: "in-progress",
  estimatedCompletion: "2025-02-27",
};


const workshopServices: WorkshopService[] = [
  {
    id: 1,
    name: "Troca de Óleo e Substituição de Filtro",
    status: "completed",
    startDate: "2025-02-20",
    completionDate: "2025-02-20",
  },
  {
    id: 2,
    name: "Inspeção de Freios e Substituição de Pastilhas",
    status: "in-progress",
    startDate: "2025-02-21",
    completionDate: null,
  },
  {
    id: 3,
    name: "Rodízio de Pneus e Alinhamento",
    status: "pending",
    startDate: "2025-02-25",
    completionDate: null,
  },
  {
    id: 4,
    name: "Substituição de Bateria",
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


export default function DashboardPage() {

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
            Painel do Veículo
          </h1>
          <p className="text-gray-600">
            Acompanhe o status do seu carro, cronograma de manutenção e progresso da oficina
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
                    Placa: <span className="font-mono font-bold">{sampleCarInWorkshop.licensePlate}</span>
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
                <CheckInCard
                  title="DATA DE ENTRADA"
                  sampleCarInWorkshop={sampleCarInWorkshop}
                  daysInWorkshop={daysInWorkshop}
                />
                <CheckoutEstimatedCard
                  title="CONCLUSÃO ESTIMADA"
                  sampleCarInWorkshop={sampleCarInWorkshop}
                  daysRemaining={daysRemaining}
                />

                {/* Services Progress */}
                <ServiceProgressCard
                  title="PROGRESSO"
                  completedServices={completedServices}
                  workshopServices={workshopServices}
                />

                {/* In Progress */}
                <ServiceInProgressCard
                  title="EM ATENDIMENTO"
                  inProgressServices={inProgressServices}
                />
                
              </div>

              {/* Timeline */}
              {/* <ServicesTimeline
                sampleCarInWorkshop={sampleCarInWorkshop}
                completedServices={completedServices}
                inProgressServices={inProgressServices}
              /> */}
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
                  🔧 Cronograma de Serviços da Oficina
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
                          Data de Início
                        </p>
                        <p className="font-medium">
                          {new Date(service.startDate).toLocaleDateString()}
                        </p>
                      </div>

                      {service.completionDate && (
                        <div>
                          <p className="text-xs text-gray-500 font-semibold uppercase">
                            Concluído
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
                    Total de Serviços
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
                    Tarefas Pendentes
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {workshopServices.filter((s) => s.status === "pending").length}
                  </p>
                </div>
                <div className="text-4xl">⏳</div>
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance Tips Section */}

        {/* Footer Info */}
        <VehicleInfo sampleCarInWorkshop={sampleCarInWorkshop} />

      </div>
    </div>
  );
}
