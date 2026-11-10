export default function Spinner({ label }: { label?: string }) {
  return (
    <div className="text-center">
      <span className="mx-auto block size-6 animate-spin rounded-full border-2 border-zinc-300 border-t-[#1781ae]" />
      {label && (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      )}
    </div>
  );
}
