export const ErrorFallback = ({ error, resetErrorBoundary }: { error: any; resetErrorBoundary: any }) => {
  return (
    <div role="alert">
      <p>Ontology UI errored:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
};
