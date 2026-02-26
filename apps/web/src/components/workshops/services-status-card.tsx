export function CheckInCard({ title, sampleCarInWorkshop, daysInWorkshop }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <p className="text-sm text-gray-600 font-semibold mb-1">
        {title}
      </p>
      <p className="text-xl font-bold text-gray-900">
        {new Date(sampleCarInWorkshop.checkInDate).toLocaleDateString()}
      </p>
      <p className="text-xs text-gray-500 mt-2">
        {daysInWorkshop} dias na oficina
      </p>
    </div>
  );
}

export function CheckoutEstimatedCard({ title, sampleCarInWorkshop, daysRemaining }) {
  return (
    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
      <p className="text-sm text-orange-700 font-semibold mb-1">
        {title}
      </p>
      <p className="text-xl font-bold text-orange-900">
        {new Date(sampleCarInWorkshop.estimatedCompletion).toLocaleDateString()}
      </p>
      <p className="text-xs text-orange-600 mt-2">
        {daysRemaining > 0 ? `${daysRemaining} dias restantes` : "Prazo próximo!"}
      </p>
    </div>
  );
}

export function ServiceProgressCard({ title, completedServices, workshopServices }) {
  return (
    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
      <p className="text-sm text-green-700 font-semibold mb-1">
        {title}
      </p>
      <p className="text-xl font-bold text-green-900">
        {completedServices}/{workshopServices.length}
      </p>
      <p className="text-xs text-green-600 mt-2">Serviços concluídos</p>
    </div>
  );
}

export function ServiceInProgressCard({ title, inProgressServices }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
      <p className="text-sm text-blue-700 font-semibold mb-1">
        {title}
      </p>
      <p className="text-xl font-bold text-blue-900">
        {inProgressServices}
      </p>
      <p className="text-xs text-blue-600 mt-2">Serviços em atendimento</p>
    </div>
  );
}