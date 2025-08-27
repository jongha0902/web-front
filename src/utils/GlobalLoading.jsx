import { BarLoader } from 'react-spinners';
import { useLoading } from './useLoading';

const GlobalLoading = () => {
  const loading = useLoading();

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black bg-opacity-40 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 bg-black/70 border border-white/20 backdrop-blur-sm px-8 py-6 rounded-xl shadow-xl">
        <div className="flex items-center gap-2">
          <span className="text-white text-lg font-semibold">⌛ Loading...</span>
        </div>
        <BarLoader color="#ffffff" width={200} height={5} />
      </div>
    </div>
  );
};

export default GlobalLoading;
