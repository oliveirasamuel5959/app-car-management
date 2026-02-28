import { useEffect, useState } from 'react';
import { serviceService } from '../../services/service-service';

interface Service {
  id: number;
  workshop_id: number;
  vehicle_id: number;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress_percentage: number;
  checkin_date: string;
  estimated_finish_date: string;
  finished_at: string | null;
  estimated_hours: number;
  actual_hours: number | null;
  estimated_cost: number;
  final_cost: number | null;
  workshop_notes: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await serviceService.getMyServices();
        setServices(response);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (services.length === 0) {
    return <div className="p-10 text-gray-500">Nenhum serviço encontrado</div>;
  }

  const statusColor = {
    pending: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    approved: 'bg-green-100 text-green-700',
  };

  const statusLabel: Record<string, string> = {
    pending: 'Pendente',
    in_progress: 'Em andamento',
    completed: 'Concluído',
    approved: 'Aprovado',
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Meus Serviços
        </h1>
        <p className="text-gray-500 mt-2">
          Acompanhe o andamento do reparo do seu veículo
        </p>
      </div>

      <div className="space-y-8">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            {/* Header */}
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">
                  {service.name}
                </h2>
                <p className="text-gray-500 mt-2">
                  {service.description}
                </p>
              </div>

              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${statusColor[service.status]}`}
              >
                {statusLabel[service.status]}
              </span>
            </div>

            {/* Progress */}
            <div className="mt-8">
              <div className="flex justify-between mb-2 text-sm text-gray-600">
                <span>Progresso</span>
                <span>{service.progress_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${service.progress_percentage}%` }}
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-12 relative border-l-2 border-gray-200 pl-8 space-y-10">
              <div className="relative">
                <div className="absolute -left-10 w-8 h-8 bg-blue-600 rounded-full"></div>
                <h3 className="font-semibold text-gray-800">
                  Entrada do Veículo
                </h3>
                <p className="text-gray-500 text-sm">
                  {new Date(service.checkin_date).toLocaleString('pt-BR')}
                </p>
              </div>

              {service.status !== 'pending' && (
                <div className="relative">
                  <div className="absolute -left-10 w-8 h-8 bg-blue-400 rounded-full"></div>
                  <h3 className="font-semibold text-gray-800">
                    Reparo em Andamento
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Horas Estimadas: {service.estimated_hours}h
                  </p>
                </div>
              )}

              {service.status === 'completed' && (
                <div className="relative">
                  <div className="absolute -left-10 w-8 h-8 bg-green-600 rounded-full"></div>
                  <h3 className="font-semibold text-gray-800">
                    Reparo Concluído
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {service.finished_at
                      ? new Date(service.finished_at).toLocaleString('pt-BR')
                      : 'Concluído'}
                  </p>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-sm text-gray-500 mb-2">
                  Previsão de Conclusão
                </h4>
                <p className="font-semibold text-gray-800">
                  {new Date(service.estimated_finish_date).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-sm text-gray-500 mb-2">
                  Custo Estimado
                </h4>
                <p className="font-semibold text-gray-800">
                  R$ {service.estimated_cost}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-sm text-gray-500 mb-2">
                  Custo Final
                </h4>
                <p className="font-semibold text-gray-800">
                  {service.final_cost ? `R$ ${service.final_cost}` : '—'}
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Observações da Oficina
              </h3>
              <div className="bg-gray-50 p-6 rounded-xl text-gray-600">
                {service.workshop_notes}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}