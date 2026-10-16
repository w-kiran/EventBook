type Props = {
  type: 'loading' | 'error' | 'empty';
  message?: string;
  onRetry?: () => void;
};

export function StatusMessage({ type, message, onRetry }: Props) {
  if (type === 'loading') {
    return (
      <p role="status" className="py-8 text-center text-gray-500">
        {message ?? 'Loading...'}
      </p>
    );
  }

  if (type === 'error') {
    return (
      <div role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
        <p>{message ?? 'Something went wrong.'}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 rounded border border-red-300 px-3 py-1 text-sm">
            Try again
          </button>
        )}
      </div>
    );
  }

  return <p className="py-8 text-center text-gray-500">{message ?? 'Nothing to show.'}</p>;
}