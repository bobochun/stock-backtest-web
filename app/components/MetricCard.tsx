type MetricCardProps = {
  label: string;
  value: string | number;
  danger?: boolean;
};

export default function MetricCard({ label, value, danger }: MetricCardProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={
          danger
            ? "mt-2 text-2xl font-bold text-red-600"
            : "mt-2 text-2xl font-bold text-slate-900"
        }
      >
        {value}
      </p>
    </div>
  );
}