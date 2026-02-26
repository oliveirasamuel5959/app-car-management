export function ServicesTimeline({ sampleCarInWorkshop, completedServices, inProgressServices }) {
  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        📅 Cronograma desde Entrada
      </h3>
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-300" />
        <div className="ml-8 space-y-4">
          <div className="relative">
            <div className="absolute -left-6 top-1 w-5 h-5 bg-blue-500 rounded-full border-4 border-white" />
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="font-semibold text-gray-900">
                Entrada do Veículo
              </p>
              <p className="text-sm text-gray-600">
                {new Date(sampleCarInWorkshop.checkInDate).toLocaleDateString("pt-BR", {
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
                {completedServices} Serviço(s) Concluído(s)
              </p>
              <p className="text-sm text-gray-600">
                {completedServices > 0 ? "Tarefas de manutenção inicial concluídas" : "Aguardando primeiro serviço"}
              </p>
            </div>
          </div>

          {inProgressServices > 0 && (
            <div className="relative">
              <div className="absolute -left-6 top-1 w-5 h-5 bg-yellow-500 rounded-full border-4 border-white animate-pulse" />
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <p className="font-semibold text-gray-900">
                  {inProgressServices} Serviço(s) em Progresso
                </p>
                <p className="text-sm text-gray-600">
                  Atualmente em atendimento
                </p>
              </div>
            </div>
          )}

          <div className="relative">
            <div className="absolute -left-6 top-1 w-5 h-5 bg-blue-400 rounded-full border-4 border-white" />
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="font-semibold text-gray-900">
                Data Prevista de Conclusão
              </p>
              <p className="text-sm text-gray-600">
                {new Date(sampleCarInWorkshop.estimatedCompletion).toLocaleDateString("pt-BR", {
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
  );
}