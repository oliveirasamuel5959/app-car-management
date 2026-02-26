import { useState } from "react";

interface MaintenanceTip {
  id: number;
  title: string;
  description: string;
  category: "oil" | "tires" | "brakes" | "battery" | "general";
  priority: "low" | "medium" | "high";
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

const maintenanceTips: MaintenanceTip[] = [
  {
    id: 1,
    title: "Troca de Óleo Necessária",
    description:
      "Seu veículo precisa de uma troca de óleo. Óleo sintético é recomendado para melhor desempenho do motor.",
    category: "oil",
    priority: "high",
  },
  {
    id: 2,
    title: "Rodízio de Pneus Agendado",
    description:
      "É hora de fazer o rodízio dos seus pneus para garantir desgaste uniforme e prolongar sua vida útil.",
    category: "tires",
    priority: "medium",
  },
  {
    id: 3,
    title: "Inspeção de Freios",
    description:
      "Agende uma inspeção de freios para garantir que seu veículo pare com segurança. Verifique os níveis de fluido de freio.",
    category: "brakes",
    priority: "high",
  },
  {
    id: 4,
    title: "Verificação de Saúde da Bateria",
    description:
      "Sua bateria tem 3 anos. Considere uma verificação de saúde para evitar falhas inesperadas.",
    category: "battery",
    priority: "medium",
  },
];


export function MaintenanceTips() {
  const [selectedTip, setSelectedTip] = useState<MaintenanceTip | null>(null);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">
          💡 Dicas de Manutenção e Alertas
        </h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {maintenanceTips.map((tip) => (
            <div
              key={tip.id}
              onClick={() => setSelectedTip(selectedTip?.id === tip.id ? null : tip)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${selectedTip?.id === tip.id
                ? "border-blue-500 bg-blue-50 shadow-md"
                : getPriorityColor(tip.priority)
                }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getCategoryIcon(tip.category)}</span>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">{tip.title}</h3>
                  <p
                    className={`text-xs leading-relaxed ${selectedTip?.id === tip.id
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
                      className={`text-xs font-bold px-2 py-1 rounded ${tip.priority === "high"
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
                {selectedTip.priority.toUpperCase()} PRIORIDADE
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-gray-200 text-gray-800">
                {selectedTip.category.toUpperCase()}
              </span>
            </div>
          </div>
        )}
        <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-semibold uppercase mb-1">
                Alta Prioridade
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
  )
}