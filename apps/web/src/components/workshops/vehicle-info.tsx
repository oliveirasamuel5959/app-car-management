export function VehicleInfo({ sampleCarInWorkshop }) {
  return (
    <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
      <h3 className="font-bold text-gray-900 mb-2">ℹ️ Informações do Veículo</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-600 text-xs uppercase font-semibold">Marca</p>
          <p className="font-bold text-gray-900">
            {sampleCarInWorkshop.brand}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-xs uppercase font-semibold">Modelo</p>
          <p className="font-bold text-gray-900">
            {sampleCarInWorkshop.model}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-xs uppercase font-semibold">Ano</p>
          <p className="font-bold text-gray-900">
            {sampleCarInWorkshop.year}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-xs uppercase font-semibold">
            Placa
          </p>
          <p className="font-bold text-gray-900 font-mono">
            {sampleCarInWorkshop.licensePlate}
          </p>
        </div>
      </div>
    </div>
  );
}