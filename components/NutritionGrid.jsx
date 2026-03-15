function MetricCard({ title, value, unit, colorClass, icon }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition duration-200 hover:scale-105 hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${colorClass}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-medium text-slate-500">
            {unit}
          </span>
        ) : null}
      </p>
    </div>
  );
}

export default function NutritionGrid({ result }) {
  const metrics = [
    {
      title: "Calories",
      value: result.calories,
      unit: "kcal",
      colorClass: "bg-rose-50 text-rose-600",
      icon: "C",
    },
    {
      title: "Protein",
      value: result.protein,
      unit: "g",
      colorClass: "bg-blue-50 text-blue-600",
      icon: "P",
    },
    {
      title: "Carbs",
      value: result.carbs,
      unit: "g",
      colorClass: "bg-amber-50 text-amber-600",
      icon: "Cb",
    },
    {
      title: "Fat",
      value: result.fat,
      unit: "g",
      colorClass: "bg-purple-50 text-purple-600",
      icon: "F",
    },
  ];

  return (
    <div>
      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Nutrition Breakdown
      </p>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {metrics.map((item) => (
          <MetricCard
            key={item.title}
            title={item.title}
            value={item.value}
            unit={item.unit}
            colorClass={item.colorClass}
            icon={item.icon}
          />
        ))}
      </div>
    </div>
  );
}
