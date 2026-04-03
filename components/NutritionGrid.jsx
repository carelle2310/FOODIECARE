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
        {typeof value === "number" ? value.toFixed(1) : value}
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
  // Support both old backend format (result.calories) and new backend format (result.nutrition.calories)
  const nutrition = result.nutrition || result;

  const mainMetrics = [
    {
      title: "Calories",
      value: nutrition.calories || 0,
      unit: "kcal",
      colorClass: "bg-rose-50 text-rose-600",
      icon: "C",
    },
    {
      title: "Protein",
      value: nutrition.protein || 0,
      unit: "g",
      colorClass: "bg-blue-50 text-blue-600",
      icon: "P",
    },
    {
      title: "Carbs",
      value: nutrition.carbs || 0,
      unit: "g",
      colorClass: "bg-amber-50 text-amber-600",
      icon: "Cb",
    },
    {
      title: "Fat",
      value: nutrition.fat || 0,
      unit: "g",
      colorClass: "bg-purple-50 text-purple-600",
      icon: "F",
    },
  ];

  const secondaryMetrics = [];
  if (nutrition.fiber) {
    secondaryMetrics.push({
      title: "Fiber",
      value: nutrition.fiber,
      unit: "g",
      colorClass: "bg-green-50 text-green-600",
      icon: "✓",
    });
  }
  if (nutrition.sugar) {
    secondaryMetrics.push({
      title: "Sugar",
      value: nutrition.sugar,
      unit: "g",
      colorClass: "bg-pink-50 text-pink-600",
      icon: "S",
    });
  }
  if (nutrition.sodium) {
    secondaryMetrics.push({
      title: "Sodium",
      value: nutrition.sodium,
      unit: "mg",
      colorClass: "bg-indigo-50 text-indigo-600",
      icon: "Na",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Main Nutrition
        </p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {mainMetrics.map((item) => (
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

      {secondaryMetrics.length > 0 ? (
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Additional Info
          </p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {secondaryMetrics.map((item) => (
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
      ) : null}

      {nutrition.servingSize ? (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Serving Size
          </p>
          <p className="mt-1 text-sm font-medium text-blue-900">
            {nutrition.servingSize}
          </p>
        </div>
      ) : null}
    </div>
  );
}
